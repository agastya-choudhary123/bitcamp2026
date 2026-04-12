import AVFoundation
import SwiftUI
import Combine

class CameraManager: NSObject, ObservableObject {
    @Published var isSessionRunning = false
    @Published var isMultiCamSupported = false
    @Published var isRecording = false

    let session = AVCaptureMultiCamSession()
    private let sessionQueue = DispatchQueue(label: "com.safeguard.sessionQueue")

    // Preview Layers for SwiftUI wrappers
    @Published var backPreviewLayer: AVCaptureVideoPreviewLayer?
    @Published var frontPreviewLayer: AVCaptureVideoPreviewLayer?

    // Bridge to CV Processor
    var cvProcessor: BackgroundCVProcessor?
    private var backFrameCount = 0
    private var frontFrameCount = 0
    private let sampleRate = 3 // Process every 3rd frame per camera (~10 FPS)

    // MARK: - Clip Recording (AVAssetWriter)
    private var assetWriter: AVAssetWriter?
    private var assetWriterInput: AVAssetWriterInput?
    private var recordingOutputURL: URL?
    private var recordingStartTime: CMTime?
    private var recordingCompletion: ((URL?) -> Void)?

    func startRecording(to url: URL) {
        sessionQueue.async {
            guard !self.isRecording else { return }
            do {
                // Remove any existing file at target URL
                try? FileManager.default.removeItem(at: url)
                let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
                let settings: [String: Any] = [
                    AVVideoCodecKey: AVVideoCodecType.h264,
                    AVVideoWidthKey: 640,
                    AVVideoHeightKey: 480,
                    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 500_000]
                ]
                let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
                input.expectsMediaDataInRealTime = true
                // Frames arrive landscape (640×480) from the front sensor.
                // Rotate 90° clockwise so the clip plays upright in portrait.
                // Matrix for 90° CW with translation so origin stays in frame:
                //   [a=0, b=-1, c=1, d=0, tx=0, ty=sourceWidth(640)]
                input.transform = CGAffineTransform(a: 0, b: -1, c: 1, d: 0, tx: 0, ty: 640)
                if writer.canAdd(input) { writer.add(input) }
                writer.startWriting()
                self.assetWriter = writer
                self.assetWriterInput = input
                self.recordingOutputURL = url
                self.recordingStartTime = nil
                DispatchQueue.main.async { self.isRecording = true }
                print("[Clip] Recording started → \(url.lastPathComponent)")
            } catch {
                print("[Clip] Failed to start recording: \(error)")
            }
        }
    }

    func stopRecording(completion: @escaping (URL?) -> Void) {
        sessionQueue.async {
            guard self.isRecording, let writer = self.assetWriter else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            self.assetWriterInput?.markAsFinished()
            let outputURL = self.recordingOutputURL
            writer.finishWriting {
                DispatchQueue.main.async {
                    self.isRecording = false
                    self.assetWriter = nil
                    self.assetWriterInput = nil
                    self.recordingOutputURL = nil
                    self.recordingStartTime = nil
                    completion(writer.status == .completed ? outputURL : nil)
                    print("[Clip] Recording finished, status: \(writer.status.rawValue)")
                }
            }
        }
    }
    
    override init() {
        super.init()
        self.isMultiCamSupported = AVCaptureMultiCamSession.isMultiCamSupported
    }
    
    func checkPermissionsAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            startSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted { self.startSession() }
            }
        default:
            break
        }
    }
    
    private func startSession() {
        sessionQueue.async {
            guard !self.session.isRunning else { return }
            self.configureSession()
            self.session.startRunning()
            DispatchQueue.main.async {
                self.isSessionRunning = true
            }
        }
    }
    
    func stopSession() {
        sessionQueue.async {
            if self.session.isRunning {
                self.session.stopRunning()
                DispatchQueue.main.async {
                    self.isSessionRunning = false
                }
            }
        }
    }

    private func configureSession() {
        session.beginConfiguration()
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }
        defer { session.commitConfiguration() }
        
        // 1. Back Camera
        guard let backCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backCamera) else { return }
        if session.canAddInput(backInput) { session.addInputWithNoConnections(backInput) }
        
        // 2. Front Camera
        guard let frontCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let frontInput = try? AVCaptureDeviceInput(device: frontCamera) else { return }
        if session.canAddInput(frontInput) { session.addInputWithNoConnections(frontInput) }
        
        let backPort = backInput.ports(for: .video, sourceDeviceType: backCamera.deviceType, sourceDevicePosition: .back).first
        let frontPort = frontInput.ports(for: .video, sourceDeviceType: frontCamera.deviceType, sourceDevicePosition: .front).first
        
        let backOutput = AVCaptureVideoDataOutput()
        let frontOutput = AVCaptureVideoDataOutput()
        backOutput.setSampleBufferDelegate(self, queue: sessionQueue)
        frontOutput.setSampleBufferDelegate(self, queue: sessionQueue)
        
        if session.canAddOutput(backOutput) { session.addOutputWithNoConnections(backOutput) }
        if session.canAddOutput(frontOutput) { session.addOutputWithNoConnections(frontOutput) }
        
        if let backPort = backPort {
            let conn = AVCaptureConnection(inputPort: backPort, videoPreviewLayer: AVCaptureVideoPreviewLayer(sessionWithNoConnection: session))
            if session.canAddConnection(conn) {
                session.addConnection(conn)
                DispatchQueue.main.async {
                    self.backPreviewLayer = conn.videoPreviewLayer
                    self.backPreviewLayer?.videoGravity = .resizeAspectFill
                }
            }
            let outConn = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
            if session.canAddConnection(outConn) { session.addConnection(outConn) }
        }
        
        if let frontPort = frontPort {
            let conn = AVCaptureConnection(inputPort: frontPort, videoPreviewLayer: AVCaptureVideoPreviewLayer(sessionWithNoConnection: session))
            if session.canAddConnection(conn) {
                session.addConnection(conn)
                DispatchQueue.main.async {
                    self.frontPreviewLayer = conn.videoPreviewLayer
                    self.frontPreviewLayer?.videoGravity = .resizeAspectFill
                }
            }
            let outConn = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
            if session.canAddConnection(outConn) { session.addConnection(outConn) }
        }
    }
}

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let position: AVCaptureDevice.Position = (connection.inputPorts.first?.sourceDevicePosition == .front) ? .front : .back

        if position == .front, isRecording, let writer = assetWriter, let input = assetWriterInput, writer.status == .writing {
            let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            if recordingStartTime == nil {
                recordingStartTime = pts
                writer.startSession(atSourceTime: pts)
            }
            if input.isReadyForMoreMediaData { input.append(sampleBuffer) }
        }

        if position == .front { frontFrameCount += 1; guard frontFrameCount % sampleRate == 0 else { return } }
        else { backFrameCount += 1; guard backFrameCount % sampleRate == 0 else { return } }
        
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        
        let orientation: UIImage.Orientation = (position == .front) ? .leftMirrored : .right
        let uiImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: orientation)
        let data = uiImage.jpegData(compressionQuality: 0.7)
        let base64 = data?.base64EncodedString()
        
        if let b64 = base64 {
            if position == .front { cvProcessor?.processFrame(frontBase64: b64, backBase64: nil) }
            else { cvProcessor?.processFrame(frontBase64: nil, backBase64: b64) }
        }
    }
}

struct CameraViewWrapper: UIViewRepresentable {
    let previewLayer: AVCaptureVideoPreviewLayer?
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .black
        if let layer = previewLayer {
            layer.frame = view.layer.bounds
            view.layer.addSublayer(layer)
        }
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        guard let layer = previewLayer else { return }
        
        if layer.superlayer == nil {
            layer.frame = uiView.layer.bounds
            uiView.layer.addSublayer(layer)
        } else {
            layer.frame = uiView.layer.bounds
        }
    }
}

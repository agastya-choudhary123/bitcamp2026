import AVFoundation
import SwiftUI
import Combine

class CameraManager: NSObject, ObservableObject {
    @Published var isSessionRunning = false
    @Published var isMultiCamSupported = false
    
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
        
        // Remove existing inputs/outputs to allow fresh start
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }
        
        defer { 
            session.commitConfiguration()
        }
        
        // 1. Back Camera (Road)
        guard let backCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let backInput = try? AVCaptureDeviceInput(device: backCamera) else {
            return 
        }
        if session.canAddInput(backInput) { 
            session.addInputWithNoConnections(backInput) 
        }
        
        // 2. Front Camera (Face)
        guard let frontCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let frontInput = try? AVCaptureDeviceInput(device: frontCamera) else {
            return 
        }
        if session.canAddInput(frontInput) { 
            session.addInputWithNoConnections(frontInput) 
        }
        
        // 3. Ports
        let backPort = backInput.ports(for: .video, sourceDeviceType: backCamera.deviceType, sourceDevicePosition: .back).first
        let frontPort = frontInput.ports(for: .video, sourceDeviceType: frontCamera.deviceType, sourceDevicePosition: .front).first
        
        // 4. Video Data Outputs
        let backOutput = AVCaptureVideoDataOutput()
        let frontOutput = AVCaptureVideoDataOutput()
        backOutput.setSampleBufferDelegate(self, queue: sessionQueue)
        frontOutput.setSampleBufferDelegate(self, queue: sessionQueue)
        
        if session.canAddOutput(backOutput) { 
            session.addOutputWithNoConnections(backOutput)
        }
        if session.canAddOutput(frontOutput) { 
            session.addOutputWithNoConnections(frontOutput)
        }
        
        // 5. Connect Previews and Outputs
        if let backPort = backPort {
            let backConnection = AVCaptureConnection(inputPort: backPort, videoPreviewLayer: AVCaptureVideoPreviewLayer(sessionWithNoConnection: session))
            if session.canAddConnection(backConnection) {
                session.addConnection(backConnection)
                DispatchQueue.main.async {
                    self.backPreviewLayer = backConnection.videoPreviewLayer
                    self.backPreviewLayer?.videoGravity = .resizeAspectFill
                }
            }
            
            let backOutputConnection = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
            if session.canAddConnection(backOutputConnection) { 
                session.addConnection(backOutputConnection)
            }
        }
        
        if let frontPort = frontPort {
            let frontConnection = AVCaptureConnection(inputPort: frontPort, videoPreviewLayer: AVCaptureVideoPreviewLayer(sessionWithNoConnection: session))
            if session.canAddConnection(frontConnection) {
                session.addConnection(frontConnection)
                DispatchQueue.main.async {
                    self.frontPreviewLayer = frontConnection.videoPreviewLayer
                    self.frontPreviewLayer?.videoGravity = .resizeAspectFill
                }
            }
            
            let frontOutputConnection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
            if session.canAddConnection(frontOutputConnection) { 
                session.addConnection(frontOutputConnection)
            }
        }
    }
}

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        // Determine camera position
        let position: AVCaptureDevice.Position = (connection.inputPorts.first?.sourceDevicePosition == .front) ? .front : .back
        
        // Only process every Nth frame per camera
        if position == .front {
            frontFrameCount += 1
            guard frontFrameCount % sampleRate == 0 else { return }
        } else {
            backFrameCount += 1
            guard backFrameCount % sampleRate == 0 else { return }
        }
        
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
        
        // Front camera needs orientation correction: it's captured in landscape
        // and mirrored. Apply the correct orientation so MediaPipe sees an upright face.
        let orientation: UIImage.Orientation = (position == .front) ? .leftMirrored : .right
        let uiImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: orientation)
        
        // Higher quality = more accurate landmarks = better EAR values
        let data = uiImage.jpegData(compressionQuality: 0.7)
        
        let frontData = (position == .front) ? data : nil
        let backData = (position == .back) ? data : nil
        
        let frontBase64 = frontData?.base64EncodedString()
        let backBase64 = backData?.base64EncodedString()
        
        if frontBase64 != nil || backBase64 != nil {
            cvProcessor?.processFrame(frontBase64: frontBase64, backBase64: backBase64)
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

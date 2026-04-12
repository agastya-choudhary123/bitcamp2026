import WebKit
import Combine

extension Notification.Name {
    static let proximityAlertTriggered = Notification.Name("proximityAlertTriggered")
}

class BackgroundCVProcessor: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate {
    @Published var lastEAR: Double = 0.3
    @Published var lastPitch: Double = 0
    @Published var lastYaw: Double = 0
    @Published var lastRoll: Double = 0
    @Published var hazardScore: Int = 0
    
    // Advanced Metrics for Debug/Neural
    @Published var currentMetrics: [String: Double] = [:]
    
    // On-device classification states
    @Published var driverStates: [String] = ["alert"]
    @Published var driverSeverity: Int = 0
    @Published var isCalibrating: Bool = false
    @Published var isReady: Bool = false
    
    var webView: WKWebView!
    private var schemeHandler: LocalFileSchemeHandler? 
    private var isReadyForNextFrame: Bool = true
    
    override init() {
        super.init()
        let webDir = Self.stageWebAssets()
        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(self, name: "safeguardBridge")
        config.userContentController = contentController
        
        if let webDir = webDir {
            let handler = LocalFileSchemeHandler(baseDirectory: webDir)
            self.schemeHandler = handler
            config.setURLSchemeHandler(handler, forURLScheme: "safeguard-local")
        }
        
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        
        if webDir != nil {
            let schemeURL = URL(string: "safeguard-local://host/CVProcessor.html")!
            webView.load(URLRequest(url: schemeURL))
        }
    }
    
    private static func stageWebAssets() -> URL? {
        let fm = FileManager.default
        let destDir = fm.temporaryDirectory.appendingPathComponent("SafeguardWeb")
        try? fm.removeItem(at: destDir)
        let aiFiles = [("vision_bundle", "js"), ("vision_wasm_internal", "js"), ("vision_wasm_internal", "wasm"), ("face_landmarker", "task")]
        do {
            try fm.createDirectory(at: destDir, withIntermediateDirectories: true)
            let aiAssetsDir = destDir.appendingPathComponent("AI_Assets")
            try fm.createDirectory(at: aiAssetsDir, withIntermediateDirectories: true)
            if let htmlPath = Bundle.main.path(forResource: "CVProcessor", ofType: "html") {
                try fm.copyItem(atPath: htmlPath, toPath: destDir.appendingPathComponent("CVProcessor.html").path)
            }
            let bundlePath = Bundle.main.bundlePath
            let folderRefPath = (bundlePath as NSString).appendingPathComponent("AI_Assets")
            if fm.fileExists(atPath: folderRefPath) {
                try? fm.removeItem(at: aiAssetsDir)
                try fm.copyItem(atPath: folderRefPath, toPath: aiAssetsDir.path)
            } else {
                for (name, ext) in aiFiles {
                    if let path = Bundle.main.path(forResource: name, ofType: ext, inDirectory: "AI_Assets") ?? Bundle.main.path(forResource: name, ofType: ext) {
                        try fm.copyItem(atPath: path, toPath: aiAssetsDir.appendingPathComponent("\(name).\(ext)").path)
                    }
                }
            }
            return destDir
        } catch { return nil }
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { print("✅ AI BRIDGE READY") }
    
    func startCalibration() {
        // Trigger calibration in the JS engine
        self.isCalibrating = true
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript("window.startCalibration()", completionHandler: nil)
        }
    }
    
    func resetMetrics() {
        DispatchQueue.main.async {
            self.lastEAR = 0.3
            self.lastPitch = 0
            self.lastYaw = 0
            self.lastRoll = 0
            self.hazardScore = 0
            self.currentMetrics = [:]
            self.driverStates = ["alert"]
            self.driverSeverity = 0
            self.webView.evaluateJavaScript("window.resetAI()", completionHandler: nil)
        }
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let data = message.body as? [String: Any] else { return }
        
        DispatchQueue.main.async {
            if let type = data["type"] as? String {
                if type == "ready" { self.isReady = true; return }
                if type == "log", let msg = data["message"] as? String { print("🧠 AI: \(msg)"); return }
                
                if type == "calibration_finished" {
                    self.isCalibrating = false
                    return
                }
                
                if type == "frame_processed" {
                    self.isReadyForNextFrame = true
                    return
                }
                
                if type == "proximity_alert" {
                    if let score = data["hazard"] as? Int { self.hazardScore = score }
                    NotificationCenter.default.post(name: .proximityAlertTriggered, object: nil)
                    return
                }

                if type == "hazard_score" {
                    if let score = data["hazard"] as? Int { self.hazardScore = score }
                    return
                }

                if type == "ai_update" {
                    // 1:1 Mirror of Web Logic Output
                    if let m = data["metrics"] as? [String: Double] {
                        self.currentMetrics = m
                        self.lastEAR = m["fEAR"] ?? 0.3
                        self.lastPitch = m["fPitch"] ?? 0
                        self.lastYaw = m["fYaw"] ?? 0
                        self.lastRoll = m["fRoll"] ?? 0
                    }
                    if let sts = data["states"] as? [String] { self.driverStates = sts }
                    if let sev = data["severity"] as? Int { self.driverSeverity = sev }
                }
            }
            
            if let hazard = data["hazard"] as? Int { self.hazardScore = hazard }
        }
    }
    
    func processFrame(frontBase64: String?, backBase64: String?) {
        guard isReady && isReadyForNextFrame else { return }
        isReadyForNextFrame = false
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript("window.processFrames('\(frontBase64 ?? "")', '\(backBase64 ?? "")')", completionHandler: nil)
        }
    }
}

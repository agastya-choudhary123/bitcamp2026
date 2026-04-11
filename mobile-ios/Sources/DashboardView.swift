import SwiftUI
import AVFoundation
import Combine

class DrowsinessMonitor: ObservableObject {
    @Published var earScore: Double = 0.35
    @Published var history: [Double] = Array(repeating: 0.35, count: 40)
    @Published var isDrowsy: Bool = false
    @Published var isDataActive: Bool = false
    @Published var errorMessage: String = ""
    
    private var timer: Timer?
    
    func startPolling(username: String) {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            // Add a cache-buster query parameter to force a fresh fetch every time
            let timestamp = Int(Date().timeIntervalSince1970)
            NetworkManager.shared.request(endpoint: "/status/\(username)?t=\(timestamp)") { (result: Result<NetworkManager.StatusResponse, Error>) in
                switch result {
                case .success(let status):
                    if let ear = status.ear {
                        self.earScore = ear
                        self.history.removeFirst()
                        self.history.append(ear)
                        self.isDataActive = true
                        self.errorMessage = ""
                    } else {
                        self.errorMessage = "No recent data for \(username)"
                        self.isDataActive = false
                    }
                    if let triggered = status.emergencyTriggered {
                        self.isDrowsy = triggered
                    }
                case .failure(let err):
                    print("Polling error: \(err)")
                    self.errorMessage = err.localizedDescription
                    self.isDataActive = false
                }
            }
        }
    }
    
    func stopPolling() {
        timer?.invalidate()
        isDataActive = false
    }
    
    deinit {
        timer?.invalidate()
    }
}

struct CameraPreview: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        
        // In a real app, this would setup AVCaptureSession
        // For a high-fidelity preview, we use a placeholder background
        let label = UILabel()
        label.text = "LIVE FRONT CAMERA FEED"
        label.textColor = .white.withAlphaComponent(0.3)
        label.font = .systemFont(ofSize: 12, weight: .bold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {}
}

struct DashboardView: View {
    @StateObject var monitor = DrowsinessMonitor()
    @Environment(\.presentationMode) var presentationMode
    @Environment(\.scenePhase) var scenePhase // Background Lifecycle App Observer
    
    @State private var showGuide = false
    @State private var isDriving = false

    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            VStack {
                header
                    .padding()
                
                if !isDriving {
                    Spacer()
                    // INACTIVE STATE
                    Button(action: {
                        startDrive()
                    }) {
                        VStack(spacing: 12) {
                            Image(systemName: "steeringwheel")
                                .font(.system(size: 60))
                            Text("START DRIVE")
                                .font(.largeTitle).bold()
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                        .background(Color.sdPrimary)
                        .cornerRadius(24)
                        .shadow(color: Color.sdPrimary.opacity(0.4), radius: 20, y: 10)
                        .padding(.horizontal, 30)
                    }
                    Spacer()
                } else {
                    // ACTIVE DRIVE STATE
                    ScrollView {
                        VStack(spacing: 20) {
                            cameraFeed
                            earMetric
                            waveformCard
                            
                            Button(action: {
                                stopDrive()
                            }) {
                                HStack {
                                    Image(systemName: "stop.circle.fill")
                                    Text("STOP CURRENT DRIVE")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.sdRed)
                                .cornerRadius(16)
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .alert(isPresented: $monitor.isDrowsy) {
            Alert(
                title: Text("Drowsiness Detected!"),
                message: Text("Please pull over safely if you feel fatigued."),
                dismissButton: .default(Text("I'm Awake"))
            )
        }
        // App Lifecycle Hook
        .onChange(of: scenePhase) { oldPhase, newPhase in
            if newPhase == .inactive || newPhase == .background {
                if isDriving {
                    print("App entered background! Auto-stopping drive.")
                    stopDrive()
                }
            }
        }
    }
    
    func startDrive() {
        // Here we will eventually start the CV Engine
        isDriving = true
        let username = UserDefaults.standard.string(forKey: "activeUsername") ?? ""
        if !username.isEmpty {
            monitor.startPolling(username: username)
        }
    }
    
    func stopDrive() {
        // Here we will query backend to generate report, stop camera feed, etc.
        isDriving = false
        monitor.stopPolling()
        print("Drive Stopped. Generating Report...")
        
        let username = UserDefaults.standard.string(forKey: "activeUsername") ?? ""
        if !username.isEmpty {
            let payload = ["driverName": username]
            // We ignore the response since it silently generates in the background
            NetworkManager.shared.request(endpoint: "/report/generate", method: "POST", body: payload) { (result: Result<NetworkManager.ReportModel, Error>) in
                // Do nothing, UI handled in ReportsView
            }
        }
    }
    
    var header: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(isDriving ? "Active Drive Mode" : "Ready to Drive")
                    .font(.title).bold()
                    .foregroundColor(.sdForeground)
                Text("COMPUTER VISION DASHBOARD")
                    .font(.caption2).bold()
                    .kerning(1.5)
                    .foregroundColor(.sdMuted)
            }
            Spacer()
        }
    }
    
    var cameraFeed: some View {
        GlassCard {
            VStack(alignment: .leading) {
                HStack {
                    Image(systemName: "camera")
                    Text("LIVE VISUAL MONITORING")
                    Spacer()
                    if !monitor.isDataActive {
                        Text(monitor.errorMessage.isEmpty ? "No Live Data" : monitor.errorMessage)
                            .font(.caption).bold()
                            .foregroundColor(.sdRed)
                    }
                }
                .font(.caption2).bold()
                .foregroundColor(.sdMuted)
                
                CameraPreview()
                    .frame(height: 240)
                    .cornerRadius(16)
                    .padding(.top, 8)
            }
        }
    }
    
    var earMetric: some View {
        GlassCard {
            HStack(alignment: .center) {
                VStack(alignment: .leading) {
                    Text(String(format: "%.3f", monitor.earScore))
                        .font(.system(size: 48, weight: .bold, design: .monospaced))
                        .foregroundColor(monitor.earScore < 0.25 ? Color.sdRed : Color.sdGreen)
                    
                    HStack {
                        Circle().size(width: 8, height: 8)
                            .fill(monitor.earScore < 0.25 ? Color.sdRed : Color.sdGreen)
                        Text(monitor.earScore < 0.25 ? "DANGER" : "ALERT")
                            .font(.caption).bold()
                            .foregroundColor(monitor.earScore < 0.25 ? Color.sdRed : Color.sdGreen)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background((monitor.earScore < 0.25 ? Color.sdRed : Color.sdGreen).opacity(0.15))
                    .cornerRadius(8)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 12) {
                    metricRow(label: "PERCLOS", value: "0.05", color: .sdPrimary)
                    metricRow(label: "Head Pose", value: "Stable", color: .sdGreen)
                }
                .frame(width: 120)
            }
        }
    }
    
    func metricRow(label: String, value: String, color: Color) -> some View {
        VStack(alignment: .trailing) {
            Text(label).font(.caption2).foregroundColor(.sdMuted)
            Text(value).font(.system(size: 14, weight: .bold, design: .monospaced)).foregroundColor(color)
            Divider().background(Color.sdCardBorder)
        }
    }
    
    var waveformCard: some View {
        GlassCard {
            VStack(alignment: .leading) {
                HStack {
                    Image(systemName: "pulse")
                    Text("EAR WAVEFORM HISTORY")
                }
                .font(.caption2).bold()
                .foregroundColor(.sdMuted)
                
                WaveformView(dataPoints: monitor.history)
                    .frame(height: 100)
                    .padding(.top, 10)
            }
        }
    }
}

import SwiftUI
import AVFoundation
import Combine

// MARK: - Monitor (Logic preserved for state transition only)

class DrowsinessMonitor: ObservableObject {
    @Published var earScore: Double = 0.35
    @Published var history: [Double] = Array(repeating: 0.35, count: 50)
    @Published var isDataActive: Bool = false
    @Published var errorMessage: String = ""
    @Published var behaviorStates: [String] = ["alert"]
    @Published var behaviorSeverity: Int = 0
    @Published var lastMetrics: NetworkManager.StatusResponse.RawMetrics? = nil

    private var timer: Timer?

    func startPolling(username: String) {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            let ts = Int(Date().timeIntervalSince1970)
            NetworkManager.shared.request(endpoint: "/status/\(username)?t=\(ts)") { (result: Result<NetworkManager.StatusResponse, Error>) in
                switch result {
                case .success(let status):
                    if let ear = status.ear ?? status.metrics?.ear {
                        self.earScore = ear
                        self.history.removeFirst()
                        self.history.append(ear)
                        self.isDataActive = true
                        self.errorMessage = ""
                    } else {
                        self.errorMessage = "No recent data"
                        self.isDataActive = false
                    }
                    if let states = status.behaviorStates, !states.isEmpty {
                        self.behaviorStates = states
                    } else {
                        self.behaviorStates = ["alert"]
                    }
                    self.behaviorSeverity = status.behaviorSeverity ?? 0
                    self.lastMetrics = status.metrics
                case .failure(let err):
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

    deinit { timer?.invalidate() }
}

// MARK: - Camera Preview

struct CameraPreview: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black
        let label = UILabel()
        label.text = "LIVE FRONT CAMERA FEED"
        label.textColor = .white.withAlphaComponent(0.2)
        label.font = .systemFont(ofSize: 11, weight: .medium)
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

// MARK: - Dashboard View

struct DashboardView: View {
    @AppStorage("isLoggedIn") private var isLoggedIn = false
    @ObservedObject var backgroundProcessor: BackgroundCVProcessor
    @StateObject var cameraManager = CameraManager()
    @StateObject var monitor = DrowsinessMonitor()
    @StateObject var locationManager = LocationManager()
    @Environment(\.scenePhase) var scenePhase

    @State private var isDriving: Bool = false
    @State private var showProfileMenu: Bool = false
    @AppStorage("debugModeEnabled") private var debugModeEnabled: Bool = false

    @AppStorage("activeUsername") private var activeUsername: String = ""
    @AppStorage("driverName")    private var driverName: String = ""

    // Clipping pipeline
    @State private var isClipping = false
    @State private var clipStopTimer: Timer? = nil
    @State private var stateSyncTimer: Timer? = nil
    private let maxClipDuration: TimeInterval = 20

    var profileInitial: String {
        driverName.isEmpty ? (activeUsername.first.map(String.init) ?? "?") : String(driverName.prefix(1)).uppercased()
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.sdBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 12)
                    .background(Color.white)
                    .shadow(color: .black.opacity(0.03), radius: 5, y: 5)

                if !isDriving {
                    inactiveBody
                } else {
                    activeBody
                }
            }

            if showProfileMenu {
                profileDropdown
                    .padding(.top, 64)
                    .padding(.trailing, 16)
                    .transition(.asymmetric(
                        insertion: .scale(scale: 0.9, anchor: .topTrailing).combined(with: .opacity),
                        removal:  .scale(scale: 0.9, anchor: .topTrailing).combined(with: .opacity)
                    ))
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: showProfileMenu)
                    .zIndex(10)
            }
            
            // Invisible AI Bridge
            BackgroundBridgeView(webView: backgroundProcessor.webView)
                .frame(width: 1, height: 1)
                .opacity(0.01)
                .allowsHitTesting(false)
        }
        .navigationBarHidden(true)
        .onChange(of: scenePhase) { _, newPhase in
            if (newPhase == .inactive || newPhase == .background) && isDriving { stopDrive() }
        }
        .onTapGesture {
            if showProfileMenu { withAnimation { showProfileMenu = false } }
        }
        .onAppear {
            cameraManager.cvProcessor = backgroundProcessor
        }
        .onChange(of: backgroundProcessor.driverSeverity) { _, newSeverity in
            guard isDriving else { return }
            if newSeverity > 0 && !isClipping {
                startClip()
            } else if newSeverity == 0 && isClipping {
                stopClipAndUpload()
            }
        }
    }

    // MARK: - Top Bar
    var topBar: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(isDriving ? "Active Monitoring" : "Ready to Drive")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.sdForeground)
                HStack(spacing: 4) {
                    Image(systemName: "shield.fill")
                        .font(.system(size: 10))
                    Text("SAFEGUARD INTELLIGENCE")
                        .font(.system(size: 10, weight: .bold))
                        .kerning(1.2)
                }
                .foregroundColor(.sdPrimary)
            }
            Spacer()

            Button(action: { withAnimation(.spring()) { showProfileMenu.toggle() } }) {
                ZStack {
                    Circle()
                        .fill(Color.sdPrimary)
                        .frame(width: 38, height: 38)
                    Text(profileInitial)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }
                .overlay(Circle().stroke(Color.white, lineWidth: 2))
                .shadow(color: .black.opacity(0.1), radius: 4)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Profile Dropdown
    var profileDropdown: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Circle().fill(Color.sdPrimary).frame(width: 32, height: 32)
                    .overlay(Text(profileInitial).foregroundColor(.white).font(.caption.bold()))
                VStack(alignment: .leading, spacing: 1) {
                    Text(driverName.isEmpty ? "Driver" : driverName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.sdForeground)
                    Text("Safeguard Pro")
                        .font(.system(size: 10))
                        .foregroundColor(.sdPrimary)
                }
                Spacer()
            }
            .padding(16)

            Divider().background(Color.sdCardBorder)

            Toggle(isOn: $debugModeEnabled) {
                Label("Telemetry Debug", systemImage: "chart.bar.xaxis")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.sdForeground)
            }
            .toggleStyle(SwitchToggleStyle(tint: .sdPrimary))
            .padding(16)

            Divider().background(Color.sdCardBorder)

            Button(action: logout) {
                HStack {
                    Image(systemName: "power")
                    Text("Sign Out")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundColor(.sdRed)
                .padding(16)
            }
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.12), radius: 20, x: 0, y: 10)
        .frame(width: 220)
    }

    // MARK: - Inactive Body
    var inactiveBody: some View {
        VStack {
            Spacer()
            VStack(spacing: 32) {
                ZStack {
                    Circle()
                        .fill(Color.sdPrimary.opacity(0.05))
                        .frame(width: 180, height: 180)
                    Image(systemName: "shield.fill")
                        .font(.system(size: 72))
                        .foregroundColor(.sdPrimary)
                }

                VStack(spacing: 10) {
                    Text("Begin Safeguard")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundColor(.sdForeground)
                    Text("Real-time behavioral analytics will\nstart once you begin driving.")
                        .font(.system(size: 14))
                        .foregroundColor(.sdMuted)
                        .multilineTextAlignment(.center)
                        .lineSpacing(2)
                }

                Button(action: startDrive) {
                    Text("START DRIVE")
                        .font(.system(size: 16, weight: .bold))
                        .tracking(1.5)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(Color.sdPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .shadow(color: .sdPrimary.opacity(0.3), radius: 10, y: 5)
                }
                .padding(.horizontal, 40)
            }
            Spacer()
        }
    }

    // MARK: - Active Body
    var activeBody: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 20) {
                cameraCard
                behaviorCard
                stopButton
            }
            .padding(20)
        }
    }

    // MARK: - Camera Card
    var cameraCard: some View {
        VStack(spacing: 0) {
            // MAIN CAMERA FEED
            ZStack(alignment: .topLeading) {
                CameraViewWrapper(previewLayer: cameraManager.activePreviewLayer)
                    .frame(height: 380)
                    .background(Color.black)
                    .clipShape(RoundedRectangle(cornerRadius: 18))

                HStack(spacing: 8) {
                    Circle()
                        .fill(backgroundProcessor.isReady ? Color.sdGreen : Color.sdRed)
                        .frame(width: 8, height: 8)
                    Text(backgroundProcessor.isReady ? "LIVE BACK CAMERA AI" : "INITIALIZING AI...")
                }
                .font(.system(size: 10, weight: .black))
                .padding(8)
                .background(backgroundProcessor.driverSeverity >= 3 ? Color.sdRed : Color.sdPrimary.opacity(0.9))
                .foregroundColor(.white)
                .padding(8)

                // REC badge
                if isClipping {
                    HStack(spacing: 5) {
                        Circle().fill(Color.red).frame(width: 7, height: 7)
                            .opacity(0.9)
                        Text("REC").font(.system(size: 9, weight: .black))
                    }
                    .padding(.horizontal, 8).padding(.vertical, 5)
                    .background(Color.black.opacity(0.7))
                    .foregroundColor(.white)
                    .clipShape(Capsule())
                    .padding(8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .shadow(color: .black.opacity(0.1), radius: 10, y: 5)
    }

    // MARK: - Behavior Card
    var behaviorCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("CURRENT STATUS")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.sdMuted)
                Spacer()
                if backgroundProcessor.driverSeverity > 0 {
                    Text("SEVERITY \(backgroundProcessor.driverSeverity)")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(severityColor)
                        .clipShape(Capsule())
                }
            }

            FlowLayout(spacing: 8) {
                ForEach(backgroundProcessor.driverStates, id: \.self) { state in
                    StateBadge(state: state)
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }

    var severityColor: Color {
        switch backgroundProcessor.driverSeverity {
        case 5: return .sdRed
        case 4: return .sdOrange
        case 3: return .sdYellow
        case 2: return .sdPrimary
        default: return .sdGreen
        }
    }

    var stopButton: some View {
        Button(action: stopDrive) {
            Text("FINISH DRIVE")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.sdRed)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.sdRed.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.top, 8)
    }

    // MARK: - Actions
    func startDrive() {
        isDriving = true
        cameraManager.checkPermissionsAndStart()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            backgroundProcessor.startCalibration()
        }
        startStateSync()
    }

    func stopDrive() {
        if isClipping { stopClipAndUpload() }
        isDriving = false
        cameraManager.stopSession()
        monitor.stopPolling()
        backgroundProcessor.resetMetrics()
        stopStateSync()
    }

    // MARK: - State Sync
    func startStateSync() {
        stateSyncTimer?.invalidate()
        stateSyncTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            postCurrentState()
        }
    }

    func stopStateSync() {
        stateSyncTimer?.invalidate()
        stateSyncTimer = nil
    }

    func postCurrentState() {
        let m = backgroundProcessor.currentMetrics
        let body: [String: Any] = [
            "driverName": activeUsername,
            "behaviorStates": backgroundProcessor.driverStates,
            "behaviorSeverity": backgroundProcessor.driverSeverity,
            "ear": m["fEAR"] ?? 0,
            "perclos": m["fPERCLOS"] ?? 0,
            "headPitch": m["fPitch"] ?? 0,
            "headYaw": m["fYaw"] ?? 0,
            "headRoll": m["fRoll"] ?? 0,
            "entropy": m["fEntropy"] ?? 0,
            "microTremor": m["fJerk"] ?? 0,
            "lat": locationManager.latitude, "lng": locationManager.longitude
        ]
        NetworkManager.shared.request(endpoint: "/state", method: "POST", body: body) { (_: Result<NetworkManager.StateResponse, Error>) in }
    }

    // MARK: - Clip Pipeline
    func startClip() {
        guard !isClipping else { return }
        isClipping = true
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".mp4")
        cameraManager.startRecording(to: url)
        clipStopTimer?.invalidate()
        clipStopTimer = Timer.scheduledTimer(withTimeInterval: maxClipDuration, repeats: false) { _ in
            stopClipAndUpload()
        }
        print("[Clip] Triggered by states: \(backgroundProcessor.driverStates)")
    }

    func stopClipAndUpload() {
        clipStopTimer?.invalidate()
        guard isClipping else { return }
        isClipping = false
        let capturedStates = backgroundProcessor.driverStates
        cameraManager.stopRecording { url in
            guard let url = url else { return }
            uploadClip(url: url, states: capturedStates)
        }
    }

    func uploadClip(url: URL, states: [String]) {
        DispatchQueue.global(qos: .utility).async {
            guard let data = try? Data(contentsOf: url) else {
                print("[Clip] Failed to read clip file")
                return
            }
            let base64 = "data:video/mp4;base64," + data.base64EncodedString()
            let body: [String: Any] = [
                "videoBase64": base64,
                "driverName": self.activeUsername,
                "sessionStart": ISO8601DateFormatter().string(from: Date()),
                "states": states
            ]
            NetworkManager.shared.request(endpoint: "/upload-video", method: "POST", body: body) { (result: Result<NetworkManager.UploadResponse, Error>) in
                switch result {
                case .success(let r): print("[Clip] ✅ Uploaded: \(r.videoUrl ?? "no url")")
                case .failure(let e): print("[Clip] ❌ Upload failed: \(e.localizedDescription)")
                }
            }
            try? FileManager.default.removeItem(at: url)
        }
    }

    func logout() {
        withAnimation { showProfileMenu = false }
        UserDefaults.standard.removeObject(forKey: "activeUsername")
        UserDefaults.standard.removeObject(forKey: "driverName")
        NetworkManager.shared.accessToken = nil
        isLoggedIn = false
        NotificationCenter.default.post(name: NSNotification.Name("UserDidLogout"), object: nil)
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 300
        var x: CGFloat = 0, y: CGFloat = 0, maxH: CGFloat = 0
        for sv in subviews {
            let sz = sv.sizeThatFits(.unspecified)
            if x + sz.width > width && x > 0 { x = 0; y += maxH + spacing; maxH = 0 }
            x += sz.width + spacing; maxH = max(maxH, sz.height)
        }
        return CGSize(width: width, height: maxH == 0 ? 0 : y + maxH)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, maxH: CGFloat = 0
        for sv in subviews {
            let sz = sv.sizeThatFits(.unspecified)
            if x + sz.width > bounds.maxX && x > bounds.minX { x = bounds.minX; y += maxH + spacing; maxH = 0 }
            sv.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(sz))
            x += sz.width + spacing; maxH = max(maxH, sz.height)
        }
    }
}

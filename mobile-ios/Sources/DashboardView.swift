import SwiftUI
import AVFoundation
import Combine

// MARK: - Monitor

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
    @StateObject var monitor = DrowsinessMonitor()
    @Environment(\.scenePhase) var scenePhase

    @State private var isDriving: Bool = false
    @State private var showProfileMenu: Bool = false
    @State private var debugModeEnabled: Bool = false

    @AppStorage("activeUsername") private var activeUsername: String = ""
    @AppStorage("activeName")    private var activeName: String = ""

    var profileInitial: String {
        activeName.isEmpty ? (activeUsername.first.map(String.init) ?? "?") : String(activeName.prefix(1)).uppercased()
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.sdBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                Divider().background(Color.sdCardBorder).padding(.horizontal, 20)

                if !isDriving {
                    inactiveBody
                } else {
                    activeBody
                }
            }

            // Profile dropdown overlay
            if showProfileMenu {
                profileDropdown
                    .padding(.top, 60)
                    .padding(.trailing, 16)
                    .transition(.asymmetric(
                        insertion: .scale(scale: 0.85, anchor: .topTrailing).combined(with: .opacity),
                        removal:  .scale(scale: 0.85, anchor: .topTrailing).combined(with: .opacity)
                    ))
                    .animation(.spring(response: 0.3, dampingFraction: 0.75), value: showProfileMenu)
                    .zIndex(10)
            }
        }
        .navigationBarHidden(true)
        .onChange(of: scenePhase) { _, newPhase in
            if (newPhase == .inactive || newPhase == .background) && isDriving { stopDrive() }
        }
        .onTapGesture {
            if showProfileMenu { withAnimation { showProfileMenu = false } }
        }
    }

    // MARK: - Top Bar

    var topBar: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(isDriving ? "Active Drive" : "Ready to Drive")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundColor(.sdForeground)
                Text("SAFEDRIVE INTELLIGENCE")
                    .font(.system(size: 10, weight: .semibold))
                    .kerning(1.8)
                    .foregroundColor(.sdSubtle)
            }
            Spacer()

            // Profile circle
            Button(action: { withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) { showProfileMenu.toggle() } }) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [.sdPrimary, .sdAccent], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 40, height: 40)
                    Text(profileInitial)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Profile Dropdown

    var profileDropdown: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [.sdPrimary, .sdAccent], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 36, height: 36)
                    Text(profileInitial)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(activeName.isEmpty ? activeUsername : activeName)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.sdForeground)
                    Text("@\(activeUsername)")
                        .font(.caption2)
                        .foregroundColor(.sdMuted)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)

            Divider().background(Color.sdCardBorder)

            // Debug toggle
            Toggle(isOn: $debugModeEnabled) {
                Label("Debug Mode", systemImage: "cpu")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.sdForeground)
            }
            .toggleStyle(SwitchToggleStyle(tint: .sdPrimary))
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            Divider().background(Color.sdCardBorder)

            // Logout
            Button(action: logout) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text("Sign Out")
                        .font(.system(size: 14, weight: .medium))
                }
                .foregroundColor(.sdRed)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color.sdSurface)
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.sdCardBorder, lineWidth: 1))
        )
        .shadow(color: .black.opacity(0.4), radius: 20, x: 0, y: 8)
        .frame(width: 240)
    }

    // MARK: - Inactive Body

    var inactiveBody: some View {
        VStack {
            Spacer()
            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(Color.sdPrimary.opacity(0.12))
                        .frame(width: 160, height: 160)
                    Circle()
                        .fill(Color.sdPrimary.opacity(0.07))
                        .frame(width: 200, height: 200)
                    Image(systemName: "steeringwheel")
                        .font(.system(size: 64))
                        .foregroundStyle(LinearGradient(colors: [.sdPrimary, .sdAccent], startPoint: .top, endPoint: .bottom))
                }

                VStack(spacing: 6) {
                    Text("Start your drive")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.sdForeground)
                    Text("SafeDrive will monitor your attention in real time")
                        .font(.system(size: 14))
                        .foregroundColor(.sdMuted)
                        .multilineTextAlignment(.center)
                }

                Button(action: startDrive) {
                    HStack(spacing: 10) {
                        Image(systemName: "play.fill")
                        Text("BEGIN DRIVE")
                            .font(.system(size: 16, weight: .bold))
                            .tracking(1.2)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        LinearGradient(colors: [.sdPrimary, .sdAccent], startPoint: .leading, endPoint: .trailing)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: .sdPrimary.opacity(0.45), radius: 18, x: 0, y: 8)
                }
                .padding(.horizontal, 32)
            }
            Spacer()
        }
    }

    // MARK: - Active Body

    var activeBody: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                cameraCard
                behaviorStateCard
                if debugModeEnabled { debugPanel }
                stopButton
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }

    // MARK: - Camera Card

    var cameraCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(monitor.isDataActive ? Color.sdGreen : Color.sdRed)
                            .frame(width: 7, height: 7)
                        Text(monitor.isDataActive ? "LIVE" : "NO SIGNAL")
                            .font(.system(size: 10, weight: .bold))
                            .kerning(1.2)
                            .foregroundColor(monitor.isDataActive ? .sdGreen : .sdRed)
                    }
                    Spacer()
                    Text("VISUAL MONITORING")
                        .font(.system(size: 10, weight: .medium))
                        .kerning(1.2)
                        .foregroundColor(.sdMuted)
                }
                CameraPreview()
                    .frame(height: 220)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }

    // MARK: - Behavioral State Card

    var behaviorStateCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("BEHAVIORAL STATE")
                        .font(.system(size: 10, weight: .semibold))
                        .kerning(1.5)
                        .foregroundColor(.sdMuted)
                    Spacer()
                    // Severity indicator
                    if monitor.behaviorSeverity > 0 {
                        Text("SEV \(monitor.behaviorSeverity)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(severityColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(severityColor.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }

                // Badges — one per active state
                FlowLayout(spacing: 8) {
                    ForEach(monitor.behaviorStates, id: \.self) { state in
                        StateBadge(state: state)
                    }
                }

                // EAR waveform
                VStack(alignment: .leading, spacing: 6) {
                    Text("EAR WAVEFORM")
                        .font(.system(size: 9, weight: .semibold))
                        .kerning(1.2)
                        .foregroundColor(.sdSubtle)
                    WaveformView(dataPoints: monitor.history)
                        .frame(height: 70)
                }
            }
        }
    }

    var severityColor: Color {
        switch monitor.behaviorSeverity {
        case 5: return .sdRed
        case 4: return .sdOrange
        case 3: return .sdYellow
        case 2: return Color(red: 0.40, green: 0.75, blue: 1.00)
        default: return .sdGreen
        }
    }

    // MARK: - Debug Panel

    var debugPanel: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "cpu").foregroundColor(.sdPrimary).font(.caption)
                    Text("DEBUG METRICS")
                        .font(.system(size: 10, weight: .bold))
                        .kerning(1.5)
                        .foregroundColor(.sdPrimary)
                }
                Divider().background(Color.sdCardBorder)

                Group {
                    debugRow("EAR", val: monitor.lastMetrics?.ear, fmt: "%.3f", warn: 0.22, warnLow: true)
                    debugRow("PERCLOS", val: monitor.lastMetrics?.perclos, fmt: "%.1f%%", scale: 100, warn: 15, warnLow: false)
                    debugRow("Closure", val: monitor.lastMetrics?.closureDurationMs, fmt: "%.0fms", warn: 1500, warnLow: false)
                    debugRow("Blinks/min", val: monitor.lastMetrics?.blinkRatePerMin, fmt: "%.0f", warn: 8, warnLow: true)
                    debugRow("Avg blink", val: monitor.lastMetrics?.avgBlinkDurationMs, fmt: "%.0fms", warn: 280, warnLow: false)
                    debugRow("Slow blinks", val: monitor.lastMetrics?.slowBlinkRate, fmt: "%.0f", warn: 2, warnLow: false)
                    debugRow("Eye rubs", val: monitor.lastMetrics?.eyeRubCount, fmt: "%.0f", warn: 1, warnLow: false)
                    debugRow("Asymmetry", val: monitor.lastMetrics?.asymmetryScore, fmt: "%.3f", warn: 0.15, warnLow: false)
                }
                Group {
                    debugRow("MAR", val: monitor.lastMetrics?.mar, fmt: "%.3f", warn: 0.5, warnLow: false)
                    debugRow("Yawns/5min", val: monitor.lastMetrics?.yawnCount, fmt: "%.0f", warn: 2, warnLow: false)
                    debugRow("Head pitch", val: monitor.lastMetrics?.headPitch, fmt: "%.1f°", warn: 15, warnLow: false, absValue: true)
                    debugRow("Head yaw", val: monitor.lastMetrics?.headYaw, fmt: "%.1f°", warn: 15, warnLow: false, absValue: true)
                    debugRow("Head roll", val: monitor.lastMetrics?.headRoll, fmt: "%.1f°", warn: 12, warnLow: false, absValue: true)
                    debugRow("Jerk vel", val: monitor.lastMetrics?.headJerkVelocity, fmt: "%.0f°/s", warn: 60, warnLow: false)
                    debugRow("H.Entropy", val: monitor.lastMetrics?.headMovementEntropy, fmt: "%.2f", warn: 2.0, warnLow: false)
                    debugRow("Tremor", val: monitor.lastMetrics?.microTremor.map { $0 * 1000 }, fmt: "%.2f", warn: 3.0, warnLow: false)
                }
                Group {
                    debugRow("Gaze H", val: monitor.lastMetrics?.gazeRatio, fmt: "%.2f")
                    debugRow("Gaze V", val: monitor.lastMetrics?.gazeVertical, fmt: "%.2f", warn: 0.70, warnLow: false)
                    debugRow("Gaze fix", val: monitor.lastMetrics?.gazeFixationDurationMs.map { $0 / 1000 }, fmt: "%.1fs", warn: 2.0, warnLow: false)
                    debugRow("Drift rep.", val: monitor.lastMetrics?.gazeDriftRepetition, fmt: "%.0f/min", warn: 5, warnLow: false)
                    debugRow("Recovery", val: monitor.lastMetrics?.avgAttentionRecoveryMs, fmt: "%.0fms", warn: 3500, warnLow: false)
                    debugRow("Prog.ratio", val: monitor.lastMetrics?.progressiveFatigueRatio, fmt: "%.2f", warn: 0.85, warnLow: true)
                    debugRow("Phone dur.", val: monitor.lastMetrics?.phoneDetectedDurationMs.map { $0 / 1000 }, fmt: "%.1fs", warn: 2.0, warnLow: false)
                }
            }
        }
    }

    @ViewBuilder
    func debugRow(_ label: String, val: Double?, fmt: String, scale: Double = 1, warn: Double? = nil, warnLow: Bool = false, absValue: Bool = false) -> some View {
        if let v = val {
            let display = absValue ? abs(v) * scale : v * scale
            let isWarning: Bool = {
                guard let w = warn else { return false }
                return warnLow ? display < w : display > w
            }()
            DebugMetricRow(
                label: label,
                value: String(format: fmt, display),
                accent: isWarning ? .sdRed : .sdGreen
            )
        }
    }

    // MARK: - Stop Button

    var stopButton: some View {
        Button(action: stopDrive) {
            HStack(spacing: 8) {
                Image(systemName: "stop.circle.fill")
                Text("END DRIVE")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(1.2)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.sdRed.opacity(0.85))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    // MARK: - Actions

    func startDrive() {
        isDriving = true
        guard !activeUsername.isEmpty else { return }
        monitor.startPolling(username: activeUsername)
    }

    func stopDrive() {
        isDriving = false
        monitor.stopPolling()
        guard !activeUsername.isEmpty else { return }
        let payload = ["driverName": activeUsername]
        NetworkManager.shared.request(endpoint: "/report/generate", method: "POST", body: payload) { (_: Result<NetworkManager.ReportModel, Error>) in }
    }

    func logout() {
        withAnimation { showProfileMenu = false }
        UserDefaults.standard.removeObject(forKey: "activeUsername")
        UserDefaults.standard.removeObject(forKey: "activeName")
        // Navigate back to login — handled via scene observation in SafeDriveApp
        NotificationCenter.default.post(name: NSNotification.Name("UserDidLogout"), object: nil)
    }
}

// MARK: - Flow Layout (multi-badge wrap)

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
        return CGSize(width: width, height: y + maxH)
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

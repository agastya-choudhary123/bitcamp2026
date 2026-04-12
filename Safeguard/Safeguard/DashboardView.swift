import SwiftUI
import AVFoundation
import Combine

// MARK: - Monitor (Renamed contents but logic preserved)

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
    @StateObject var monitor = DrowsinessMonitor()
    @Environment(\.scenePhase) var scenePhase

    @State private var isDriving: Bool = false
    @State private var showProfileMenu: Bool = false
    @State private var debugModeEnabled: Bool = false

    @AppStorage("activeUsername") private var activeUsername: String = ""
    @AppStorage("driverName")    private var driverName: String = ""

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
                    .background(Color.white) // Clean white header
                    .shadow(color: .black.opacity(0.03), radius: 5, y: 5)

                if !isDriving {
                    inactiveBody
                } else {
                    activeBody
                }
            }

            // Profile dropdown overlay
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

            // Profile circle
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
                if debugModeEnabled { debugPanel }
                stopButton
            }
            .padding(20)
        }
    }

    // MARK: - Camera Card

    var cameraCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("LIVE VISUALS", systemImage: "video.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(monitor.isDataActive ? .sdPrimary : .sdRed)
                Spacer()
                if monitor.isDataActive {
                    Circle().fill(Color.sdGreen).frame(width: 6, height: 6)
                        .opacity(0.8)
                }
            }
            CameraPreview()
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }

    // MARK: - Behavior Card

    var behaviorCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("CURRENT STATUS")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.sdMuted)
                Spacer()
                if monitor.behaviorSeverity > 0 {
                    Text("SEVERITY \(monitor.behaviorSeverity)")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(severityColor)
                        .clipShape(Capsule())
                }
            }

            FlowLayout(spacing: 8) {
                ForEach(monitor.behaviorStates, id: \.self) { state in
                    StateBadge(state: state)
                }
            }

            // Minimalist Waveform
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("EYE ACTIVITY (EAR)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.sdSubtle)
                    Spacer()
                    Text(String(format: "%.3f", monitor.earScore))
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.sdPrimary)
                }
                WaveformView(dataPoints: monitor.history)
                    .frame(height: 60)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(18)
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }

    var severityColor: Color {
        switch monitor.behaviorSeverity {
        case 5: return .sdRed
        case 4: return .sdOrange
        case 3: return .sdYellow
        case 2: return .sdPrimary
        default: return .sdGreen
        }
    }

    // MARK: - Debug Panel

    var debugPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "terminal.fill").font(.caption).foregroundColor(.sdPrimary)
                Text("RAW TELEMETRY")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.sdPrimary)
            }
            
            VStack(spacing: 2) {
                debugRow("EAR", val: monitor.lastMetrics?.ear, fmt: "%.3f", warn: 0.22, warnLow: true)
                debugRow("PERCLOS", val: monitor.lastMetrics?.perclos, fmt: "%.1f%%", scale: 100, warn: 15)
                debugRow("Blinks/min", val: monitor.lastMetrics?.blinkRatePerMin, fmt: "%.0f", warn: 8, warnLow: true)
                debugRow("Slow Blinks", val: monitor.lastMetrics?.slowBlinkRate, fmt: "%.0f", warn: 2)
                debugRow("Eye Rubs", val: monitor.lastMetrics?.eyeRubCount, fmt: "%.0f", warn: 1)
                debugRow("Asymmetry", val: monitor.lastMetrics?.asymmetryScore, fmt: "%.3f", warn: 0.15)
                debugRow("Head Jerk", val: monitor.lastMetrics?.headJerkVelocity, fmt: "%.0f°/s", warn: 60)
                debugRow("Entropy", val: monitor.lastMetrics?.headMovementEntropy, fmt: "%.2f", warn: 2.0)
                debugRow("Recovery", val: monitor.lastMetrics?.avgAttentionRecoveryMs, fmt: "%.0fms", warn: 3500)
                debugRow("Lean Offset", val: monitor.lastMetrics?.browPosition, fmt: "%.3f", warn: 0.15) // Proxy for lean in this view
            }
        }
        .padding(16)
        .background(Color(white: 0.98))
        .cornerRadius(18)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.sdCardBorder, lineWidth: 1))
    }

    @ViewBuilder
    func debugRow(_ label: String, val: Double?, fmt: String, scale: Double = 1, warn: Double? = nil, warnLow: Bool = false) -> some View {
        if let v = val {
            let display = v * scale
            let isWarning = warnLow ? (display < (warn ?? 0)) : (display > (warn ?? 999))
            DebugMetricRow(label: label, value: String(format: fmt, display), accent: isWarning ? .sdRed : .sdGreen)
        }
    }

    // MARK: - Stop Button

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
        UserDefaults.standard.removeObject(forKey: "driverName")
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

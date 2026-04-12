import SwiftUI

struct DebugView: View {
    @ObservedObject var processor: BackgroundCVProcessor
    @State private var expandedMetric: String? = nil
    
    let metricRegistry: [MetricMeta] = [
        MetricMeta(id: "fEAR", label: "EAR", icon: "eye.fill", desc: "Eye Aspect Ratio. Measures eyelid opening.", range: "> 0.30 (Normal)"),
        MetricMeta(id: "fPERCLOS", label: "PERCLOS", icon: "chart.bar.fill", desc: "Percentage of Eye Closure over 1 min.", range: "< 0.08 (Safe)"),
        MetricMeta(id: "fPitch", label: "PITCH", icon: "arrow.up.and.down.circle", desc: "Head pitch (tilting up/down).", range: "±15° (Normal)"),
        MetricMeta(id: "fYaw", label: "YAW", icon: "arrow.left.and.right.circle", desc: "Head yaw (turning left/right).", range: "±15° (Normal)"),
        MetricMeta(id: "fEntropy", label: "ENTROPY", icon: "waveform.path.ecg", desc: "Head movement variability. High = Fatigue.", range: "0.5 - 2.5 (Normal)"),
        MetricMeta(id: "fJerk", label: "JERK", icon: "bolt.fill", desc: "Rate of change of head acceleration.", range: "< 50 (Safe)"),
        MetricMeta(id: "fClosureDur", label: "CLOSURE", icon: "timer", desc: "Current duration of eye closure (ms).", range: "< 2500ms (Crit)"),
        MetricMeta(id: "fDistractDur", label: "DISTRACT", icon: "clock.arrow.circlepath", desc: "Duration of gaze away from road (ms).", range: "< 3000ms (Crit)"),
        MetricMeta(id: "fPhoneDur", label: "PHONE", icon: "iphone", desc: "Duration of detected mobile phone use.", range: "0ms (Required)"),
        MetricMeta(id: "isFacingForward", label: "FORWARD", icon: "person.fill.viewfinder", desc: "Boolean: Is the driver facing the road?", range: "1.0 (Required)")
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header: Current States
                VStack(alignment: .leading, spacing: 12) {
                    Text("ACTIVE DRIVER STATES")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.sdMuted)
                        .kerning(1)
                    
                    FlowLayout(spacing: 8) {
                        ForEach(processor.driverStates, id: \.self) { state in
                            StateBadge(state: state)
                        }
                    }
                    
                    HStack {
                        Text("SEVERITY SCORE")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.sdMuted)
                        Spacer()
                        Text("\(processor.driverSeverity)")
                            .font(.system(size: 14, weight: .black))
                            .foregroundColor(severityColor(processor.driverSeverity))
                    }
                }
                .padding(20)
                .background(Color.white)
                .cornerRadius(18)
                .shadow(color: .black.opacity(0.04), radius: 10, y: 5)
                
                // Body: Face Metrics Grid
                // Body: Face Metrics Grid (Literal Mirror of Dashboard Screenshot)
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "circle.grid.2x1.fill")
                            .font(.system(size: 10))
                        Text("RAW DIAGNOSTICS [GRID MODE]")
                            .font(.system(size: 10, weight: .bold))
                            .kerning(1)
                    }
                    .foregroundColor(.sdMuted)
                    
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 20) {
                        MetricTile(label: "EAR", value: String(format: "%.4f", processor.lastEAR))
                        MetricTile(label: "PERCLOS", value: String(format: "%.1f%%", (processor.currentMetrics["fPERCLOS"] ?? 0) * 100))
                        
                        MetricTile(label: "BLINK RATE", value: String(format: "%.1f", processor.currentMetrics["fBlinkRate"] ?? 0))
                        MetricTile(label: "BLINK DURATION", value: "\(Int(processor.currentMetrics["fBlinkDur"] ?? 0))ms")
                        
                        MetricTile(label: "FATIGUE RATIO", value: String(format: "%.2f", processor.currentMetrics["fFatigueRatio"] ?? 1.0))
                        MetricTile(label: "HEAD ENTROPY", value: String(format: "%.2f", processor.currentMetrics["fEntropy"] ?? 0))
                        
                        MetricTile(label: "MICROTREMOR", value: String(format: "%.5f", processor.currentMetrics["microTremor"] ?? 0))
                        MetricTile(label: "GAZE RATIO", value: String(format: "%.2f", processor.currentMetrics["gazeRatio"] ?? 0.5))
                        
                        MetricTile(label: "GAZE VERTICAL", value: String(format: "%.2f", processor.currentMetrics["gazeVertical"] ?? 0.5))
                        MetricTile(label: "YAWN COUNT", value: "\(Int(processor.currentMetrics["fYawn"] ?? 0))")
                        
                        MetricTile(label: "POSTURE LEAN", value: String(format: "%.2f", processor.currentMetrics["fPosture"] ?? 0))
                        MetricTile(label: "SLOW BLINKS", value: "\(Int(processor.currentMetrics["fSlowBlinks"] ?? 0))")
                        
                        MetricTile(label: "EYE RUBS", value: "\(Int(processor.currentMetrics["eyeRubs"] ?? 0))")
                        MetricTile(label: "HEAD PITCH", value: String(format: "%.1f", processor.lastPitch))
                        
                        MetricTile(label: "HEAD YAW", value: String(format: "%.1f", processor.lastYaw))
                        MetricTile(label: "HEAD ROLL", value: String(format: "%.1f", processor.lastRoll), color: abs(processor.lastRoll) > 13 ? .sdRed : .sdForeground)
                    }
                }
                .padding(24)
                .background(Color.white)
                .cornerRadius(18)
                .shadow(color: .black.opacity(0.04), radius: 10, y: 5)
                
                // Calibration Action
                Button(action: { processor.startCalibration() }) {
                    HStack {
                        Image(systemName: "scope")
                        Text("RECALIBRATE SENSORS")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.sdPrimary)
                    .cornerRadius(14)
                }
                .padding(.top, 10)
            }
            .padding(20)
        }
        .background(Color.sdBackground.ignoresSafeArea())
        .navigationTitle("Live Debug")
    }
    
    func severityColor(_ sev: Int) -> Color {
        switch sev {
        case 5: return .sdRed
        case 4: return .sdOrange
        case 3: return .sdYellow
        case 2: return .sdPrimary
        default: return .sdGreen
        }
    }
}



struct MetricMeta: Identifiable {
    let id: String
    let label: String
    let icon: String
    let desc: String
    let range: String
}

struct MetricTile: View {
    let label: String
    let value: String
    var color: Color = .sdForeground
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.sdMuted)
                .kerning(0.5)
            Text(value)
                .font(.system(size: 18, weight: .black, design: .monospaced))
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}



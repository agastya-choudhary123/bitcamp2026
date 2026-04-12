import SwiftUI

// MARK: - Color Palette
extension Color {
    // Base
    static let sdBackground   = Color(red: 0.06, green: 0.06, blue: 0.11)
    static let sdSurface      = Color(red: 0.10, green: 0.10, blue: 0.17)
    static let sdCard         = Color(white: 1.0, opacity: 0.06)
    static let sdCardBorder   = Color(white: 1.0, opacity: 0.10)
    static let sdForeground   = Color(red: 0.96, green: 0.96, blue: 1.00)
    static let sdMuted        = Color(red: 0.52, green: 0.51, blue: 0.63)
    static let sdSubtle       = Color(red: 0.34, green: 0.33, blue: 0.44)

    // Brand
    static let sdPrimary      = Color(red: 0.40, green: 0.33, blue: 0.98) // Vivid indigo
    static let sdAccent       = Color(red: 0.57, green: 0.36, blue: 1.00) // Soft violet

    // Semantic
    static let sdGreen        = Color(red: 0.22, green: 0.87, blue: 0.60)
    static let sdYellow       = Color(red: 0.98, green: 0.76, blue: 0.18)
    static let sdOrange       = Color(red: 1.00, green: 0.55, blue: 0.20)
    static let sdRed          = Color(red: 0.95, green: 0.27, blue: 0.27)

    // State colors
    static func stateColor(for state: String) -> Color {
        switch state {
        case "microsleep", "medical": return .sdRed
        case "intoxicated":           return .sdOrange
        case "drowsy":                return .sdYellow
        case "phone_use":             return Color(red: 0.98, green: 0.60, blue: 0.10)
        case "distracted":            return Color(red: 0.40, green: 0.75, blue: 1.00)
        case "alert":                 return .sdGreen
        default:                      return .sdMuted
        }
    }

    static func stateIcon(for state: String) -> String {
        switch state {
        case "microsleep":  return "eye.slash.fill"
        case "medical":     return "cross.case.fill"
        case "intoxicated": return "exclamationmark.triangle.fill"
        case "drowsy":      return "moon.zzz.fill"
        case "phone_use":   return "iphone.gen3.radiowaves.left.and.right"
        case "distracted":  return "arrow.left.and.right.circle.fill"
        case "alert":       return "checkmark.shield.fill"
        default:            return "questionmark.circle"
        }
    }
}

// MARK: - Glass Card
struct GlassCard<Content: View>: View {
    let content: Content
    var cornerRadius: CGFloat = 20

    init(cornerRadius: CGFloat = 20, @ViewBuilder content: () -> Content) {
        self.content = content()
        self.cornerRadius = cornerRadius
    }

    var body: some View {
        content
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Color.sdCard)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(Color.sdCardBorder, lineWidth: 1)
                    )
            )
            .shadow(color: .black.opacity(0.25), radius: 12, x: 0, y: 6)
    }
}

// MARK: - State Badge
struct StateBadge: View {
    let state: String

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: Color.stateIcon(for: state))
                .font(.system(size: 12, weight: .semibold))
            Text(stateLabel)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .tracking(0.5)
        }
        .foregroundColor(Color.stateColor(for: state))
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(Color.stateColor(for: state).opacity(0.14))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.stateColor(for: state).opacity(0.35), lineWidth: 1))
    }

    var stateLabel: String {
        switch state {
        case "microsleep":  return "Microsleep"
        case "medical":     return "Medical Emergency"
        case "intoxicated": return "Possibly Intoxicated"
        case "drowsy":      return "Drowsy"
        case "phone_use":   return "Phone Use"
        case "distracted":  return "Distracted"
        case "alert":       return "Alert"
        default:            return state.capitalized
        }
    }
}

// MARK: - Metric Row (for debug panel)
struct DebugMetricRow: View {
    let label: String
    let value: String
    var accent: Color = .sdMuted

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.sdSubtle)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundColor(accent)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Blur Helper
struct Blur: UIViewRepresentable {
    var style: UIBlurEffect.Style
    func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: style))
    }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}

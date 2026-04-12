import SwiftUI

// MARK: - Color Palette (Safeguard Clean White Theme)
extension Color {
    // Base - Pivoted to clean white background
    static let sdBackground   = Color(red: 0.97, green: 0.98, blue: 0.99)
    static let sdSurface      = Color.white
    static let sdCard         = Color.white
    static let sdCardBorder   = Color(white: 0.0, opacity: 0.08)
    static let sdForeground   = Color(red: 0.05, green: 0.05, blue: 0.10)
    static let sdMuted        = Color(red: 0.45, green: 0.47, blue: 0.52)
    static let sdSubtle       = Color(red: 0.65, green: 0.67, blue: 0.72)

    // Brand - Safeguard Vivid Blue
    static let sdPrimary      = Color(red: 0.00, green: 0.35, blue: 0.87) // Deep blue from screenshot
    static let sdAccent       = Color(red: 0.00, green: 0.47, blue: 1.00) // Lighter iOS blue

    // Semantic (slightly adjusted for light theme)
    static let sdGreen        = Color(red: 0.15, green: 0.65, blue: 0.45)
    static let sdYellow       = Color(red: 0.85, green: 0.60, blue: 0.05)
    static let sdOrange       = Color(red: 0.90, green: 0.45, blue: 0.10)
    static let sdRed          = Color(red: 0.85, green: 0.15, blue: 0.15)

    // State colors
    static func stateColor(for state: String) -> Color {
        switch state {
        case "microsleep", "medical": return .sdRed
        case "intoxicated":           return .sdOrange
        case "drowsy":                return .sdYellow
        case "phone_use":             return Color(red: 0.90, green: 0.40, blue: 0.05)
        case "distracted":            return Color(red: 0.00, green: 0.45, blue: 0.75)
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

// MARK: - Glass Card (Refined for Light Theme)
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
                    .fill(Color.white)
                    .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.sdCardBorder, lineWidth: 1)
            )
    }
}

// MARK: - State Badge
struct StateBadge: View {
    let state: String

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: Color.stateIcon(for: state))
                .font(.system(size: 11, weight: .semibold))
            Text(stateLabel)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .tracking(0.3)
        }
        .foregroundColor(Color.stateColor(for: state))
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.stateColor(for: state).opacity(0.08))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.stateColor(for: state).opacity(0.2), lineWidth: 1))
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
                .foregroundColor(.sdMuted)
            Spacer()
            // Value pill for better visibility in light theme
            Text(value)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(accent)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(accent.opacity(0.05))
                .cornerRadius(4)
        }
        .padding(.vertical, 3)
    }
}

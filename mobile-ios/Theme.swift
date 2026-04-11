import SwiftUI

extension Color {
    static let sdBackground = Color(red: 0.09, green: 0.08, blue: 0.16)
    static let sdPrimary = Color(red: 0.43, green: 0.37, blue: 0.97)
    static let sdCard = Color(white: 1.0, opacity: 0.08)
    static let sdCardBorder = Color(white: 1.0, opacity: 0.12)
    static let sdForeground = Color(red: 0.95, green: 0.95, blue: 1.0)
    static let sdMuted = Color(red: 0.56, green: 0.55, blue: 0.66)
    static let sdRed = Color(red: 0.91, green: 0.36, blue: 0.22)
    static let sdGreen = Color(red: 0.30, green: 0.85, blue: 0.63)
    static let sdYellow = Color(red: 0.96, green: 0.73, blue: 0.26)
}

struct GlassCard<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        content
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color.sdCard)
                    .background(Blur(style: .systemThinMaterialDark))
                    .cornerRadius(24)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(sdCardBorder, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.3), radius: 15, x: 0, y: 10)
    }
}

struct Blur: UIViewRepresentable {
    var style: UIBlurEffect.Style
    func makeUIView(context: Context) -> UIVisualEffectView {
        return UIVisualEffectView(effect: UIBlurEffect(style: style))
    }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}

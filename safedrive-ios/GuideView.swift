import SwiftUI

struct GuideView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Button(action: { presentationMode.wrappedValue.dismiss() }) {
                            Image(systemName: "chevron.left")
                                .padding(12)
                                .background(Color.sdCard)
                                .clipShape(Circle())
                        }
                        VStack(alignment: .leading) {
                            Text("Safety Guide").font(.title2).bold()
                            Text("UNDERSTANDING METRICS").font(.caption2).kerning(1).foregroundColor(.sdMuted)
                        }
                    }
                    .padding(.bottom, 10)
                    
                    GlassCard {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "eye.fill").foregroundColor(.sdPrimary)
                                Text("Eye Aspect Ratio (EAR)").font(.headline)
                            }
                            Text("EAR is a numerical value calculated from eye landmarks. It drops when eyelids close.")
                                .font(.subheadline).foregroundColor(.sdMuted)
                            
                            VStack(spacing: 8) {
                                StatusTag(range: "> 0.30", label: "AWAKE", color: .sdGreen)
                                StatusTag(range: "0.25 - 0.30", label: "DROWSY", color: .sdYellow)
                                StatusTag(range: "< 0.25", label: "DANGER", color: .sdRed)
                            }
                        }
                    }
                    
                    GlassCard {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "chart.bar.fill").foregroundColor(.sdPrimary)
                                Text("PERCLOS").font(.headline)
                            }
                            Text("The percentage of time eyes are closed over a rolling 1-minute window.")
                                .font(.subheadline).foregroundColor(.sdMuted)
                            
                            Divider().background(Color.sdCardBorder)
                            
                            HStack {
                                Text("0.00 - 0.08").font(.system(.body, design: .monospaced))
                                Spacer()
                                Text("PASSIVE").bold().foregroundColor(.sdGreen)
                            }
                            HStack {
                                Text("> 0.12").font(.system(.body, design: .monospaced))
                                Spacer()
                                Text("EMERGENCY").bold().foregroundColor(.sdRed)
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarHidden(true)
    }
}

struct StatusTag: View {
    let range: String
    let label: String
    let color: Color
    
    var body: some View {
        HStack {
            Text(range).font(.system(.subheadline, design: .monospaced))
            Spacer()
            Text(label).font(.caption).bold()
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(color.opacity(0.15))
                .foregroundColor(color)
                .cornerRadius(4)
        }
        .padding(10)
        .background(Color.white.opacity(0.03))
        .cornerRadius(8)
    }
}

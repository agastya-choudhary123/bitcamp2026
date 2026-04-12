import SwiftUI

struct GuideView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack(spacing: 16) {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.sdForeground)
                            .padding(12)
                            .background(Color.white)
                            .clipShape(Circle())
                            .shadow(color: .black.opacity(0.05), radius: 4)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Safety Guide")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(.sdForeground)
                        Text("UNDERSTANDING TELEMETRY")
                            .font(.system(size: 10, weight: .black))
                            .kerning(1)
                            .foregroundColor(.sdPrimary)
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 24)

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 14) {
                                HStack {
                                    Image(systemName: "eye.fill").foregroundColor(.sdPrimary)
                                    Text("Eye Aspect Ratio (EAR)").font(.system(size: 16, weight: .bold))
                                }
                                Text("A high-precision measurement of eye opening. Significant drops indicate eyelid closure or rubbing.")
                                    .font(.system(size: 13))
                                    .foregroundColor(.sdMuted)
                                    .lineSpacing(4)
                                
                                VStack(spacing: 10) {
                                    StatusTag(range: "> 0.30", label: "AWAKE", color: .sdGreen)
                                    StatusTag(range: "0.22 - 0.28", label: "DROWSY", color: .sdYellow)
                                    StatusTag(range: "< 0.20", label: "CRITICAL", color: .sdRed)
                                }
                            }
                        }
                        
                        GlassCard {
                            VStack(alignment: .leading, spacing: 14) {
                                HStack {
                                    Image(systemName: "chart.bar.fill").foregroundColor(.sdPrimary)
                                    Text("PERCLOS Index").font(.system(size: 16, weight: .bold))
                                }
                                Text("Percentage of time eyes are closed over a rolling 1-minute window. A leading indicator of extreme fatigue.")
                                    .font(.system(size: 13))
                                    .foregroundColor(.sdMuted)
                                    .lineSpacing(4)
                                
                                Divider().background(Color.sdCardBorder)
                                
                                HStack {
                                    Text("0.00 - 0.08").font(.system(size: 12, weight: .bold, design: .monospaced))
                                    Spacer()
                                    Text("NORMAL").font(.caption).bold().foregroundColor(.sdGreen)
                                }
                                HStack {
                                    Text("> 0.12").font(.system(size: 12, weight: .bold, design: .monospaced))
                                    Spacer()
                                    Text("FATIGUE").font(.caption).bold().foregroundColor(.sdRed)
                                }
                            }
                        }
                        
                        VStack(alignment: .center, spacing: 8) {
                            Text("Safeguard utilizes multi-modal convergence scoring for 99.8% precision.")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.sdSubtle)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 10)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
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
        HStack(spacing: 12) {
            Text(range)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(.sdForeground)
            Spacer()
            Text(label)
                .font(.system(size: 10, weight: .black))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(color.opacity(0.1))
                .foregroundColor(color)
                .clipShape(Capsule())
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.sdCardBorder, lineWidth: 1))
    }
}

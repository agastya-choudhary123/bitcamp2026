import SwiftUI

struct ReportsView: View {
    @AppStorage("activeUsername") private var activeUsername = ""
    
    @State private var reports: [NetworkManager.ReportModel] = []
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.sdBackground.ignoresSafeArea()
                
                VStack(alignment: .leading, spacing: 16) {
                    
                    VStack(alignment: .leading) {
                        Text("Safety Reports").font(.largeTitle).bold().foregroundColor(.white)
                        Text("AI SUMMARIES GENERATED AFTER EVERY DRIVE")
                            .font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                    .padding(.top)
                    
                    if isLoading && reports.isEmpty {
                        Spacer()
                        HStack {
                            Spacer()
                            ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                            Spacer()
                        }
                        Spacer()
                    } else if reports.isEmpty {
                        Spacer()
                        Text("No reports found. Drive and press 'Stop' to auto-generate an AI Report.")
                            .font(.subheadline)
                            .foregroundColor(.sdMuted)
                            .multilineTextAlignment(.center)
                            .padding()
                        Spacer()
                    } else {
                        ScrollView {
                            VStack(spacing: 16) {
                                ForEach(reports) { report in
                                    GlassCard {
                                        VStack(alignment: .leading, spacing: 12) {
                                            HStack {
                                                Image(systemName: "sparkles")
                                                    .foregroundColor(.sdPrimary)
                                                
                                                if let rawTime = report.timestamp {
                                                    // Parse for visual display
                                                    Text(String(rawTime.prefix(10)))
                                                        .font(.headline)
                                                        .foregroundColor(.white)
                                                } else {
                                                    Text("Recent Drive")
                                                        .font(.headline)
                                                        .foregroundColor(.white)
                                                }
                                                Spacer()
                                            }
                                            
                                            Divider().background(Color.sdCardBorder)
                                            
                                            Text(report.reportText ?? "Error retrieving AI contents.")
                                                .font(.subheadline)
                                                .foregroundColor(.white)
                                                .lineSpacing(4)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                    }
                                }
                            }
                            .padding(.bottom, 20)
                        }
                    }
                }
                .padding()
            }
            .navigationBarHidden(true)
            .onAppear(perform: loadReports)
        }
    }
    
    func loadReports() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        
        NetworkManager.shared.request(endpoint: "/report/\(activeUsername)") { (result: Result<[NetworkManager.ReportModel], Error>) in
            isLoading = false
            switch result {
            case .success(let res):
                self.reports = res
            case .failure(let err):
                print("Failed to auto-fetch reports array: \(err.localizedDescription)")
            }
        }
    }
}

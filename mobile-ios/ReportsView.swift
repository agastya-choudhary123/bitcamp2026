import SwiftUI

struct ReportsView: View {
    @State private var reports: [NetworkManager.ReportModel] = []
    @State private var isLoading = false
    @AppStorage("activeUsername") private var activeUsername = ""

    var body: some View {
        NavigationView {
            ZStack {
                Color.sdBackground.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    if isLoading {
                        Spacer()
                        ProgressView("Analyzing Safeguard Logs...")
                            .tint(.sdPrimary)
                        Spacer()
                    } else if reports.isEmpty {
                        emptyState
                    } else {
                        List {
                            ForEach(reports) { report in
                                ReportCard(report: report)
                                    .listRowBackground(Color.clear)
                                    .listRowSeparator(.hidden)
                                    .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
                            }
                        }
                        .listStyle(.plain)
                        .refreshable { fetchReports() }
                    }
                }
            }
            .navigationTitle("Safety Reports")
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.white, for: .navigationBar)
            .onAppear { fetchReports() }
        }
    }

    var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.sdPrimary.opacity(0.2))
            Text("No reports yet")
                .font(.headline)
            Text("Complete a drive with Safeguard to see your AI-generated safety analysis.")
                .font(.subheadline)
                .foregroundColor(.sdMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    func fetchReports() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        NetworkManager.shared.request(endpoint: "/report/\(activeUsername)") { (result: Result<[NetworkManager.ReportModel], Error>) in
            DispatchQueue.main.async {
                isLoading = false
                if case .success(let data) = result {
                    self.reports = data
                }
            }
        }
    }
}

struct ReportCard: View {
    let report: NetworkManager.ReportModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("AI ANALYSIS", systemImage: "sparkles")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.sdPrimary)
                Spacer()
                if let ts = report.timestamp {
                    Text(ts.prefix(10))
                        .font(.caption2)
                        .foregroundColor(.sdMuted)
                }
            }

            Text(report.reportText ?? "No analysis available")
                .font(.system(size: 14))
                .foregroundColor(.sdForeground)
                .lineSpacing(4)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }
}

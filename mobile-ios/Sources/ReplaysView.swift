import SwiftUI

struct ReplaysView: View {
    @Environment(\.presentationMode) var presentationMode
    @AppStorage("activeUsername") private var activeUsername = ""
    
    @State private var replays: [NetworkManager.ReplayModel] = []
    @State private var searchText = ""
    @State private var isLoading = false
    
    // Convert to strict reverse chronological based on dates
    var filteredSessions: [NetworkManager.ReplayModel] {
        let sorted = replays.sorted { 
            ($0.sessionStart ?? "") > ($1.sessionStart ?? "") 
        }
        
        if !searchText.isEmpty {
            return sorted.filter { $0.sessionStart?.lowercased().contains(searchText.lowercased()) == true }
        }
        return sorted
    }
    
    var body: some View {
        ZStack {
            Color.sdBackground.ignoresSafeArea()
            
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .padding(12)
                            .background(Color.sdCard)
                            .clipShape(Circle())
                    }
                    VStack(alignment: .leading) {
                        Text("Driving Replays").font(.title2).bold()
                        Text("CLOUD HOSTED SESSIONS").font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                }
                
                HStack {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .foregroundColor(.sdMuted)
                    TextField("Filter specific date (e.g., 2026-04-10)", text: $searchText)
                        .foregroundColor(.white)
                }
                .padding(12)
                .background(Color.white.opacity(0.05))
                .cornerRadius(12)
                
                if isLoading {
                    Spacer()
                    HStack {
                        Spacer()
                        ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Spacer()
                    }
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            ForEach(filteredSessions) { session in
                                GlassCard {
                                    VStack(alignment: .leading, spacing: 16) {
                                        HStack {
                                            Text("Cloud Replay").font(.headline)
                                            Spacer()
                                            if let rawTime = session.sessionStart {
                                                // Simplified date parser for hackathon visual formatting
                                                Text(String(rawTime.prefix(10))).font(.caption).foregroundColor(.sdMuted)
                                            }
                                        }
                                        
                                        HStack {
                                            Label("Full Session", systemImage: "timer")
                                                .font(.caption).bold()
                                                .foregroundColor(.sdPrimary)
                                                .padding(6)
                                                .padding(.horizontal, 4)
                                                .background(Color.sdPrimary.opacity(0.1))
                                                .cornerRadius(8)
                                            
                                            Spacer()
                                            
                                            if let urlString = session.videoUrl, let _ = URL(string: urlString) {
                                                Image(systemName: "play.fill")
                                                    .foregroundColor(.white)
                                                    .font(.system(size: 10))
                                                    .padding(10)
                                                    .background(Color.sdPrimary)
                                                    .clipShape(Circle())
                                            } else {
                                                Text("Processing...")
                                                    .font(.caption)
                                                    .foregroundColor(.sdMuted)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .navigationBarHidden(true)
        .onAppear(perform: loadReplays)
    }
    
    func loadReplays() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        NetworkManager.shared.request(endpoint: "/replay/\(activeUsername)") { (result: Result<[NetworkManager.ReplayModel], Error>) in
            isLoading = false
            switch result {
            case .success(let fetched):
                replays = fetched
            case .failure(let err):
                print("Failed: \(err)")
            }
        }
    }
}

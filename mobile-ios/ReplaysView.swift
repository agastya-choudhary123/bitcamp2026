import SwiftUI

struct Replay: Identifiable, Codable {
    let id: String
    let replayName: String
    let sessionStart: String
    let sessionEnd: String
    
    var title: String { replayName }
    var date: String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: sessionStart) {
            let df = DateFormatter()
            df.dateStyle = .medium
            return df.string(from: date)
        }
        return "Unknown Date"
    }
}

struct ReplaysView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var searchText = ""
    @State private var sortByDate = true
    @State private var sessions: [Replay] = []
    @State private var isLoading = false
    
    var filteredSessions: [Replay] {
        let filtered = sessions.filter { 
            searchText.isEmpty ? true : $0.replayName.lowercased().contains(searchText.lowercased()) 
        }
        return sortByDate ? filtered : filtered.reversed()
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
                        Text("PAST SESSIONS").font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                }
                
                // Search + Sort
                HStack {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundColor(.sdMuted)
                        TextField("Search...", text: $searchText)
                            .foregroundColor(.white)
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
                    
                    Button(action: { sortByDate.toggle() }) {
                        Image(systemName: "arrow.up.arrow.down")
                            .padding(12)
                            .background(Color.sdCard)
                            .cornerRadius(12)
                            .foregroundColor(sortByDate ? .sdPrimary : .white)
                    }
                }
                
                ScrollView {
                    VStack(spacing: 16) {
                        ForEach(filteredSessions) { session in
                            GlassCard {
                                VStack(alignment: .leading, spacing: 16) {
                                    HStack {
                                        Text(session.title).font(.headline)
                                        Spacer()
                                        Text(session.date).font(.caption).foregroundColor(.sdMuted)
                                    }
                                    
                                    HStack {
                                        Label("Session Replay", systemImage: "timer")
                                            .font(.caption).bold()
                                            .foregroundColor(.sdPrimary)
                                            .padding(6)
                                            .padding(.horizontal, 4)
                                            .background(Color.sdPrimary.opacity(0.1))
                                            .cornerRadius(8)
                                        
                                        Spacer()
                                        
                                        Image(systemName: "play.fill")
                                            .foregroundColor(.white)
                                            .font(.system(size: 10))
                                            .padding(10)
                                            .background(Color.sdPrimary)
                                            .clipShape(Circle())
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding()
            
            if isLoading {
                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .sdPrimary))
            }
        }
        .navigationBarHidden(true)
        .onAppear(perform: fetchReplays)
    }

    func fetchReplays() {
        isLoading = true
        let url = URL(string: "http://localhost:3001/replays")!
        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                isLoading = false
                if let data = data,
                   let decoded = try? JSONDecoder().decode([Replay].self, from: data) {
                    self.sessions = decoded
                }
            }
        }.resume()
    }
}

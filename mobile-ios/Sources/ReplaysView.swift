import SwiftUI

struct Replay: Identifiable {
    let id = UUID()
    let title: String
    let date: String
    let duration: String
    let alerts: Int
}

struct ReplaysView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var searchText = ""
    @State private var sortByDate = true
    
    let sessions = [
        Replay(title: "Night Drive to Baltimore", date: "Apr 10, 2026", duration: "45:12", alerts: 3),
        Replay(title: "Morning Commute", date: "Apr 09, 2026", duration: "22:05", alerts: 0),
        Replay(title: "Long Haul - Interstate 95", date: "Apr 08, 2026", duration: "135:30", alerts: 12),
        Replay(title: "Evening Trip", date: "Apr 07, 2026", duration: "15:20", alerts: 1)
    ]
    
    // We force reverse chronological visually since the mock strings above are already logically sorted.
    // However, we apply the search filter here.
    var filteredSessions: [Replay] {
        let sorted = sessions // Assumed chronological (newest first based on array)
        
        if !searchText.isEmpty {
            return sorted.filter { $0.title.lowercased().contains(searchText.lowercased()) || $0.date.lowercased().contains(searchText.lowercased()) }
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
                        Text("PAST SESSIONS").font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                }
                
                    HStack {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                            .foregroundColor(.sdMuted)
                        TextField("Filter specific date (e.g., Apr 10)", text: $searchText)
                            .foregroundColor(.white)
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
                
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
                                        Label(session.duration, systemImage: "timer")
                                            .font(.caption).bold()
                                            .foregroundColor(.sdPrimary)
                                            .padding(6)
                                            .padding(.horizontal, 4)
                                            .background(Color.sdPrimary.opacity(0.1))
                                            .cornerRadius(8)
                                        
                                        if session.alerts > 0 {
                                            Label("\(session.alerts)", systemImage: "exclamationmark.triangle")
                                                .font(.caption).bold()
                                                .foregroundColor(.sdRed)
                                                .padding(6)
                                                .padding(.horizontal, 4)
                                                .background(Color.sdRed.opacity(0.1))
                                                .cornerRadius(8)
                                        }
                                        
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
        }
        .navigationBarHidden(true)
    }
}

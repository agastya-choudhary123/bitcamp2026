import SwiftUI
import AVKit

struct ReplaysView: View {
    @Environment(\.presentationMode) var presentationMode
    @AppStorage("activeUsername") private var activeUsername = ""
    
    @State private var replays: [NetworkManager.ReplayModel] = []
    @State private var isLoading = false
    @State private var selectedVideoURL: URL? = nil
    @State private var isShowingPlayer = false
    
    var sortedReplays: [NetworkManager.ReplayModel] {
        replays.sorted {
            ($0.sessionEnd ?? $0.sessionStart ?? "") > ($1.sessionEnd ?? $1.sessionStart ?? "")
        }
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
                        Text("Incident Replays").font(.title2).bold()
                        Text("CLOUD HOSTED SAFETY CLIPS").font(.caption2).kerning(1).foregroundColor(.sdMuted)
                    }
                    Spacer()
                    Text("\(sortedReplays.count) clips").font(.caption).foregroundColor(.sdMuted)
                }
                
                if isLoading {
                    Spacer()
                    HStack { Spacer(); ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)); Spacer() }
                    Spacer()
                } else if sortedReplays.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "film.slash").font(.system(size: 40)).foregroundColor(.sdMuted)
                        Text("No incident clips yet").foregroundColor(.sdMuted)
                        Text("Clips are recorded automatically when an anomaly is detected.").font(.caption).foregroundColor(.sdMuted).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 14) {
                            ForEach(sortedReplays) { session in
                                ReplayCard(session: session) {
                                    if let urlStr = session.videoUrl, let url = URL(string: urlStr) {
                                        selectedVideoURL = url
                                        isShowingPlayer = true
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
        .sheet(isPresented: $isShowingPlayer) {
            if let url = selectedVideoURL {
                VideoPlayerSheet(url: url)
            }
        }
    }
    
    func loadReplays() {
        guard !activeUsername.isEmpty else { return }
        isLoading = true
        NetworkManager.shared.request(endpoint: "/replay/\(activeUsername)") { (result: Result<[NetworkManager.ReplayModel], Error>) in
            isLoading = false
            switch result {
            case .success(let fetched): replays = fetched
            case .failure(let err): print("Replays failed: \(err)")
            }
        }
    }
}

struct ReplayCard: View {
    let session: NetworkManager.ReplayModel
    let onPlay: () -> Void
    
    var formattedTime: String {
        let raw = session.sessionEnd ?? session.sessionStart ?? ""
        // Parse ISO8601 string
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let date = isoFormatter.date(from: raw) {
            let display = DateFormatter()
            display.dateStyle = .medium
            display.timeStyle = .short
            return display.string(from: date)
        }
        // Fallback: show raw date prefix
        return String(raw.prefix(16)).replacingOccurrences(of: "T", with: " ")
    }
    
    var hasVideo: Bool {
        if let url = session.videoUrl { return !url.isEmpty } else { return false }
    }
    
    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Incident Clip")
                            .font(.headline)
                            .foregroundColor(.sdForeground)
                        HStack(spacing: 4) {
                            Image(systemName: "clock").font(.caption2)
                            Text(formattedTime).font(.caption).foregroundColor(.sdMuted)
                        }
                    }
                    Spacer()
                    Label("ANOMALY", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption2).bold()
                        .foregroundColor(.sdRed)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Color.sdRed.opacity(0.15))
                        .cornerRadius(8)
                }
                
                Divider().background(Color.sdCardBorder)
                
                HStack {
                    Label(session.driverName, systemImage: "person.fill")
                        .font(.caption).foregroundColor(.sdMuted)
                    Spacer()
                    if hasVideo {
                        Button(action: onPlay) {
                            HStack(spacing: 6) {
                                Image(systemName: "play.fill").font(.caption)
                                Text("Play Clip").font(.caption).bold()
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                            .background(Color.sdPrimary)
                            .cornerRadius(10)
                        }
                    } else {
                        Text("Processing...")
                            .font(.caption).foregroundColor(.sdMuted)
                    }
                }
            }
        }
    }
}

struct VideoPlayerSheet: View {
    let url: URL
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack {
                HStack {
                    Spacer()
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    .padding()
                }
                VideoPlayer(player: AVPlayer(url: url))
                    .ignoresSafeArea(edges: .bottom)
            }
        }
    }
}

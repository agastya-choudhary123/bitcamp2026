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
                        Text("Safety Replays")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(.sdForeground)
                        Text("SECURE CLOUD INCIDENT CLIPS")
                            .font(.system(size: 10, weight: .black))
                            .kerning(1)
                            .foregroundColor(.sdPrimary)
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 24)
                
                if isLoading {
                    Spacer()
                    HStack { 
                        Spacer()
                        VStack(spacing: 16) {
                            ProgressView()
                                .tint(.sdPrimary)
                            Text("Fetching clips...")
                                .font(.caption)
                                .foregroundColor(.sdMuted)
                        }
                        Spacer() 
                    }
                    Spacer()
                } else if sortedReplays.isEmpty {
                    Spacer()
                    VStack(spacing: 20) {
                        ZStack {
                            Circle()
                                .fill(Color.sdPrimary.opacity(0.05))
                                .frame(width: 100, height: 100)
                            Image(systemName: "video.slash")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.sdSubtle)
                        }
                        VStack(spacing: 8) {
                            Text("No history yet")
                                .font(.headline)
                                .foregroundColor(.sdForeground)
                            Text("Incident clips are recorded automatically during anomalous behavior.")
                                .font(.system(size: 14))
                                .foregroundColor(.sdMuted)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 40)
                                .lineSpacing(4)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    Spacer()
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 16) {
                            ForEach(sortedReplays) { session in
                                ReplayCard(session: session) {
                                    if let urlStr = session.videoUrl, let url = URL(string: urlStr) {
                                        selectedVideoURL = url
                                        isShowingPlayer = true
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
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
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let fetched): replays = fetched
                case .failure(let err): print("Replays failed: \(err)")
                }
            }
        }
    }
}

struct ReplayCard: View {
    let session: NetworkManager.ReplayModel
    let onPlay: () -> Void
    
    var formattedTime: String {
        let raw = session.sessionEnd ?? session.sessionStart ?? ""
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let date = isoFormatter.date(from: raw) {
            let display = DateFormatter()
            display.dateStyle = .medium
            display.timeStyle = .short
            return display.string(from: date)
        }
        return String(raw.prefix(16)).replacingOccurrences(of: "T", with: " ")
    }
    
    var hasVideo: Bool {
        if let url = session.videoUrl { return !url.isEmpty } else { return false }
    }
    
    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Anomalous Event")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.sdForeground)
                        HStack(spacing: 4) {
                            Image(systemName: "clock")
                                .font(.system(size: 10))
                            Text(formattedTime)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.sdMuted)
                        }
                    }
                    Spacer()
                    Text("ALERT")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.sdRed)
                        .clipShape(Capsule())
                }
                
                Divider()
                    .background(Color.sdCardBorder)
                
                HStack {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.sdPrimary.opacity(0.1))
                            .frame(width: 24, height: 24)
                            .overlay(Image(systemName: "person.fill").font(.system(size: 10)).foregroundColor(.sdPrimary))
                        Text(session.driverName)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.sdMuted)
                    }
                    Spacer()
                    if hasVideo {
                        Button(action: onPlay) {
                            HStack(spacing: 6) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 10))
                                Text("WATCH")
                                    .font(.system(size: 11, weight: .black))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color.sdPrimary)
                            .cornerRadius(10)
                            .shadow(color: .sdPrimary.opacity(0.3), radius: 6, y: 3)
                        }
                    } else {
                        Text("Syncing...")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.sdSubtle)
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
                    .onAppear {
                        // iOS 16+ player can be tricky in sheets; Ensure it plays
                    }
            }
        }
    }
}

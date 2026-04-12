import AVFoundation
import AudioToolbox

class AlertSoundManager {
    static let shared = AlertSoundManager()

    private var microsleepPlayer: AVAudioPlayer?
    private var proximityPlayer: AVAudioPlayer?
    private var isMicrosleepPlaying = false
    private var isProximityPlaying = false

    private init() {
        setupAudioSession()
        preload()
    }

    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers, .duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[Alert] Audio session setup failed: \(error)")
        }
    }

    private func preload() {
        // Use system alert sounds as fallback — no bundled file needed
        // For microsleep: a sharp repeated beep pattern
        // For proximity: a fast warning tone
        // We generate tones programmatically via system sounds
    }

    /// Play a loud repeating alarm for microsleep detection
    func playMicrosleepAlarm() {
        guard !isMicrosleepPlaying else { return }
        isMicrosleepPlaying = true
        repeatSystemSound(id: 1005, times: 4, interval: 0.4) {
            self.isMicrosleepPlaying = false
        }
    }

    func stopMicrosleepAlarm() {
        isMicrosleepPlaying = false
    }

    /// Play a short sharp warning for proximity alert
    func playProximityWarning() {
        guard !isProximityPlaying else { return }
        isProximityPlaying = true
        repeatSystemSound(id: 1073, times: 3, interval: 0.25) {
            self.isProximityPlaying = false
        }
    }

    private func repeatSystemSound(id: SystemSoundID, times: Int, interval: Double, completion: @escaping () -> Void) {
        var remaining = times
        func playNext() {
            guard remaining > 0 else { completion(); return }
            remaining -= 1
            AudioServicesPlaySystemSound(id)
            DispatchQueue.main.asyncAfter(deadline: .now() + interval) { playNext() }
        }
        playNext()
    }
}

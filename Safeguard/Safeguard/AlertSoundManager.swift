import AVFoundation

/// Plays loud programmatic tones via AVAudioEngine (sine-wave oscillator).
/// Overrides silent switch (.playback category) and ducks other audio.
/// Each alarm is independently stoppable at any time.
class AlertSoundManager {
    static let shared = AlertSoundManager()

    // MARK: - Microsleep alarm (880 Hz A5 — sharp, jarring)
    private let msEngine   = AVAudioEngine()
    private let msNode     = AVAudioPlayerNode()
    private var msPlaying  = false
    private var msTimer:   DispatchWorkItem?

    // MARK: - Collision alarm (1400 Hz — high urgent warning)
    private let colEngine  = AVAudioEngine()
    private let colNode    = AVAudioPlayerNode()
    private var colPlaying = false
    private var colTimer:  DispatchWorkItem?

    private init() {
        setupSession()
        connect(engine: msEngine,  node: msNode)
        connect(engine: colEngine, node: colNode)
    }

    // MARK: - Public API

    func playMicrosleepAlarm() {
        guard !msPlaying else { return }
        msPlaying = true
        pumpMicrosleep()
    }

    func stopMicrosleepAlarm() {
        msTimer?.cancel(); msTimer = nil
        msPlaying = false
        msNode.stop()
    }

    func playCollisionWarning() {
        guard !colPlaying else { return }
        colPlaying = true
        pumpCollision()
    }

    func stopCollisionWarning() {
        colTimer?.cancel(); colTimer = nil
        colPlaying = false
        colNode.stop()
    }

    func stopAll() {
        stopMicrosleepAlarm()
        stopCollisionWarning()
    }

    // MARK: - Tone loops (no inout — each method refers to its own stored properties)

    private func pumpMicrosleep() {
        guard msPlaying else { return }
        schedule(node: msNode, buffer: tone(hz: 880, dur: 0.28, amp: 1.0))
        let wi = DispatchWorkItem { [weak self] in self?.pumpMicrosleep() }
        msTimer = wi
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.42, execute: wi) // 280ms tone + 140ms gap
    }

    private func pumpCollision() {
        guard colPlaying else { return }
        schedule(node: colNode, buffer: tone(hz: 1400, dur: 0.18, amp: 1.0))
        let wi = DispatchWorkItem { [weak self] in self?.pumpCollision() }
        colTimer = wi
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.28, execute: wi) // 180ms tone + 100ms gap
    }

    // MARK: - Helpers

    private func schedule(node: AVAudioPlayerNode, buffer: AVAudioPCMBuffer) {
        node.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { _ in }
        if !node.isPlaying { node.play() }
    }

    private func tone(hz: Double, dur: Double, amp: Float) -> AVAudioPCMBuffer {
        let sr: Double = 44100
        let fmt = AVAudioFormat(standardFormatWithSampleRate: sr, channels: 1)!
        let frames = AVAudioFrameCount(sr * dur)
        let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: frames)!
        buf.frameLength = frames
        let data = buf.floatChannelData![0]
        let w = Float(2 * Double.pi * hz / sr)
        let ramp = min(Int(sr * 0.005), Int(frames)) // 5 ms ramp to kill clicks
        for i in 0..<Int(frames) {
            let env: Float = i < ramp ? Float(i) / Float(ramp)
                           : i > Int(frames) - ramp ? Float(Int(frames) - i) / Float(ramp)
                           : 1.0
            data[i] = amp * env * sin(w * Float(i))
        }
        return buf
    }

    private func connect(engine: AVAudioEngine, node: AVAudioPlayerNode) {
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: nil)
        engine.mainMixerNode.outputVolume = 1.0
        do { try engine.start() } catch { print("[Alert] Engine start: \(error)") }
    }

    private func setupSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback, mode: .default, options: [.duckOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch { print("[Alert] Session: \(error)") }
    }
}

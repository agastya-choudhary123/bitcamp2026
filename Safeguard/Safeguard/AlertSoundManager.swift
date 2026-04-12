import AVFoundation
import AudioToolbox

/// Generates loud programmatic tones via AVAudioEngine (sine wave oscillator).
/// Bypasses ringer/media volume — plays at maximum amplitude through the speaker.
class AlertSoundManager {
    static let shared = AlertSoundManager()

    // MARK: - Engines (separate so they can run independently)
    private let microsleepEngine = AVAudioEngine()
    private let proximityEngine  = AVAudioEngine()
    private let microsleepNode   = AVAudioPlayerNode()
    private let proximityNode    = AVAudioPlayerNode()

    private var isMicrosleepPlaying = false
    private var isProximityPlaying  = false

    // Tracks scheduled repeat work so we can cancel it
    private var microsleepWorkItem: DispatchWorkItem?
    private var proximityWorkItem:  DispatchWorkItem?

    private init() {
        setupSession()
        attach(engine: microsleepEngine, node: microsleepNode)
        attach(engine: proximityEngine,  node: proximityNode)
    }

    private func setupSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            // .playback overrides silent switch; .duckOthers lowers other audio
            try session.setCategory(.playback, mode: .default, options: .duckOthers)
            try session.setActive(true)
        } catch {
            print("[Alert] Session setup failed: \(error)")
        }
    }

    private func attach(engine: AVAudioEngine, node: AVAudioPlayerNode) {
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: nil)
        engine.mainMixerNode.outputVolume = 1.0
        do { try engine.start() } catch { print("[Alert] Engine start failed: \(error)") }
    }

    // MARK: - Public API

    /// Plays a sharp repeating alarm until stopMicrosleepAlarm() is called.
    func playMicrosleepAlarm() {
        guard !isMicrosleepPlaying else { return }
        isMicrosleepPlaying = true
        scheduleToneLoop(
            node: microsleepNode,
            engine: microsleepEngine,
            frequency: 880,   // A5 — sharp, attention-grabbing
            amplitude: 1.0,
            toneDuration: 0.3,
            silenceDuration: 0.15,
            workItemRef: &microsleepWorkItem,
            isPlayingFlag: \.isMicrosleepPlaying
        )
    }

    func stopMicrosleepAlarm() {
        guard isMicrosleepPlaying else { return }
        isMicrosleepPlaying = false
        microsleepWorkItem?.cancel()
        microsleepWorkItem = nil
        microsleepNode.stop()
    }

    /// Plays a fast rising-pitch warning while hazard is active.
    func playProximityWarning() {
        guard !isProximityPlaying else { return }
        isProximityPlaying = true
        scheduleToneLoop(
            node: proximityNode,
            engine: proximityEngine,
            frequency: 1200,  // High-pitched urgent warning
            amplitude: 1.0,
            toneDuration: 0.2,
            silenceDuration: 0.1,
            workItemRef: &proximityWorkItem,
            isPlayingFlag: \.isProximityPlaying
        )
    }

    func stopProximityWarning() {
        guard isProximityPlaying else { return }
        isProximityPlaying = false
        proximityWorkItem?.cancel()
        proximityWorkItem = nil
        proximityNode.stop()
    }

    // MARK: - Tone Generation

    private func scheduleToneLoop(
        node: AVAudioPlayerNode,
        engine: AVAudioEngine,
        frequency: Double,
        amplitude: Float,
        toneDuration: Double,
        silenceDuration: Double,
        workItemRef: inout DispatchWorkItem?,
        isPlayingFlag: KeyPath<AlertSoundManager, Bool>
    ) {
        guard self[keyPath: isPlayingFlag] else { return }

        let buffer = makeToneBuffer(frequency: frequency, amplitude: amplitude, duration: toneDuration)
        node.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { _ in }
        if !node.isPlaying { node.play() }

        let item = DispatchWorkItem { [weak self] in
            guard let self, self[keyPath: isPlayingFlag] else { return }
            self.scheduleToneLoop(
                node: node, engine: engine,
                frequency: frequency, amplitude: amplitude,
                toneDuration: toneDuration, silenceDuration: silenceDuration,
                workItemRef: &workItemRef, isPlayingFlag: isPlayingFlag
            )
        }
        workItemRef = item
        DispatchQueue.main.asyncAfter(deadline: .now() + toneDuration + silenceDuration, execute: item)
    }

    private func makeToneBuffer(frequency: Double, amplitude: Float, duration: Double) -> AVAudioPCMBuffer {
        let sampleRate: Double = 44100
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount

        let data = buffer.floatChannelData![0]
        let angularFreq = Float(2 * Double.pi * frequency / sampleRate)
        for i in 0..<Int(frameCount) {
            // Sine wave with a short attack/release envelope to avoid clicks
            let env = envelope(i: i, total: Int(frameCount))
            data[i] = amplitude * env * sin(angularFreq * Float(i))
        }
        return buffer
    }

    /// Simple linear attack (5ms) + sustain + release (5ms) to prevent audible clicks
    private func envelope(i: Int, total: Int) -> Float {
        let attack = min(i, 220)          // ~5ms at 44100 Hz
        let release = min(total - i, 220)
        return Float(min(attack, release)) / 220.0
    }
}

import AVFoundation

/// Generates a single, loud programmatic beep via AVAudioEngine (sine-wave oscillator).
/// Bypasses ringer/media volume — plays at high amplitude through the speaker.
class AlertSoundManager {
    static let shared = AlertSoundManager()

    private let engine = AVAudioEngine()
    private let node   = AVAudioPlayerNode()
    
    private var isPlayingAlarm = false
    private var alarmTimer: DispatchWorkItem?

    private init() {
        setupSession()
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: nil)
        engine.mainMixerNode.outputVolume = 1.0
        do {
            try engine.start()
        } catch {
            print("[Alert] Engine start failed: \(error)")
        }
    }

    private func setupSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
            try session.setActive(true)
        } catch {
            print("[Alert] Session setup failed: \(error)")
        }
    }

    /// Starts a persistent, high-intensity pulsing alarm (2800Hz Square Wave)
    func startMicrosleepAlarm() {
        guard !isPlayingAlarm else { return }
        isPlayingAlarm = true
        runAlarmLoop()
    }

    /// Stops the persistent alarm immediately
    func stopMicrosleepAlarm() {
        isPlayingAlarm = false
        alarmTimer?.cancel()
        alarmTimer = nil
        node.stop()
    }

    private func runAlarmLoop() {
        guard isPlayingAlarm else { return }
        
        // Jarring 2800Hz Square Wave Pulse: 400ms tone + 200ms gap
        let buffer = makeToneBuffer(frequency: 2800, amplitude: 1.0, duration: 0.4)
        node.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { _ in }
        if !node.isPlaying { node.play() }
        
        let wi = DispatchWorkItem { [weak self] in
            self?.runAlarmLoop()
        }
        alarmTimer = wi
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6, execute: wi)
    }

    private func makeToneBuffer(frequency: Double, amplitude: Float, duration: Double) -> AVAudioPCMBuffer {
        let sampleRate: Double = 44100
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount

        let angularFreq = Float(2 * Double.pi * frequency / sampleRate)
        let rampFrames = 220
        
        for ch in 0..<2 {
            let data = buffer.floatChannelData![ch]
            for i in 0..<Int(frameCount) {
                var env: Float = 1.0
                if i < rampFrames {
                    env = Float(i) / Float(rampFrames)
                } else if i > Int(frameCount) - rampFrames {
                    env = Float(Int(frameCount) - i) / Float(rampFrames)
                }
                let squareValue: Float = sin(angularFreq * Float(i)) >= 0 ? 1.0 : -1.0
                data[i] = amplitude * env * squareValue
            }
        }
        return buffer
    }
}

const CLOSURE_THRESHOLD = 0.22;
const YAWN_THRESHOLD    = 0.50; // MAR above this = yawn event
const PERCLOS_WINDOW_MS = 30000; // 30 seconds
const YAWN_WINDOW_MS    = 300000; // 5 minutes

export class TemporalSmoother {
    constructor() {
        this.history = []; // { timestamp, ear, closed }

        // Eye closure tracking
        this.currentClosureStart = null;
        this.blinkTimestamps = [];    // timestamps of completed blinks
        this.blinkDurations  = [];    // durations of completed blinks (ms)

        // Head pose tracking
        this.currentDistractionStart = null;
        this.lastPitch = null;
        this.lastPitchTime = null;
        this.headJerkVelocity = 0;

        // Nod pattern tracking (slow repetitive nods = drowsy/impaired)
        this.nodEvents = []; // timestamps of nod peaks

        // Face missing tracking
        this.currentFaceMissingStart = null;

        // Gaze fixation tracking
        this.currentGazeDeviationStart = null;

        // Yawn tracking
        this.yawnTimestamps = [];   // timestamps of completed yawn events
        this.isYawning = false;

        // Phone detection tracking
        this.currentPhoneDetectedStart = null;

        // Progressive fatigue baseline
        this.awakeBaselineEAR = null;
        this.awakeEARCounter = 0;
        this.awakeEARAccumulator = 0;
    }

    // ─── EAR / PERCLOS ───────────────────────────────────────────────────────

    pushEAR(timestamp, ear) {
        const closed = ear < CLOSURE_THRESHOLD;
        this.history.push({ timestamp, ear, closed });

        // Slide 30s window
        const cutoff = timestamp - PERCLOS_WINDOW_MS;
        while (this.history.length > 0 && this.history[0].timestamp < cutoff) {
            this.history.shift();
        }

        // Blink / microsleep event tracking
        if (closed) {
            if (!this.currentClosureStart) this.currentClosureStart = timestamp;
        } else {
            if (this.currentClosureStart) {
                const duration = timestamp - this.currentClosureStart;
                if (duration < 800) {
                    // Normal blink
                    this.blinkTimestamps.push(timestamp);
                    this.blinkDurations.push(duration);
                }
                this.currentClosureStart = null;
            }
        }

        // Clean blink history older than 60s
        const blinkCutoff = timestamp - 60000;
        while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < blinkCutoff) {
            this.blinkTimestamps.shift();
            this.blinkDurations.shift();
        }

        // Progressive baseline (first ~50s of open-eye frames)
        if (this.awakeEARCounter < 1500 && !closed) {
            this.awakeEARAccumulator += ear;
            this.awakeEARCounter++;
            if (this.awakeEARCounter === 1500) {
                this.awakeBaselineEAR = this.awakeEARAccumulator / 1500;
                console.log(`[CV Engine] EAR Baseline: ${this.awakeBaselineEAR.toFixed(3)}`);
            }
        }
    }

    getPERCLOS() {
        if (this.history.length === 0) return 0;
        const closed = this.history.filter(r => r.closed).length;
        return closed / this.history.length;
    }

    getEyeClosureDurationMs(timestamp) {
        return this.currentClosureStart ? (timestamp - this.currentClosureStart) : 0;
    }

    getBlinkRatePerMinute() {
        return this.blinkTimestamps.length; // window already capped at 60s
    }

    getAvgBlinkDurationMs() {
        if (this.blinkDurations.length === 0) return 0;
        return this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length;
    }

    getProgressiveFatigueRatio() {
        if (!this.awakeBaselineEAR || this.history.length === 0) return 1.0;
        const avg = this.history.reduce((s, r) => s + r.ear, 0) / this.history.length;
        return avg / this.awakeBaselineEAR;
    }

    // ─── HEAD POSE ───────────────────────────────────────────────────────────

    pushHeadPose(timestamp, pitch, yaw) {
        // Head jerk velocity (nod speed)
        if (this.lastPitch !== null && this.lastPitchTime !== null) {
            const dt = (timestamp - this.lastPitchTime) / 1000;
            if (dt > 0) {
                const velocity = Math.abs(pitch - this.lastPitch) / dt;
                this.headJerkVelocity = (this.headJerkVelocity * 0.7) + (velocity * 0.3);
            }
        }

        // Nod pattern: slow downward snap (pitch increases quickly then returns)
        if (this.lastPitch !== null) {
            const delta = pitch - this.lastPitch;
            if (delta > 8) { // Significant downward nod
                this.nodEvents.push(timestamp);
            }
        }
        // Keep nod events within 2 minutes
        const nodCutoff = timestamp - 120000;
        while (this.nodEvents.length > 0 && this.nodEvents[0] < nodCutoff) this.nodEvents.shift();

        this.lastPitch = pitch;
        this.lastPitchTime = timestamp;

        const isDistracted = Math.abs(yaw) > 15 || Math.abs(pitch) > 15;
        if (isDistracted) {
            if (!this.currentDistractionStart) this.currentDistractionStart = timestamp;
        } else {
            this.currentDistractionStart = null;
        }
    }

    getDistractionDurationMs(timestamp) {
        return this.currentDistractionStart ? (timestamp - this.currentDistractionStart) : 0;
    }

    getNodFrequency() {
        return this.nodEvents.length; // nods in last 2 minutes
    }

    // ─── FACE DETECTION ──────────────────────────────────────────────────────

    pushFaceDetected(timestamp, isDetected) {
        if (!isDetected) {
            if (!this.currentFaceMissingStart) this.currentFaceMissingStart = timestamp;
        } else {
            this.currentFaceMissingStart = null;
        }
    }

    getFaceMissingDurationMs(timestamp) {
        return this.currentFaceMissingStart ? (timestamp - this.currentFaceMissingStart) : 0;
    }

    // ─── GAZE FIXATION ───────────────────────────────────────────────────────

    pushGaze(timestamp, gazeRatio) {
        const isDeviated = gazeRatio < 0.35 || gazeRatio > 0.65;
        if (isDeviated) {
            if (!this.currentGazeDeviationStart) this.currentGazeDeviationStart = timestamp;
        } else {
            this.currentGazeDeviationStart = null;
        }
    }

    getGazeFixationDurationMs(timestamp) {
        return this.currentGazeDeviationStart ? (timestamp - this.currentGazeDeviationStart) : 0;
    }

    // ─── YAWN TRACKING ───────────────────────────────────────────────────────

    pushMAR(timestamp, mar) {
        if (mar > YAWN_THRESHOLD) {
            if (!this.isYawning) {
                this.isYawning = true;
                this.yawnTimestamps.push(timestamp);
                // Slide 5-minute window
                const cutoff = timestamp - YAWN_WINDOW_MS;
                while (this.yawnTimestamps.length > 0 && this.yawnTimestamps[0] < cutoff) {
                    this.yawnTimestamps.shift();
                }
            }
        } else {
            this.isYawning = false;
        }
    }

    getYawnCountPer5Min() {
        return this.yawnTimestamps.length;
    }

    // ─── PHONE DETECTION ─────────────────────────────────────────────────────

    pushPhoneDetected(timestamp, isDetected) {
        if (isDetected) {
            if (!this.currentPhoneDetectedStart) this.currentPhoneDetectedStart = timestamp;
        } else {
            this.currentPhoneDetectedStart = null;
        }
    }

    getPhoneDetectedDurationMs(timestamp) {
        return this.currentPhoneDetectedStart ? (timestamp - this.currentPhoneDetectedStart) : 0;
    }
}

// Singleton instance
export const drowsinessSmoother = new TemporalSmoother();

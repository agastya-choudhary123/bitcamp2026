const CLOSURE_THRESHOLD = 0.22;
const YAWN_THRESHOLD    = 0.50;
const PERCLOS_WINDOW_MS = 30000;
const YAWN_WINDOW_MS    = 300000;
const NOD_WINDOW_MS     = 120000;
const ENTROPY_BINS      = 8;

export class TemporalSmoother {
    constructor() {
        // ── EAR / PERCLOS ─────────────────────────────────────────────────
        this.history = []; // { timestamp, ear, closed }
        this.currentClosureStart = null;

        // Blink tracking
        this.blinkTimestamps  = [];
        this.blinkDurations   = [];
        this.blinkIntervals   = [];
        this.lastBlinkEnd     = null;

        // Slow blink (deliberate fight-sleep pattern: closure > 200ms but < 1500ms)
        this.slowBlinkCount    = 0;
        this.slowBlinkTs       = [];

        // Eye rub history (from getEyeRubSignal)
        this.eyeRubSignalHistory = []; // rolling 30-sample buffer of rub confidence
        this.eyeRubEventTs       = []; // timestamps of confirmed rub events (signal > 0.5 held 3+ frames)
        this.eyeRubHeldFrames    = 0;

        // Progressive baseline
        this.awakeBaselineEAR    = null;
        this.awakeEARCounter     = 0;
        this.awakeEARAccumulator = 0;

        // ── HEAD POSE ─────────────────────────────────────────────────────
        this.lastPitch     = null;
        this.lastYaw       = null;
        this.lastRoll      = null;
        this.lastPitchTime = null;
        this.headJerkVelocity = 0;

        // Nod events
        this.nodEvents = [];

        // Attention recovery: after distraction/nod onset, when does pose return?
        this.lastDistractionOnset   = null;
        this.attentionRecoveryTimes = []; // array of recovery durations (ms)

        // Head movement entropy
        this.pitchDeltaHistory = [];
        this.yawDeltaHistory   = [];
        this.ENTROPY_WINDOW    = 60;

        // Micro-tremor
        this.landmarkJitterHistory = [];
        this.lastLandmarkSnapshot  = null;

        // Roll tracking
        this.currentRollDeviationStart = null;

        // ── DISTRACTION / FACE ────────────────────────────────────────────
        this.currentDistractionStart = null;
        this.currentFaceMissingStart = null;

        // ── GAZE ──────────────────────────────────────────────────────────
        this.currentGazeDeviationStart = null;
        this.gazeHistory = [];

        // Gaze drift repetition: track how often gaze deviates in same direction
        this.gazeLeftEvents  = []; // timestamps of left-deviation events
        this.gazeRightEvents = [];
        this.gazeDownEvents  = [];

        // ── YAWN ──────────────────────────────────────────────────────────
        this.yawnTimestamps = [];
        this.isYawning      = false;

        // ── PHONE DETECTION ───────────────────────────────────────────────
        this.currentPhoneDetectedStart = null;

        // ── FACE AREA / POSTURE ───────────────────────────────────────────
        this.faceAreaHistory    = [];
        this.postureLeanHistory = [];
    }

    // ─── EAR / PERCLOS ────────────────────────────────────────────────────────

    pushEAR(timestamp, ear) {
        const closed = ear < CLOSURE_THRESHOLD;
        this.history.push({ timestamp, ear, closed });
        const cutoff = timestamp - PERCLOS_WINDOW_MS;
        while (this.history.length > 0 && this.history[0].timestamp < cutoff) this.history.shift();

        if (closed) {
            if (!this.currentClosureStart) this.currentClosureStart = timestamp;
        } else {
            if (this.currentClosureStart) {
                const duration = timestamp - this.currentClosureStart;
                if (duration >= 8 && duration < 1500) {
                    // Track blink duration and intervals
                    this.blinkDurations.push(duration);
                    this.blinkTimestamps.push(timestamp);
                    if (this.lastBlinkEnd !== null) {
                        this.blinkIntervals.push(timestamp - this.lastBlinkEnd);
                        if (this.blinkIntervals.length > 20) this.blinkIntervals.shift();
                    }
                    this.lastBlinkEnd = timestamp;

                    // Slow blink detection: > 200ms closure, eyes were genuinely fighting closure
                    if (duration > 200) {
                        this.slowBlinkTs.push(timestamp);
                        const slowCutoff = timestamp - 120000; // 2 min window
                        while (this.slowBlinkTs.length > 0 && this.slowBlinkTs[0] < slowCutoff) this.slowBlinkTs.shift();
                    }
                }
                this.currentClosureStart = null;
            }
        }

        // Clean blink history (60s window)
        const blinkCutoff = timestamp - 60000;
        while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < blinkCutoff) {
            this.blinkTimestamps.shift();
            this.blinkDurations.shift();
        }

        // Progressive baseline
        if (this.awakeEARCounter < 1500 && !closed) {
            this.awakeEARAccumulator += ear;
            this.awakeEARCounter++;
            if (this.awakeEARCounter === 1500) {
                this.awakeBaselineEAR = this.awakeEARAccumulator / 1500;
                console.log(`[CV Engine] EAR Baseline: ${this.awakeBaselineEAR.toFixed(3)}`);
            }
        }
    }

    /**
     * Eye rub detection: push per-frame rub signal from getEyeRubSignal().
     * A "confirmed rub event" requires signal > 0.5 for at least 3 consecutive frames.
     */
    pushEyeRubSignal(timestamp, signal) {
        if (signal > 0.5) {
            this.eyeRubHeldFrames++;
            if (this.eyeRubHeldFrames === 3) {
                // Confirmed rub event
                this.eyeRubEventTs.push(timestamp);
                const cutoff = timestamp - 120000; // 2 min window
                while (this.eyeRubEventTs.length > 0 && this.eyeRubEventTs[0] < cutoff) this.eyeRubEventTs.shift();
            }
        } else {
            this.eyeRubHeldFrames = 0;
        }
    }

    getEyeRubCount() {
        return this.eyeRubEventTs.length; // Confirmed rub events in last 2 min
    }

    getSlowBlinkRate() {
        return this.slowBlinkTs.length; // Slow blinks in last 2 min
    }

    getPERCLOS() {
        if (this.history.length === 0) return 0;
        return this.history.filter(r => r.closed).length / this.history.length;
    }

    getEyeClosureDurationMs(timestamp) {
        return this.currentClosureStart ? (timestamp - this.currentClosureStart) : 0;
    }

    getBlinkRatePerMinute() {
        return this.blinkTimestamps.length;
    }

    getAvgBlinkDurationMs() {
        if (this.blinkDurations.length === 0) return 0;
        return this.blinkDurations.reduce((a, b) => a + b, 0) / this.blinkDurations.length;
    }

    getBlinkIntervalVariance() {
        const n = this.blinkIntervals.length;
        if (n < 3) return 0;
        const mean = this.blinkIntervals.reduce((a, b) => a + b, 0) / n;
        return Math.sqrt(this.blinkIntervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    }

    getProgressiveFatigueRatio() {
        if (!this.awakeBaselineEAR || this.history.length === 0) return 1.0;
        const avg = this.history.reduce((s, r) => s + r.ear, 0) / this.history.length;
        return avg / this.awakeBaselineEAR;
    }

    // ─── HEAD POSE ────────────────────────────────────────────────────────────

    pushHeadPose(timestamp, pitch, yaw, roll) {
        // Jerk velocity
        if (this.lastPitch !== null && this.lastPitchTime !== null) {
            const dt = (timestamp - this.lastPitchTime) / 1000;
            if (dt > 0) {
                const v = Math.abs(pitch - this.lastPitch) / dt;
                this.headJerkVelocity = (this.headJerkVelocity * 0.7) + (v * 0.3);
            }
        }

        // Nod events
        if (this.lastPitch !== null && (pitch - this.lastPitch) > 8) this.nodEvents.push(timestamp);
        const nodCutoff = timestamp - NOD_WINDOW_MS;
        while (this.nodEvents.length > 0 && this.nodEvents[0] < nodCutoff) this.nodEvents.shift();

        // Head movement entropy
        if (this.lastPitch !== null && this.lastYaw !== null) {
            this.pitchDeltaHistory.push(Math.abs(pitch - this.lastPitch));
            this.yawDeltaHistory.push(Math.abs(yaw   - this.lastYaw));
            if (this.pitchDeltaHistory.length > this.ENTROPY_WINDOW) this.pitchDeltaHistory.shift();
            if (this.yawDeltaHistory.length   > this.ENTROPY_WINDOW) this.yawDeltaHistory.shift();
        }

        // Roll deviation
        const isRolled = roll !== null && Math.abs(roll) > 12;
        if (isRolled) { if (!this.currentRollDeviationStart) this.currentRollDeviationStart = timestamp; }
        else           { this.currentRollDeviationStart = null; }

        // Distraction onset / attention recovery tracking
        const isDistracted = Math.abs(yaw) > 15 || Math.abs(pitch) > 15;
        if (isDistracted) {
            if (!this.currentDistractionStart) {
                this.currentDistractionStart = timestamp;
                this.lastDistractionOnset = timestamp;
            }
        } else {
            if (this.currentDistractionStart && this.lastDistractionOnset) {
                // Driver has recovered — record recovery time
                const recovery = timestamp - this.lastDistractionOnset;
                if (recovery < 10000) { // Cap at 10s to avoid stale events
                    this.attentionRecoveryTimes.push(recovery);
                    if (this.attentionRecoveryTimes.length > 20) this.attentionRecoveryTimes.shift();
                }
            }
            this.currentDistractionStart = null;
        }

        this.lastPitch = pitch; this.lastYaw = yaw; this.lastRoll = roll;
        this.lastPitchTime = timestamp;
    }

    getDistractionDurationMs(timestamp) {
        return this.currentDistractionStart ? (timestamp - this.currentDistractionStart) : 0;
    }

    getNodFrequency() { return this.nodEvents.length; }

    getRollDeviationMs(timestamp) {
        return this.currentRollDeviationStart ? (timestamp - this.currentRollDeviationStart) : 0;
    }

    /** Average attention recovery time in ms. Lower = driver promptly self-corrects (distracted). Higher = slow (impaired). */
    getAvgAttentionRecoveryMs() {
        const n = this.attentionRecoveryTimes.length;
        if (n === 0) return 0;
        return this.attentionRecoveryTimes.reduce((a, b) => a + b, 0) / n;
    }

    getHeadMovementEntropy() {
        const combined = [...this.pitchDeltaHistory, ...this.yawDeltaHistory];
        if (combined.length < 10) return 0;
        const maxVal = Math.max(...combined) || 1;
        const counts = new Array(ENTROPY_BINS).fill(0);
        for (const v of combined) counts[Math.min(Math.floor(v / (maxVal / ENTROPY_BINS)), ENTROPY_BINS - 1)]++;
        const total = combined.length;
        let entropy = 0;
        for (const c of counts) { if (c > 0) { const p = c / total; entropy -= p * Math.log2(p); } }
        return entropy;
    }

    // ─── MICRO-TREMOR ─────────────────────────────────────────────────────────

    pushLandmarkSnapshot(landmarks) {
        if (!landmarks || landmarks.length === 0) return;
        const key = [1, 33, 263, 61, 291, 10, 152].map(i => ({ x: landmarks[i].x, y: landmarks[i].y }));
        if (this.lastLandmarkSnapshot) {
            let sumSq = 0;
            for (let i = 0; i < key.length; i++) {
                const dx = key[i].x - this.lastLandmarkSnapshot[i].x;
                const dy = key[i].y - this.lastLandmarkSnapshot[i].y;
                sumSq += dx * dx + dy * dy;
            }
            const rms = Math.sqrt(sumSq / key.length);
            this.landmarkJitterHistory.push(rms);
            if (this.landmarkJitterHistory.length > 10) this.landmarkJitterHistory.shift();
        }
        this.lastLandmarkSnapshot = key;
    }

    getMicroTremor() {
        if (this.landmarkJitterHistory.length === 0) return 0;
        return this.landmarkJitterHistory.reduce((a, b) => a + b, 0) / this.landmarkJitterHistory.length;
    }

    // ─── FACE DETECTION ───────────────────────────────────────────────────────

    pushFaceDetected(timestamp, isDetected) {
        if (!isDetected) { if (!this.currentFaceMissingStart) this.currentFaceMissingStart = timestamp; }
        else             { this.currentFaceMissingStart = null; }
    }

    getFaceMissingDurationMs(timestamp) {
        return this.currentFaceMissingStart ? (timestamp - this.currentFaceMissingStart) : 0;
    }

    // ─── GAZE ─────────────────────────────────────────────────────────────────

    pushGaze(timestamp, gazeRatio, gazeVertical) {
        this.gazeHistory.push(gazeRatio);
        if (this.gazeHistory.length > 90) this.gazeHistory.shift();

        const isDeviated = gazeRatio < 0.35 || gazeRatio > 0.65;
        if (isDeviated) { if (!this.currentGazeDeviationStart) this.currentGazeDeviationStart = timestamp; }
        else            { this.currentGazeDeviationStart = null; }

        // Gaze drift repetition tracking (per direction)
        const cutoff = timestamp - 60000;
        if (gazeRatio < 0.35) {
            this.gazeLeftEvents.push(timestamp);
            while (this.gazeLeftEvents.length > 0 && this.gazeLeftEvents[0] < cutoff) this.gazeLeftEvents.shift();
        } else if (gazeRatio > 0.65) {
            this.gazeRightEvents.push(timestamp);
            while (this.gazeRightEvents.length > 0 && this.gazeRightEvents[0] < cutoff) this.gazeRightEvents.shift();
        }
        if (gazeVertical !== undefined && gazeVertical > 0.70) {
            this.gazeDownEvents.push(timestamp);
            while (this.gazeDownEvents.length > 0 && this.gazeDownEvents[0] < cutoff) this.gazeDownEvents.shift();
        }
    }

    getGazeFixationDurationMs(timestamp) {
        return this.currentGazeDeviationStart ? (timestamp - this.currentGazeDeviationStart) : 0;
    }

    getGazeVariance() {
        const n = this.gazeHistory.length;
        if (n < 5) return 0;
        const mean = this.gazeHistory.reduce((a, b) => a + b, 0) / n;
        return this.gazeHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    }

    /** Repetition score: max drift count in a single direction (higher = habitual distraction). */
    getGazeDriftRepetition() {
        return Math.max(this.gazeLeftEvents.length, this.gazeRightEvents.length, this.gazeDownEvents.length);
    }

    // ─── YAWN ─────────────────────────────────────────────────────────────────

    pushMAR(timestamp, mar) {
        if (mar > YAWN_THRESHOLD) {
            if (!this.isYawning) {
                this.isYawning = true;
                this.yawnTimestamps.push(timestamp);
                const cutoff = timestamp - YAWN_WINDOW_MS;
                while (this.yawnTimestamps.length > 0 && this.yawnTimestamps[0] < cutoff) this.yawnTimestamps.shift();
            }
        } else { this.isYawning = false; }
    }

    getYawnCountPer5Min() { return this.yawnTimestamps.length; }

    // ─── PHONE DETECTION ──────────────────────────────────────────────────────

    pushPhoneDetected(timestamp, isDetected) {
        if (isDetected) { if (!this.currentPhoneDetectedStart) this.currentPhoneDetectedStart = timestamp; }
        else            { this.currentPhoneDetectedStart = null; }
    }

    getPhoneDetectedDurationMs(timestamp) {
        return this.currentPhoneDetectedStart ? (timestamp - this.currentPhoneDetectedStart) : 0;
    }

    // ─── FACE AREA / POSTURE ──────────────────────────────────────────────────

    pushFaceArea(areaRatio) {
        this.faceAreaHistory.push(areaRatio);
        if (this.faceAreaHistory.length > 60) this.faceAreaHistory.shift();
    }

    getFaceAreaTrend() {
        const n = this.faceAreaHistory.length;
        if (n < 10) return 0;
        const recent = this.faceAreaHistory.slice(-10).reduce((a, b) => a + b) / 10;
        const older  = this.faceAreaHistory.slice(0, 10).reduce((a, b) => a + b) / 10;
        return recent - older;
    }

    pushPostureLean(lean) {
        this.postureLeanHistory.push(lean);
        if (this.postureLeanHistory.length > 60) this.postureLeanHistory.shift();
    }

    /** Rolling average posture lean. Sustained non-zero = persistent side lean (medical). */
    getAvgPostureLean() {
        const n = this.postureLeanHistory.length;
        if (n === 0) return 0;
        return this.postureLeanHistory.reduce((a, b) => a + b, 0) / n;
    }
}

export const drowsinessSmoother = new TemporalSmoother();

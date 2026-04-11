const CLOSURE_THRESHOLD = 0.22;
const YAWN_THRESHOLD    = 0.50;
const PERCLOS_WINDOW_MS = 30000;  // 30 seconds
const YAWN_WINDOW_MS    = 300000; // 5 minutes
const NOD_WINDOW_MS     = 120000; // 2 minutes
const ENTROPY_BINS      = 8;      // Histogram bins for head movement entropy

export class TemporalSmoother {
    constructor() {
        // ── EAR / PERCLOS ─────────────────────────────────────────────────
        this.history = []; // { timestamp, ear, closed }
        this.currentClosureStart = null;

        // Blink tracking
        this.blinkTimestamps    = []; // Timestamps of completed blinks
        this.blinkDurations     = []; // Duration (ms) of each blink
        this.blinkIntervals     = []; // Inter-blink intervals (ms)
        this.lastBlinkTimestamp = null;

        // Blink sync (per-eye closure timing)
        this.leftClosureStart  = null;
        this.rightClosureStart = null;
        this.asyncBlinkCount   = 0;   // Counter of async blink events in last 60s
        this.asyncBlinkTs      = [];  // Timestamps of async blinks

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

        // Nod pattern
        this.nodEvents = []; // Timestamps of nod peaks

        // Head movement entropy (histogram of deltas)
        this.pitchDeltaHistory = []; // Last N pitch deltas for entropy
        this.yawDeltaHistory   = []; // Last N yaw deltas for entropy
        this.ENTROPY_WINDOW    = 60; // frames

        // Micro-tremor (RMS jitter of landmarks)
        this.landmarkJitterHistory = []; // Last 10 RMS values
        this.lastLandmarkSnapshot  = null;

        // Roll tracking
        this.currentRollDeviationStart = null;

        // ── DISTRACTION / FACE MISSING ────────────────────────────────────
        this.currentDistractionStart  = null;
        this.currentFaceMissingStart  = null;

        // ── GAZE ──────────────────────────────────────────────────────────
        this.currentGazeDeviationStart = null;

        // Gaze variance (horizontal, rolling window)
        this.gazeHistory = []; // Last 90 gaze samples (~3s at 30fps)

        // ── YAWN ──────────────────────────────────────────────────────────
        this.yawnTimestamps = [];
        this.isYawning      = false;

        // ── PHONE DETECTION ───────────────────────────────────────────────
        this.currentPhoneDetectedStart = null;

        // ── FACE AREA ────────────────────────────────────────────────────
        this.faceAreaHistory = []; // Last 60 area samples for trend detection
    }

    // ─── EAR / PERCLOS ────────────────────────────────────────────────────────

    pushEAR(timestamp, ear) {
        const closed = ear < CLOSURE_THRESHOLD;
        this.history.push({ timestamp, ear, closed });

        const cutoff = timestamp - PERCLOS_WINDOW_MS;
        while (this.history.length > 0 && this.history[0].timestamp < cutoff) {
            this.history.shift();
        }

        if (closed) {
            if (!this.currentClosureStart) this.currentClosureStart = timestamp;
        } else {
            if (this.currentClosureStart) {
                const duration = timestamp - this.currentClosureStart;
                if (duration < 800) {
                    this.blinkDurations.push(duration);
                    this.blinkTimestamps.push(timestamp);
                    // Track inter-blink interval
                    if (this.lastBlinkTimestamp !== null) {
                        this.blinkIntervals.push(timestamp - this.lastBlinkTimestamp);
                        if (this.blinkIntervals.length > 20) this.blinkIntervals.shift();
                    }
                    this.lastBlinkTimestamp = timestamp;
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
     * Push per-eye EAR to detect asynchronous blinking.
     * If one eye closes 80ms+ before the other, it's an async blink event.
     */
    pushPerEyeEAR(timestamp, leftEAR, rightEAR) {
        const leftClosed  = leftEAR  < CLOSURE_THRESHOLD;
        const rightClosed = rightEAR < CLOSURE_THRESHOLD;

        if (leftClosed && !rightClosed) {
            if (!this.leftClosureStart) this.leftClosureStart = timestamp;
        } else if (rightClosed && !leftClosed) {
            if (!this.rightClosureStart) this.rightClosureStart = timestamp;
        } else {
            // Check if we had a prolonged one-sided closure (>80ms = async event)
            const leftOnlyDur  = this.leftClosureStart  ? (timestamp - this.leftClosureStart)  : 0;
            const rightOnlyDur = this.rightClosureStart ? (timestamp - this.rightClosureStart) : 0;
            if (leftOnlyDur > 80 || rightOnlyDur > 80) {
                this.asyncBlinkCount++;
                this.asyncBlinkTs.push(timestamp);
            }
            this.leftClosureStart  = null;
            this.rightClosureStart = null;
        }

        // Clean async blink history (60s window)
        const cutoff = timestamp - 60000;
        while (this.asyncBlinkTs.length > 0 && this.asyncBlinkTs[0] < cutoff) {
            this.asyncBlinkTs.shift();
        }
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

    /** Standard deviation of inter-blink intervals. High variance = intoxicated. */
    getBlinkIntervalVariance() {
        const n = this.blinkIntervals.length;
        if (n < 3) return 0;
        const mean = this.blinkIntervals.reduce((a, b) => a + b, 0) / n;
        const variance = this.blinkIntervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
        return Math.sqrt(variance); // Return std dev in ms
    }

    getAsyncBlinkCount() {
        return this.asyncBlinkTs.length; // Events in last 60s
    }

    getProgressiveFatigueRatio() {
        if (!this.awakeBaselineEAR || this.history.length === 0) return 1.0;
        const avg = this.history.reduce((s, r) => s + r.ear, 0) / this.history.length;
        return avg / this.awakeBaselineEAR;
    }

    // ─── HEAD POSE ────────────────────────────────────────────────────────────

    pushHeadPose(timestamp, pitch, yaw, roll) {
        // Head jerk velocity
        if (this.lastPitch !== null && this.lastPitchTime !== null) {
            const dt = (timestamp - this.lastPitchTime) / 1000;
            if (dt > 0) {
                const velocity = Math.abs(pitch - this.lastPitch) / dt;
                this.headJerkVelocity = (this.headJerkVelocity * 0.7) + (velocity * 0.3);
            }
        }

        // Nod events (pitch increasing = head drooping forward)
        if (this.lastPitch !== null && (pitch - this.lastPitch) > 8) {
            this.nodEvents.push(timestamp);
        }
        const nodCutoff = timestamp - NOD_WINDOW_MS;
        while (this.nodEvents.length > 0 && this.nodEvents[0] < nodCutoff) this.nodEvents.shift();

        // Head movement entropy (pitch + yaw deltas)
        if (this.lastPitch !== null && this.lastYaw !== null) {
            this.pitchDeltaHistory.push(Math.abs(pitch - this.lastPitch));
            this.yawDeltaHistory.push(Math.abs(yaw   - this.lastYaw));
            if (this.pitchDeltaHistory.length > this.ENTROPY_WINDOW) this.pitchDeltaHistory.shift();
            if (this.yawDeltaHistory.length   > this.ENTROPY_WINDOW) this.yawDeltaHistory.shift();
        }

        // Roll deviation tracking (sustained side-tilt = medical)
        const isRolled = roll !== null && Math.abs(roll) > 12;
        if (isRolled) {
            if (!this.currentRollDeviationStart) this.currentRollDeviationStart = timestamp;
        } else {
            this.currentRollDeviationStart = null;
        }

        // Distraction (yaw > 15 or pitch > 15)
        const isDistracted = Math.abs(yaw) > 15 || Math.abs(pitch) > 15;
        if (isDistracted) {
            if (!this.currentDistractionStart) this.currentDistractionStart = timestamp;
        } else {
            this.currentDistractionStart = null;
        }

        this.lastPitch     = pitch;
        this.lastYaw       = yaw;
        this.lastRoll      = roll;
        this.lastPitchTime = timestamp;
    }

    getDistractionDurationMs(timestamp) {
        return this.currentDistractionStart ? (timestamp - this.currentDistractionStart) : 0;
    }

    getNodFrequency() {
        return this.nodEvents.length;
    }

    getRollDeviationMs(timestamp) {
        return this.currentRollDeviationStart ? (timestamp - this.currentRollDeviationStart) : 0;
    }

    /**
     * Shannon entropy of head movement magnitude distribution.
     * Low entropy = regular/rhythmic (drowsy nods).
     * High entropy = chaotic/unpredictable (intoxicated).
     * Returns value in [0, log2(ENTROPY_BINS)].
     */
    getHeadMovementEntropy() {
        const combined = [...this.pitchDeltaHistory, ...this.yawDeltaHistory];
        if (combined.length < 10) return 0;

        const maxVal = Math.max(...combined) || 1;
        const binSize = maxVal / ENTROPY_BINS;
        const counts = new Array(ENTROPY_BINS).fill(0);

        for (const v of combined) {
            const bin = Math.min(Math.floor(v / binSize), ENTROPY_BINS - 1);
            counts[bin]++;
        }

        const total = combined.length;
        let entropy = 0;
        for (const c of counts) {
            if (c > 0) {
                const p = c / total;
                entropy -= p * Math.log2(p);
            }
        }
        return entropy; // Max = log2(8) = 3.0
    }

    // ─── MICRO-TREMOR ─────────────────────────────────────────────────────────

    /**
     * Push a subset of key landmark positions to detect high-frequency jitter.
     * Computes RMS displacement from last snapshot.
     * Intoxication produces detectable tremor (>= 0.002 normalized units).
     */
    pushLandmarkSnapshot(landmarks) {
        if (!landmarks || landmarks.length === 0) return;

        // Use a stable set of key landmarks for tremor detection
        const keyPoints = [1, 33, 263, 61, 291, 10, 152]; // Nose, eyes, mouth, face bounds
        const snapshot = keyPoints.map(i => ({ x: landmarks[i].x, y: landmarks[i].y }));

        if (this.lastLandmarkSnapshot) {
            let sumSq = 0;
            for (let i = 0; i < snapshot.length; i++) {
                const dx = snapshot[i].x - this.lastLandmarkSnapshot[i].x;
                const dy = snapshot[i].y - this.lastLandmarkSnapshot[i].y;
                sumSq += dx * dx + dy * dy;
            }
            const rms = Math.sqrt(sumSq / snapshot.length);
            this.landmarkJitterHistory.push(rms);
            if (this.landmarkJitterHistory.length > 10) this.landmarkJitterHistory.shift();
        }

        this.lastLandmarkSnapshot = snapshot;
    }

    /** Returns smoothed RMS jitter. Values >= 0.003 indicate notable tremor. */
    getMicroTremor() {
        if (this.landmarkJitterHistory.length === 0) return 0;
        return this.landmarkJitterHistory.reduce((a, b) => a + b, 0) / this.landmarkJitterHistory.length;
    }

    // ─── FACE MISSING ─────────────────────────────────────────────────────────

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

    // ─── GAZE ─────────────────────────────────────────────────────────────────

    pushGaze(timestamp, gazeRatio) {
        this.gazeHistory.push(gazeRatio);
        if (this.gazeHistory.length > 90) this.gazeHistory.shift();

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

    /** Variance of gaze ratio over last ~3s. High = erratic scanning (intoxicated). */
    getGazeVariance() {
        const n = this.gazeHistory.length;
        if (n < 5) return 0;
        const mean = this.gazeHistory.reduce((a, b) => a + b, 0) / n;
        return this.gazeHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    }

    // ─── YAWN ─────────────────────────────────────────────────────────────────

    pushMAR(timestamp, mar) {
        if (mar > YAWN_THRESHOLD) {
            if (!this.isYawning) {
                this.isYawning = true;
                this.yawnTimestamps.push(timestamp);
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

    // ─── PHONE DETECTION ──────────────────────────────────────────────────────

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

    // ─── FACE AREA TREND ──────────────────────────────────────────────────────

    pushFaceArea(areaRatio) {
        this.faceAreaHistory.push(areaRatio);
        if (this.faceAreaHistory.length > 60) this.faceAreaHistory.shift();
    }

    /**
     * Returns the trend of face area over last ~2s (negative = shrinking = slumping).
     * Threshold: < -0.005 per 30 frames indicates notable approach to unconsciousness.
     */
    getFaceAreaTrend() {
        const n = this.faceAreaHistory.length;
        if (n < 10) return 0;
        const recent = this.faceAreaHistory.slice(-10).reduce((a, b) => a + b) / 10;
        const older  = this.faceAreaHistory.slice(0, 10).reduce((a, b) => a + b) / 10;
        return recent - older; // Negative = face shrinking = driver pulling away from camera
    }
}

export const drowsinessSmoother = new TemporalSmoother();

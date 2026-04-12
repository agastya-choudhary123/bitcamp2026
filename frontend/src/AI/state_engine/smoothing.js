const CLOSURE_THRESHOLD = 0.22;
const YAWN_THRESHOLD    = 0.50;
const PERCLOS_WINDOW_MS = 60000;   // 1 minute for stable perclos
const YAWN_WINDOW_MS    = 300000;  // 5 minute fatigue memory
const NOD_WINDOW_MS     = 60000;
const ENTROPY_BINS      = 8;
const HISTORY_CLEANUP_MS = 300000; // 5 minute global window
const FATIGUE_WINDOW_MS = 300000;  // 5 minute standard for blinks/yawns

export class TemporalSmoother {
    constructor() {
        this.history = [];
        this.currentClosureStart = null;
        this.blinkTimestamps  = [];
        this.blinkDurations   = [];
        this.blinkIntervals   = [];
        this.lastBlinkEnd     = null;
        this.slowBlinkTs      = [];
        this.eyeRubEventTs    = [];
        this.eyeRubHeldFrames = 0;
        this.awakeBaselineEAR = null;
        this.awakeEARCounter  = 0;
        this.awakeEARAccumulator = 0;
        this.lastPitch     = null;
        this.lastYaw       = null;
        this.lastRoll      = null;
        this.lastPitchTime = null;
        this.headJerkVelocity = 0;
        this.nodEvents     = [];
        this.lastDistractionOnset = null;
        this.attentionRecoveryTimes = [];
        this.pitchDeltaHistory = [];
        this.yawDeltaHistory   = [];
        this.ENTROPY_WINDOW    = 30;
        this.landmarkJitterHistory = [];
        this.lastLandmarkSnapshot  = null;
        this.currentRollDeviationStart = null;
        this.currentDistractionStart = null;
        this.currentFaceMissingStart = null;
        this.currentGazeDeviationStart = null;
        this.gazeHistory = [];
        this.gazeLeftEvents  = [];
        this.gazeRightEvents = [];
        this.gazeDownEvents  = [];
        this.yawnTimestamps  = [];
        this.isYawning       = false;
        this.currentPhoneDetectedStart = null;
        this.faceAreaHistory    = [];
        this.postureLeanHistory = [];
    }

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
                    this.blinkDurations.push(duration);
                    this.blinkTimestamps.push(timestamp);
                    if (this.lastBlinkEnd !== null) {
                        this.blinkIntervals.push(timestamp - this.lastBlinkEnd);
                        if (this.blinkIntervals.length > 20) this.blinkIntervals.shift();
                    }
                    this.lastBlinkEnd = timestamp;
                    if (duration > 300) {
                        this.slowBlinkTs.push(timestamp);
                        const slowCutoff = timestamp - 120000;
                        while (this.slowBlinkTs.length > 0 && this.slowBlinkTs[0] < slowCutoff) this.slowBlinkTs.shift();
                    }
                }
                this.currentClosureStart = null;
            }
        }
        const blinkCutoff = timestamp - 60000;
        while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < blinkCutoff) {
            this.blinkTimestamps.shift();
            this.blinkDurations.shift();
        }
        if (this.awakeEARCounter < 1500 && !closed) {
            this.awakeEARAccumulator += ear;
            this.awakeEARCounter++;
            if (this.awakeEARCounter === 1500) {
                this.awakeBaselineEAR = this.awakeEARAccumulator / 1500;
            }
        }
    }

    pushEyeRubSignal(timestamp, signal) {
        if (signal > 0.5) {
            this.eyeRubHeldFrames++;
            if (this.eyeRubHeldFrames === 3) {
                this.eyeRubEventTs.push(timestamp);
                const cutoff = timestamp - 120000;
                while (this.eyeRubEventTs.length > 0 && this.eyeRubEventTs[0] < cutoff) this.eyeRubEventTs.shift();
            }
        } else { this.eyeRubHeldFrames = 0; }
    }

    getPERCLOS() {
        if (this.history.length === 0) return 0;
        return this.history.filter(r => r.closed).length / this.history.length;
    }

    getEyeClosureDurationMs(timestamp) { return this.currentClosureStart ? (timestamp - this.currentClosureStart) : 0; }
    getBlinkRatePerMinute() { return this.blinkTimestamps.length; }
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

    pushHeadPose(timestamp, pitch, yaw, roll) {
        if (this.lastPitch !== null && this.lastPitchTime !== null) {
            const dt = (timestamp - this.lastPitchTime) / 1000;
            if (dt > 0) {
                const v = Math.abs(pitch - this.lastPitch) / dt;
                this.headJerkVelocity = (this.headJerkVelocity * 0.7) + (v * 0.3);
            }
        }
        if (this.lastPitch !== null && (pitch - this.lastPitch) > 8) this.nodEvents.push(timestamp);
        const nodCutoff = timestamp - NOD_WINDOW_MS;
        while (this.nodEvents.length > 0 && this.nodEvents[0] < nodCutoff) this.nodEvents.shift();
        if (this.lastPitch !== null && this.lastYaw !== null) {
            this.pitchDeltaHistory.push(Math.abs(pitch - this.lastPitch));
            this.yawDeltaHistory.push(Math.abs(yaw - this.lastYaw));
            if (this.pitchDeltaHistory.length > this.ENTROPY_WINDOW) this.pitchDeltaHistory.shift();
            if (this.yawDeltaHistory.length > this.ENTROPY_WINDOW) this.yawDeltaHistory.shift();
        }
        const isRolled = roll !== null && Math.abs(roll) > 12;
        if (isRolled) { if (!this.currentRollDeviationStart) this.currentRollDeviationStart = timestamp; }
        else { this.currentRollDeviationStart = null; }
        const isDistracted = Math.abs(yaw) > 15 || Math.abs(pitch) > 15;
        if (isDistracted) {
            if (!this.currentDistractionStart) {
                this.currentDistractionStart = timestamp;
                this.lastDistractionOnset = timestamp;
            }
        } else {
            if (this.currentDistractionStart && this.lastDistractionOnset) {
                const recovery = timestamp - this.lastDistractionOnset;
                if (recovery < 10000) {
                    this.attentionRecoveryTimes.push(recovery);
                    if (this.attentionRecoveryTimes.length > 20) this.attentionRecoveryTimes.shift();
                }
            }
            this.currentDistractionStart = null;
        }
        this.lastPitch = pitch; this.lastYaw = yaw; this.lastRoll = roll;
        this.lastPitchTime = timestamp;
    }

    getDistractionDurationMs(timestamp) { return this.currentDistractionStart ? (timestamp - this.currentDistractionStart) : 0; }
    getNodFrequency() { return this.nodEvents.length; }
    getRollDeviationMs(timestamp) { return this.currentRollDeviationStart ? (timestamp - this.currentRollDeviationStart) : 0; }
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

    pushFaceDetected(timestamp, isDetected) {
        if (!isDetected) { if (!this.currentFaceMissingStart) this.currentFaceMissingStart = timestamp; }
        else { this.currentFaceMissingStart = null; }
    }
    getFaceMissingDurationMs(timestamp) { return this.currentFaceMissingStart ? (timestamp - this.currentFaceMissingStart) : 0; }

    pushGaze(timestamp, gazeRatio, gazeVertical) {
        this.gazeHistory.push(gazeRatio);
        if (this.gazeHistory.length > 90) this.gazeHistory.shift();
        const isDeviated = gazeRatio < 0.35 || gazeRatio > 0.65;
        if (isDeviated) { if (!this.currentGazeDeviationStart) this.currentGazeDeviationStart = timestamp; }
        else { this.currentGazeDeviationStart = null; }
        const cutoff = timestamp - HISTORY_CLEANUP_MS;
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
    getGazeFixationDurationMs(timestamp) { return this.currentGazeDeviationStart ? (timestamp - this.currentGazeDeviationStart) : 0; }
    getGazeVariance() {
        const n = this.gazeHistory.length;
        if (n < 5) return 0;
        const mean = this.gazeHistory.reduce((a, b) => a + b, 0) / n;
        return this.gazeHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    }
    getGazeDriftRepetition() { return Math.max(this.gazeLeftEvents.length, this.gazeRightEvents.length, this.gazeDownEvents.length); }

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

    pushPhoneDetected(timestamp, isDetected) {
        if (isDetected) { if (!this.currentPhoneDetectedStart) this.currentPhoneDetectedStart = timestamp; }
        else { this.currentPhoneDetectedStart = null; }
    }
    getPhoneDetectedDurationMs(timestamp) { return this.currentPhoneDetectedStart ? (timestamp - this.currentPhoneDetectedStart) : 0; }

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
    getAvgPostureLean() {
        const n = this.postureLeanHistory.length;
        if (n === 0) return 0;
        return this.postureLeanHistory.reduce((a, b) => a + b, 0) / n;
    }
    
    getSlowBlinkRate() { return this.slowBlinkTs.length; }
    getEyeRubCount() { return this.eyeRubEventTs.length; }

    /**
     * ACTIVE PURGING: Clears expired timestamps every frame to prevent permanent skew.
     */
    purgeExpired(timestamp) {
        const fatigueCutoff = timestamp - FATIGUE_WINDOW_MS;
        const blinkCutoff   = timestamp - 60000; // 1 min for blink rate
        const perclosCutoff = timestamp - PERCLOS_WINDOW_MS;
        const cleanupCutoff = timestamp - HISTORY_CLEANUP_MS;

        while (this.history.length > 0 && this.history[0].timestamp < perclosCutoff) this.history.shift();
        while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < blinkCutoff) {
            this.blinkTimestamps.shift();
            this.blinkDurations.shift();
        }
        while (this.slowBlinkTs.length > 0 && this.slowBlinkTs[0] < fatigueCutoff) this.slowBlinkTs.shift();
        while (this.eyeRubEventTs.length > 0 && this.eyeRubEventTs[0] < fatigueCutoff) this.eyeRubEventTs.shift();
        while (this.nodEvents.length > 0 && this.nodEvents[0] < timestamp - NOD_WINDOW_MS) this.nodEvents.shift();
        while (this.yawnTimestamps.length > 0 && this.yawnTimestamps[0] < fatigueCutoff) this.yawnTimestamps.shift();
        
        // Gaze Events
        while (this.gazeLeftEvents.length > 0 && this.gazeLeftEvents[0] < cleanupCutoff) this.gazeLeftEvents.shift();
        while (this.gazeRightEvents.length > 0 && this.gazeRightEvents[0] < cleanupCutoff) this.gazeRightEvents.shift();
        while (this.gazeDownEvents.length > 0 && this.gazeDownEvents[0] < cleanupCutoff) this.gazeDownEvents.shift();
    }
}

export const drowsinessSmoother = new TemporalSmoother();

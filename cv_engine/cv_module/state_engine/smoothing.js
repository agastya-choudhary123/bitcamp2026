const CLOSURE_THRESHOLD = 0.22;
const PERCLOS_WINDOW_MS = 30000; // 30 seconds

export class TemporalSmoother {
    constructor() {
        this.history = []; // Stores { timestamp, ear, closed }
        this.currentClosureStart = null;
        this.currentDistractionStart = null;
        this.currentFaceMissingStart = null;
        
        this.blinkTimestamps = []; // Tracks every blink in the last 60 seconds

        // Progressive Baseline logic
        this.awakeBaselineEAR = null;
        this.awakeEARCounter = 0;
        this.awakeEARAccumulator = 0;

        // Head Jerk Velocity
        this.lastPitch = null;
        this.lastPitchTime = null;
        this.headJerkVelocity = 0;
    }

    /**
     * Push a new frame state into the queue and slide the window.
     */
    pushEAR(timestamp, ear) {
        const closed = ear < CLOSURE_THRESHOLD;
        this.history.push({ timestamp, ear, closed });
        
        // Remove frame data that is fully older than 30 seconds
        const cutoff = timestamp - PERCLOS_WINDOW_MS;
        while (this.history.length > 0 && this.history[0].timestamp < cutoff) {
            this.history.shift();
        }

        // Track continuous duration for microsleep detection
        if (closed) {
            if (!this.currentClosureStart) {
                this.currentClosureStart = timestamp;
            }
        } else {
            // When eyes RE-OPEN, evaluate if it was a blink
            if (this.currentClosureStart) {
                const duration = timestamp - this.currentClosureStart;
                if (duration < 1000) { // If closed less than a second, it's a blink
                    this.blinkTimestamps.push(timestamp);
                }
            }
            this.currentClosureStart = null;
        }

        // Clean out blinks older than 60 seconds
        const blinkCutoff = timestamp - 60000;
        while (this.blinkTimestamps.length > 0 && this.blinkTimestamps[0] < blinkCutoff) {
            this.blinkTimestamps.shift();
        }

        // Establish the Progressive Awake Baseline (Average over first 50 seconds approx)
        // 50 seconds * 30 FPS = 1500 frames
        if (this.awakeEARCounter < 1500 && !closed) { 
            this.awakeEARAccumulator += ear;
            this.awakeEARCounter++;
            if (this.awakeEARCounter === 1500) {
                this.awakeBaselineEAR = this.awakeEARAccumulator / 1500;
                console.log(`[CV Engine] Awake EAR Baseline stabilized at: ${this.awakeBaselineEAR.toFixed(3)}`);
            }
        }
    }

    getProgressiveFatigueRatio() {
        if (!this.awakeBaselineEAR || this.history.length === 0) return 1.0;
        // Average EAR over the last 30 second window
        const currentAvg = this.history.reduce((sum, record) => sum + record.ear, 0) / this.history.length;
        return currentAvg / this.awakeBaselineEAR;
    }

    getBlinkRatePerMinute() {
        return this.blinkTimestamps.length;
    }

    /**
     * Calculates Percentage of Eye Closure (PERCLOS) over the 30s window.
     */
    getPERCLOS() {
        if (this.history.length === 0) return 0.0;
        let closedCount = 0;
        for (let i = 0; i < this.history.length; i++) {
            if (this.history[i].closed) closedCount++;
        }
        return closedCount / this.history.length;
    }

    /**
     * Returns the continuous time in MS that the eyes have been currently closed.
     */
    getEyeClosureDurationMs(timestamp) {
        if (this.currentClosureStart) {
            return timestamp - this.currentClosureStart;
        }
        return 0;
    }

    /**
     * Track distraction duration based on dangerous head pose.
     * We consider looking away (yaw > 15) or looking down (pitch > 15).
     */
    pushHeadPose(timestamp, pitch, yaw) {
        // Calculate dPitch/dt (Nod Velocity) in degrees per second
        if (this.lastPitch !== null && this.lastPitchTime !== null) {
            const dtSeconds = (timestamp - this.lastPitchTime) / 1000;
            if (dtSeconds > 0) {
                const velocity = Math.abs(pitch - this.lastPitch) / dtSeconds;
                // Add smoothing to velocity to avoid 1-frame freakouts
                this.headJerkVelocity = (this.headJerkVelocity * 0.7) + (velocity * 0.3);
            }
        }
        this.lastPitch = pitch;
        this.lastPitchTime = timestamp;

        const isDistracted = Math.abs(yaw) > 15 || Math.abs(pitch) > 15;
        
        if (isDistracted) {
            if (!this.currentDistractionStart) {
                this.currentDistractionStart = timestamp;
            }
        } else {
            this.currentDistractionStart = null;
        }
    }

    getDistractionDurationMs(timestamp) {
        if (this.currentDistractionStart) {
            return timestamp - this.currentDistractionStart;
        }
        return 0;
    }

    pushFaceDetected(timestamp, isDetected) {
        if (!isDetected) {
            if (!this.currentFaceMissingStart) this.currentFaceMissingStart = timestamp;
        } else {
            this.currentFaceMissingStart = null;
        }
    }

    getFaceMissingDurationMs(timestamp) {
        if (this.currentFaceMissingStart) {
            return timestamp - this.currentFaceMissingStart;
        }
        return 0;
    }
}

// Export a singleton instance we can use inside the inference loop
export const drowsinessSmoother = new TemporalSmoother();

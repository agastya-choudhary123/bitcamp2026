/**
 * Canonical live CV State object.
 *
 * Layer 1 — raw metrics: computed every frame, stored flat for easy access.
 * Layer 2 — behaviorState: a single high-level label derived from all raw metrics.
 */
export const CvState = {
    timestamp: 0,

    // ── Raw Metrics (Layer 1) ──────────────────────────────────────────────
    metrics: {
        // Eye
        ear: null,                  // Eye Aspect Ratio (per frame average)
        perclos: null,              // % eye closure over last 30s
        closureDurationMs: 0,       // Current continuous closure in ms
        blinkRatePerMin: 0,         // Blinks in last 60s
        avgBlinkDurationMs: 0,      // Average blink duration (ms)

        // Mouth
        mar: null,                  // Mouth Aspect Ratio (yawn detector)
        yawnCount: 0,               // Yawn events in last 5 min

        // Head
        headPitch: null,
        headYaw: null,
        headJerkVelocity: 0,        // °/s nod velocity
        nodFrequency: 0,            // Nod events in last 2 min

        // Gaze
        gazeRatio: null,
        gazeFixationDurationMs: 0,  // Consecutive frames of deviated gaze

        // Distraction / face
        distractionDurationMs: 0,
        faceMissingDurationMs: 0,
        faceDetected: false,

        // External
        phoneDetectedDurationMs: 0, // Duration phone visible in scene
        progressiveFatigueRatio: 1.0,
    },

    // ── Behavioral State (Layer 2) ────────────────────────────────────────
    // One of: "alert" | "fatigue_early" | "drowsy_critical" | "microsleep"
    //         "phone_distraction" | "visual_distraction" | "likely_impaired"
    behaviorState: "alert",
    behaviorSeverity: 0,           // 0 (safe) → 5 (critical)

    // ── External Scene ────────────────────────────────────────────────────
    external: {
        visibility: {
            sceneBrightness: null,
            visibilityCondition: "normal_visibility"
        },
        forwardHazard: {
            state: "clear",
            primaryTarget: "none",
            targetSizeRatio: 0
        },
        crash: {
            state: "clear"
        }
    }
};

/**
 * Deep-merge new state delta into CvState.
 */
export function updateSharedState(delta) {
    if (delta.metrics) {
        Object.assign(CvState.metrics, delta.metrics);
    }
    if (delta.behaviorState !== undefined) {
        CvState.behaviorState = delta.behaviorState;
    }
    if (delta.behaviorSeverity !== undefined) {
        CvState.behaviorSeverity = delta.behaviorSeverity;
    }
    if (delta.external) {
        if (delta.external.visibility) Object.assign(CvState.external.visibility, delta.external.visibility);
        if (delta.external.forwardHazard) Object.assign(CvState.external.forwardHazard, delta.external.forwardHazard);
        if (delta.external.crash) Object.assign(CvState.external.crash, delta.external.crash);
    }
    CvState.timestamp = Date.now();
    return CvState;
}

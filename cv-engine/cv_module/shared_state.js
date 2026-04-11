/**
 * Canonical live CV State — Phase 2.
 *
 * Layer 1 — raw metrics: ~28 signals computed every frame.
 * Layer 2 — behaviorState: one of 7 discrete labels derived from all metrics.
 */
export const CvState = {
    timestamp: 0,

    // ── Raw Metrics (Layer 1) ──────────────────────────────────────────────
    metrics: {
        // Eye — bilateral
        ear: null,
        perclos: null,
        closureDurationMs: 0,
        blinkRatePerMin: 0,
        avgBlinkDurationMs: 0,

        // Eye — unilateral / structural
        leftEAR: null,
        rightEAR: null,
        earAsymmetry: 0,
        blinkIntervalVariance: 0,
        asyncBlinkCount: 0,

        // Mouth
        mar: null,
        yawnCount: 0,

        // Head pose
        headPitch: null,
        headYaw: null,
        headRoll: null,
        headJerkVelocity: 0,
        nodFrequency: 0,

        // Head motion quality
        headMovementEntropy: 0,
        microTremor: 0,
        rollDeviationMs: 0,

        // Gaze
        gazeRatio: null,
        gazeVertical: null,
        gazeFixationDurationMs: 0,
        gazeVariance: 0,

        // Face structure
        facialSymmetry: 0,
        browPosition: 0,
        faceAreaTrend: 0,

        // Distraction / face presence
        distractionDurationMs: 0,
        faceMissingDurationMs: 0,
        faceDetected: false,

        // Progressive fatigue
        progressiveFatigueRatio: 1.0,

        // External
        phoneDetectedDurationMs: 0,
    },

    // ── Behavioral State (Layer 2) ─────────────────────────────────────────
    // One of: "alert" | "drowsy" | "microsleep" | "phone_use"
    //         "distracted" | "intoxicated" | "medical"
    behaviorState: "alert",
    behaviorSeverity: 0,

    // ── External Scene ─────────────────────────────────────────────────────
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

export function updateSharedState(delta) {
    if (delta.metrics) Object.assign(CvState.metrics, delta.metrics);
    if (delta.behaviorState   !== undefined) CvState.behaviorState   = delta.behaviorState;
    if (delta.behaviorSeverity !== undefined) CvState.behaviorSeverity = delta.behaviorSeverity;
    if (delta.external) {
        if (delta.external.visibility)    Object.assign(CvState.external.visibility,    delta.external.visibility);
        if (delta.external.forwardHazard) Object.assign(CvState.external.forwardHazard, delta.external.forwardHazard);
        if (delta.external.crash)         Object.assign(CvState.external.crash,         delta.external.crash);
    }
    CvState.timestamp = Date.now();
    return CvState;
}

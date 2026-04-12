export const CvState = {
    timestamp: 0,
    metrics: {
        ear: null, perclos: null, closureDurationMs: 0,
        leftEAR: null, rightEAR: null, asymmetryScore: 0,
        blinkRatePerMin: 0, avgBlinkDurationMs: 0,
        blinkIntervalVariance: 0, slowBlinkRate: 0, eyeRubCount: 0,
        mar: null, yawnCount: 0,
        headPitch: null, headYaw: null, headRoll: null,
        headJerkVelocity: 0, nodFrequency: 0,
        headMovementEntropy: 0, microTremor: 0, rollDeviationMs: 0,
        gazeRatio: null, gazeVertical: null,
        gazeFixationDurationMs: 0, gazeVariance: 0,
        gazeDriftRepetition: 0, avgAttentionRecoveryMs: 0,
        browPosition: 0, faceAreaTrend: 0, avgPostureLean: 0,
        distractionDurationMs: 0, faceMissingDurationMs: 0, faceDetected: false,
        progressiveFatigueRatio: 1.0, phoneDetectedDurationMs: 0,
    },
    // Array of active behavioral states (multi-state support)
    behaviorStates: ["alert"],
    behaviorSeverity: 0,
    external: {
        visibility: { sceneBrightness: null, visibilityCondition: "normal_visibility" },
        forwardHazard: { state: "clear", primaryTarget: "none", targetSizeRatio: 0 },
        crash: { state: "clear" }
    }
};

export function updateSharedState(delta) {
    if (delta.metrics)           Object.assign(CvState.metrics, delta.metrics);
    if (delta.behaviorStates)    CvState.behaviorStates   = delta.behaviorStates;
    if (delta.behaviorSeverity !== undefined) CvState.behaviorSeverity = delta.behaviorSeverity;
    
    if (delta.external) {
        if (delta.external.visibility)    Object.assign(CvState.external.visibility,    delta.external.visibility);
        if (delta.external.forwardHazard) Object.assign(CvState.external.forwardHazard, delta.external.forwardHazard);
        if (delta.external.crash)         Object.assign(CvState.external.crash,         delta.external.crash);
    }
    CvState.timestamp = Date.now();
    return CvState;
}

export function resetSharedState() {
    CvState.behaviorStates = ["alert"];
    CvState.behaviorSeverity = 0;
    // Note: We don't reset metrics to allow smooth transitions between sessions if needed
}

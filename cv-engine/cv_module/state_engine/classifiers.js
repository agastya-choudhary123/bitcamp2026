/**
 * MULTI-STATE BEHAVIORAL CLASSIFIER — Phase 3
 *
 * Returns an ARRAY of active behavioral states. A driver can be classified
 * into multiple simultaneous states as long as they are not contradictory.
 *
 * Compatibility rules:
 *   - "alert" is always solo (means everything else is absent)
 *   - "microsleep" and "medical" are override states — they appear alone
 *   - "intoxicated" can co-occur with "drowsy" (drunk AND sleepy)
 *   - "drowsy" + "distracted" — valid (tired and looking away)
 *   - "phone_use" + "drowsy" — valid (drowsy while on phone)
 *   - "phone_use" + "distracted" — NOT combined (they are the same category of inattention, just cause-specific)
 *   - "intoxicated" + "medical" — NOT valid (mutually exclusive)
 *
 * All 7 possible states:
 *   "alert" | "drowsy" | "microsleep" | "phone_use" | "distracted" | "intoxicated" | "medical"
 */
export function classifyBehavior(m) {
    const {
        perclos, closureDurationMs, progressiveRatio,
        blinkRatePerMin, avgBlinkDurationMs, slowBlinkRate, eyeRubCount,
        yawnCount, asymmetryScore,
        blinkIntervalVariance,
        pitch, yaw, roll,
        headJerkVelocity, nodFrequency,
        distractionDurationMs, faceMissingDurationMs,
        rollDeviationMs, headMovementEntropy, microTremor,
        gazeRatio, gazeFixationDurationMs, gazeVertical, gazeVariance,
        gazeDriftRepetition, avgAttentionRecoveryMs,
        browPosition, faceAreaTrend, avgPostureLean,
        phoneDetectedDurationMs,
        mar
    } = m;

    // ── OVERRIDE STATES (appear alone) ───────────────────────────────────────

    // MICROSLEEP — presence of active sustained closure
    if (closureDurationMs > 3000) return ["microsleep"];
    if (faceMissingDurationMs > 6000) return ["microsleep"];
    if (closureDurationMs > 2000 && pitch > 25) return ["microsleep"];

    // MEDICAL EMERGENCY — unilateral / sustained unresponsiveness
    {
        let s = 0;
        if (asymmetryScore    > 0.28) s++;           // Strong facial asymmetry (stroke)
        if (rollDeviationMs   > 3000) s++;           // Sustained head side-tilt
        if (faceAreaTrend     < -0.01) s++;          // Slumping away from camera
        if (faceMissingDurationMs > 2000) s++;       // Face intermittently gone
        if (browPosition      > 0.15) s++;           // Pronounced brow droop
        if (avgPostureLean !== undefined && Math.abs(avgPostureLean) > 0.18) s++;
        if (s >= 3) return ["medical"];
    }

    // ── PARALLEL STATES (can co-occur) ───────────────────────────────────────
    const states = [];

    // INTOXICATED — requires erratic/chaotic convergence
    {
        let s = 0;
        if (headMovementEntropy   > 2.0) s++;
        if (microTremor           > 0.003) s++;
        if (blinkIntervalVariance > 400) s++;
        if (gazeVariance          > 0.015) s++;
        if (headJerkVelocity > 45 && perclos > 0.08) s++;
        if (nodFrequency          > 5) s++;
        if (asymmetryScore > 0.12 && asymmetryScore < 0.28) s++;  // Moderate asymmetry
        if (avgAttentionRecoveryMs > 3500 && avgAttentionRecoveryMs > 0) s++; // Slow self-correction
        if (s >= 4) states.push("intoxicated");
    }

    // DROWSY — eye-closure / fatigue convergence
    {
        let s = 0;
        if (closureDurationMs  > 1500) s += 2;            // Weight heavier
        if (perclos            > 0.15) s += 2;
        if (perclos            > 0.10) s++;
        if (yawnCount          >= 2)   s++;
        if (slowBlinkRate      >= 2)   s++;                // Deliberate slow blinks = fighting sleep
        if (eyeRubCount        >= 1)   s++;                // Rubbing eyes
        if (avgBlinkDurationMs > 280 && blinkRatePerMin < 12) s++;
        if (progressiveRatio   < 0.85) s++;
        if (browPosition       > 0.12 && perclos > 0.08) s++;
        if (s >= 3) states.push("drowsy");
    }

    // PHONE USE — phone detected with gaze co-signal
    {
        const phoneActive = phoneDetectedDurationMs > 2000;
        const gazeDown    = gazeVertical > 0.70 && gazeFixationDurationMs > 1000;
        if (phoneActive && gazeDown) states.push("phone_use");
        else if (phoneDetectedDurationMs > 4000) states.push("phone_use");
        else if (gazeDriftRepetition >= 5 && gazeVertical > 0.65) states.push("phone_use"); // Habitual downward drift even without phone
    }

    // DISTRACTED — head/gaze off-axis WITHOUT phone (mutually exclusive with phone_use)
    if (!states.includes("phone_use")) {
        let s = 0;
        if (distractionDurationMs  > 2000) s++;
        if (gazeFixationDurationMs > 2500) s++;
        if (headJerkVelocity       > 70)   s++;
        if (gazeDriftRepetition    >= 3)   s++;
        if (avgAttentionRecoveryMs > 0 && avgAttentionRecoveryMs < 1500) s++; // Quick recovery = temporarily distracted
        if (s >= 2) states.push("distracted");
    }

    // ALERT — default if nothing else triggered
    if (states.length === 0) return ["alert"];

    return states;
}

/**
 * Maximum severity across an array of states.
 * Used for server-side emergency logic and iOS badge color.
 */
export function behaviorSeverity(states) {
    const severityMap = {
        microsleep:  5,
        medical:     5,
        intoxicated: 4,
        drowsy:      3,
        phone_use:   2,
        distracted:  2,
        alert:       0
    };
    return Math.max(...states.map(s => severityMap[s] ?? 0));
}

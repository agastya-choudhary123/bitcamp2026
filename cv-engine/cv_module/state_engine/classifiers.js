/**
 * UNIFIED BEHAVIORAL CLASSIFIER — Phase 2
 *
 * Takes a full metrics bundle and emits one of 7 discrete behavioral states.
 * Evaluated in strict priority order (higher priority overrides lower).
 *
 * States:
 *   "alert"       — Baseline safe. No action.
 *   "drowsy"      — Progressive eye closure / fatigue pattern. Warning + monitor.
 *   "microsleep"  — Active eye closure >3s or severe head drop. Immediate SOS.
 *   "phone_use"   — Phone visible in scene + gaze deviation. Alert + clip.
 *   "distracted"  — Sustained gaze/head diversion without phone. Alert.
 *   "intoxicated" — Erratic motion convergence (tremor + chaos + inconsistency).
 *   "medical"     — Unilateral/sustained unresponsiveness (stroke, cardiac, etc).
 */
export function classifyBehavior({
    // Eye
    perclos, closureDurationMs, progressiveRatio,
    blinkRatePerMin, avgBlinkDurationMs, yawnCount,
    earAsymmetry, blinkIntervalVariance, asyncBlinkCount,
    // Head / motion
    pitch, yaw, roll,
    headJerkVelocity, nodFrequency,
    distractionDurationMs, faceMissingDurationMs,
    rollDeviationMs, headMovementEntropy, microTremor,
    // Gaze
    gazeRatio, gazeFixationDurationMs, gazeVertical, gazeVariance,
    // Face
    facialSymmetry, browPosition, faceAreaTrend,
    // External
    phoneDetectedDurationMs,
    // Mouth
    mar
}) {

    // ── MICROSLEEP (P1 — highest priority) ───────────────────────────────────
    if (closureDurationMs > 3000) return "microsleep";
    if (faceMissingDurationMs > 6000) return "microsleep";
    // Head drops forward with eyes closed for 2s = microsleep without face data
    if (closureDurationMs > 2000 && pitch > 25) return "microsleep";

    // ── MEDICAL EMERGENCY (P2) ────────────────────────────────────────────────
    // Requires convergence of UNILATERAL or SUSTAINED unresponsiveness signals.
    {
        let medScore = 0;
        if (facialSymmetry > 0.10) medScore++;          // High facial asymmetry (stroke)
        if (earAsymmetry   > 0.30 && perclos > 0.08) medScore++;  // One eye drooping
        if (asyncBlinkCount > 4) medScore++;             // Blinks not synced
        if (rollDeviationMs > 3000) medScore++;          // Head sustained side-tilt
        if (faceAreaTrend < -0.01) medScore++;          // Face shrinking (slumping)
        if (faceMissingDurationMs > 2000) medScore++;   // Intermittent face loss
        if (browPosition > 0.15) medScore++;             // Pronounced brow droop

        if (medScore >= 4) return "medical";
    }

    // ── INTOXICATED (P3) ──────────────────────────────────────────────────────
    // Requires convergence of ERRATIC / INCONSISTENT motion signals.
    // Key differentiator from medical: chaotic MOVEMENT, not stillness.
    {
        let intoxScore = 0;
        if (headMovementEntropy > 2.0) intoxScore++;    // Chaotic unpredictable motion
        if (microTremor > 0.003) intoxScore++;          // High-frequency hand/head tremor
        if (blinkIntervalVariance > 400) intoxScore++;  // Erratic irregular blink timing
        if (gazeVariance > 0.015) intoxScore++;         // Erratic scanning gaze
        if (headJerkVelocity > 45 && perclos > 0.08) intoxScore++; // Jerky + eyes heavy
        if (nodFrequency > 5) intoxScore++;             // Repetitive nodding
        if (earAsymmetry > 0.15 && earAsymmetry < 0.30) intoxScore++; // Moderate asymmetry
        if (progressiveRatio < 0.80) intoxScore++;     // EAR decaying over session

        if (intoxScore >= 4) return "intoxicated";
    }

    // ── PHONE USE (P4) ────────────────────────────────────────────────────────
    if (phoneDetectedDurationMs > 2000 && gazeFixationDurationMs > 1000) return "phone_use";
    if (phoneDetectedDurationMs > 2000 && gazeVertical > 0.70) return "phone_use"; // Gaze down + phone
    if (phoneDetectedDurationMs > 4000) return "phone_use"; // Phone alone long enough

    // ── DROWSY (P5) ───────────────────────────────────────────────────────────
    if (closureDurationMs > 1500) return "drowsy";
    if (perclos > 0.15) return "drowsy";
    if (perclos > 0.10 && yawnCount >= 2) return "drowsy";
    if (avgBlinkDurationMs > 300 && blinkRatePerMin < 10 && perclos > 0.08) return "drowsy";
    if (progressiveRatio < 0.82 && yawnCount >= 1) return "drowsy";
    if (browPosition > 0.12 && perclos > 0.10) return "drowsy"; // Drooping brows + PERCLOS

    // ── DISTRACTED (P6) ───────────────────────────────────────────────────────
    if (distractionDurationMs > 2000) return "distracted";
    if (gazeFixationDurationMs > 2500) return "distracted";
    if (headJerkVelocity > 70) return "distracted"; // Sudden violent snap
    if (gazeVertical > 0.75 && gazeFixationDurationMs > 1500) return "distracted"; // Looking down

    // ── ALERT (default) ───────────────────────────────────────────────────────
    return "alert";
}

/**
 * Maps a behaviorState to an integer severity (0–5).
 * Used by the server's checkEmergency() and iOS badge coloring.
 */
export function behaviorSeverity(state) {
    const map = {
        microsleep:    5,
        medical:       5,
        intoxicated:   4,
        drowsy:        3,
        phone_use:     2,
        distracted:    2,
        alert:         0
    };
    return map[state] ?? 0;
}

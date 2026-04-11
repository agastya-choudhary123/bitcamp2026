/**
 * UNIFIED BEHAVIORAL CLASSIFIER
 *
 * Takes a full metrics bundle and emits one of 7 discrete behavioral states.
 * States are ordered by severity: higher = more urgent action required.
 *
 * States:
 *   "alert"              — Baseline safe. No action.
 *   "fatigue_early"      — Subtle fatigue signals. Gentle warning.
 *   "drowsy_critical"    — Clear drowsiness. Strong warning + clip.
 *   "microsleep"         — Eyes closed >3s or head drop. Immediate SOS.
 *   "phone_distraction"  — Phone detected + gaze deviation. Alert + clip.
 *   "visual_distraction" — Sustained gaze/head deviation, no phone. Alert.
 *   "likely_impaired"    — Convergence of multiple impairment signals. SOS.
 */
export function classifyBehavior({
    perclos,
    closureDurationMs,
    progressiveRatio,
    blinkRatePerMin,
    avgBlinkDurationMs,
    yawnCount,
    pitch,
    yaw,
    headJerkVelocity,
    nodFrequency,
    distractionDurationMs,
    faceMissingDurationMs,
    gazeFixationDurationMs,
    phoneDetectedDurationMs,
    mar
}) {

    // ── MICROSLEEP (highest priority – override everything) ─────────────────
    // Eyes closed > 3s OR face completely gone > 6s
    if (closureDurationMs > 3000) return "microsleep";
    if (faceMissingDurationMs > 6000) return "microsleep";

    // ── LIKELY IMPAIRED ─────────────────────────────────────────────────────
    // Requires convergence of multiple weak signals (no single trigger)
    //   - high PERCLOS + erratic jerk + repetitive nods + extended face loss
    {
        let impairmentScore = 0;
        if (perclos > 0.12) impairmentScore++;           // Eyes closing frequently
        if (headJerkVelocity > 50) impairmentScore++;   // Erratic head movement
        if (nodFrequency > 6) impairmentScore++;        // Repetitive drowsy nods
        if (faceMissingDurationMs > 2000) impairmentScore++;  // Face intermittently gone
        if (avgBlinkDurationMs > 350) impairmentScore++;     // Very long blinks
        if (progressiveRatio < 0.80) impairmentScore++;      // EAR baseline degraded badly
        if (impairmentScore >= 4) return "likely_impaired";   // Need 4+ signals
    }

    // ── PHONE DISTRACTION ───────────────────────────────────────────────────
    // Phone visible for >2s + gaze fixed downward/sideways
    if (phoneDetectedDurationMs > 2000 && gazeFixationDurationMs > 1000) {
        return "phone_distraction";
    }
    // Phone alone for >4s is enough
    if (phoneDetectedDurationMs > 4000) return "phone_distraction";

    // ── DROWSY CRITICAL ─────────────────────────────────────────────────────
    // PERCLOS > 15%, or closure > 1.5s, or PERCLOS 10%+ with yawn pattern
    if (closureDurationMs > 1500) return "drowsy_critical";
    if (perclos > 0.15) return "drowsy_critical";
    if (perclos > 0.10 && yawnCount >= 2) return "drowsy_critical";

    // ── VISUAL DISTRACTION ──────────────────────────────────────────────────
    // Head turned away or gaze off-axis for >2s (no phone)
    if (distractionDurationMs > 2000) return "visual_distraction";
    if (gazeFixationDurationMs > 2500) return "visual_distraction";
    // Sudden violent head jerk (micro-sleep nod snap)
    if (headJerkVelocity > 70) return "visual_distraction";

    // ── FATIGUE EARLY ─────────────────────────────────────────────────────
    // Subtle progressive signals — any one is enough for a light warning
    if (perclos > 0.10) return "fatigue_early";
    if (progressiveRatio < 0.85) return "fatigue_early";
    if (yawnCount >= 3) return "fatigue_early";
    if (avgBlinkDurationMs > 300 && blinkRatePerMin < 10) return "fatigue_early";
    if (nodFrequency > 3) return "fatigue_early";

    // ── ALERT (default) ─────────────────────────────────────────────────────
    return "alert";
}

/**
 * Maps a behaviorState string to an integer severity level (0–5).
 * Used for downstream filtering and iOS badge colors.
 */
export function behaviorSeverity(state) {
    switch (state) {
        case "microsleep":          return 5;
        case "likely_impaired":     return 4;
        case "drowsy_critical":     return 3;
        case "phone_distraction":   return 2;
        case "visual_distraction":  return 2;
        case "fatigue_early":       return 1;
        default:                    return 0; // alert
    }
}

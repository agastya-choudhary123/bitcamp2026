/**
 * Maps incoming CV metrics to discrete semantic states based on heuristics.
 */
export function classifyDrowsiness(perclos, closureDurationMs, progressiveRatio) {
    if (closureDurationMs > 3000) return "microsleep_risk";
    
    // PERCLOS > 15% is the standard threshold for explicit drowsiness
    if (closureDurationMs > 1500 || perclos > 0.15) return "drowsy_warning";
    
    // Between 10% and 15% is suspicious
    if (perclos > 0.10) return "fatigue_suspected";
    
    // Long-Term Progressive Fatigue Tracking
    if (progressiveRatio < 0.85) return "progressive_fatigue";

    return "alert";
}

/**
 * Maps head orientation to a discrete distraction state.
 */
export function classifyDistraction(pitch, yaw, distractionDurationMs, faceMissingDurationMs, gazeRatio, headJerkVelocity) {
    if (faceMissingDurationMs > 2000) {
        return "face_not_visible";
    }

    // Sudden violent micro-sleep nod
    if (headJerkVelocity > 60) {
        return "sudden_head_jerk";
    }

    if (distractionDurationMs > 2000) {
        if (pitch > 15) return "looking_down";
        return "looking_away"; // General "Not Attentive" state
    }

    // Texting Gaze Tracking (Eye Tracking) -> Distracted even if head is forward
    if (gazeRatio && (gazeRatio < 0.35 || gazeRatio > 0.65)) {
        if (distractionDurationMs > 1500) {
            return "texting_gaze_detected";
        }
    }

    return "attentive";
}

/**
 * Maps multi-modal cues into severe impairment/medical distress scenarios.
 */
export function classifyImpairment(closureDurationMs, pitch, distractionDurationMs, faceMissingDurationMs) {
    // The driver is slumped over and hasn't opened their eyes
    if (closureDurationMs > 3000 && pitch > 20) return "possible_incapacitation";
    
    // Completely disappeared or eyes closed for > 5 seconds
    if (closureDurationMs > 5000 || faceMissingDurationMs > 6000) return "non_responsive_emergency";

    // Slumped posture for an extended period of time
    if (distractionDurationMs > 5000 && pitch > 25) return "possible_impairment";

    return "normal";
}

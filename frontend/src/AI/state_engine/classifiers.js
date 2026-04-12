/**
 * HYBRID INTELLIGENT ARCHITECTURE
 *
 * 1. SIMPLE LAYER (Heuristic): Uses calibrated metrics for Alert, Drowsy, Distracted,
 *    Phone, and Microsleep. Instant, transparent, and reactive.
 * 2. COMPOUND LAYER (Heuristic Scoring): Multi-signal weighted scoring for Intoxicated
 *    and Medical. Each state requires convergence of multiple independent indicators to
 *    avoid false positives.
 */

/**
 * INTOXICATED CLASSIFIER
 *
 * Alcohol/drug impairment degrades the cerebellum and vestibular system before cortical
 * function — producing erratic, high-entropy head motion, involuntary micro-tremor,
 * irregular blink timing, and prolonged slow blinks, while the driver may still appear
 * superficially awake (EAR near normal, not fully drowsy).
 *
 * Key discriminators vs. drowsy:
 *   - Drowsy: monotonically falling EAR, high PERCLOS, low entropy (head droops slowly)
 *   - Intoxicated: erratic entropy, tremor, blink variance WITHOUT necessarily high PERCLOS
 */
function classifyIntoxicated(m) {
    let score = 0;

    // [3pts] Head movement entropy: intoxicated drivers show chaotic, high-variance head
    // motion from vestibular disruption. Normal alert ~0.5–1.2; heavy intoxication >2.2.
    // Raised lower bound to avoid flagging alert drivers who look around normally.
    const entropy = m.entropy || m.headMovementEntropy || 0;
    if (entropy > 2.5) score += 3;
    else if (entropy > 2.0) score += 2;
    else if (entropy > 1.6) score += 1;

    // [3pts] Micro-tremor: involuntary high-frequency head jitter from motor impairment.
    // Sober baseline < 0.00015; clearly impaired > 0.00030
    const tremor = m.microTremor || 0;
    if (tremor > 0.00045) score += 3;
    else if (tremor > 0.00030) score += 2;
    else if (tremor > 0.00020) score += 1;

    // [2pts] Blink interval variance: irregular inter-blink timing from impaired neural
    // pacing. Sober variance < 200ms²; clearly irregular > 500ms²
    const blinkVar = m.blinkIntervalVariance || 0;
    if (blinkVar > 500) score += 2;
    else if (blinkVar > 350) score += 1;

    // [2pts] Slow blink rate: heavy, prolonged blinks from CNS depression.
    // Threshold raised — occasional slow blinks are normal; >12 in a window is abnormal.
    const slowBlinks = m.slowBlinks || m.slowBlinkRate || 0;
    if (slowBlinks > 14) score += 2;
    else if (slowBlinks > 10) score += 1;

    // [1pt] Blink rate abnormality: raised upper bound — 20–24/min is within normal
    // range for an anxious or attentive driver. Only flag clearly elevated (>26) or low (<7).
    const blinkRate = m.blinkRatePerMin || m.blinkRate || 0;
    if (blinkRate > 26 || (blinkRate > 0 && blinkRate < 7)) score += 1;

    // [1pt] Severely elevated PERCLOS co-occurring with high entropy — when drowsiness
    // and erratic motion appear together it suggests impairment, not pure fatigue.
    // Removed the standalone PERCLOS criterion (it fires for any tired driver).
    const perclos = m.perclos || 0;
    if (perclos > 0.30 && entropy > 1.6) score += 1;

    // [1pt] Gaze instability: impaired smooth pursuit. Tightened bounds to avoid
    // flagging drivers who are simply looking slightly off-center.
    const gazeRatio = m.gazeRatio || 0.5;
    if (gazeRatio < 0.28 || gazeRatio > 0.75) score += 1;

    // Threshold raised from 5 → 7: require strong multi-signal convergence.
    // A single dominant signal (entropy alone = 3pts, tremor alone = 3pts) should
    // never be enough — at least two independent indicators must be present.
    return score >= 7;
}

/**
 * MEDICAL EMERGENCY CLASSIFIER
 *
 * Covers acute events: seizure, stroke, hypoglycemia, cardiac syncope.
 * Unlike intoxication (erratic but coordinated), medical events cause:
 *   - Sudden loss of postural control → head roll/pitch spikes
 *   - Facial asymmetry → stroke (VII nerve palsy)
 *   - Abrupt sustained closure without recovery → loss of consciousness
 *   - Abnormal vertical gaze deviation (brainstem involvement)
 *   - Posture collapse (forward slump or lateral lean)
 */
function classifyMedical(m) {
    let score = 0;

    // [4pts — near-definitive] Facial asymmetry: sudden unilateral facial droop is a
    // cardinal stroke sign. Asymmetry score > 0.25 with head facing forward is critical.
    const asymmetry = m.asymmetryScore || 0;
    const facingForward = Math.abs(m.headYaw || 0) < 20;
    if (asymmetry > 0.35 && facingForward) score += 4;
    else if (asymmetry > 0.20 && facingForward) score += 2;

    // [3pts] Head roll collapse: involuntary lateral head drop from loss of muscle tone.
    // Normal driving roll stays within ±8°; collapse events exceed ±20°
    const roll = Math.abs(m.headRoll || 0);
    if (roll > 25) score += 3;
    else if (roll > 15) score += 2;
    else if (roll > 10) score += 1;

    // [3pts] Sustained posture lean: forward/lateral slump without correction reflex,
    // indicating loss of postural awareness or consciousness
    const postureLean = m.postureLean || 0;
    if (postureLean > 0.30) score += 3;
    else if (postureLean > 0.15) score += 2;
    else if (postureLean > 0.08) score += 1;

    // [2pts] Abnormal vertical gaze: upward or downward conjugate gaze deviation is a
    // brainstem sign (seen in seizure, brainstem stroke, or syncope)
    const gazeVertical = m.gazeVertical || 0.5;
    if (gazeVertical < 0.25 || gazeVertical > 0.80) score += 2;
    else if (gazeVertical < 0.30 || gazeVertical > 0.70) score += 1;

    // [2pts] Prolonged closure without blink recovery: eye closure > 1.5s with no
    // voluntary blink suggests loss of consciousness rather than microsleep
    const closureDur = m.closureDurationMs || 0;
    if (closureDur > 2000) score += 2;
    else if (closureDur > 1500) score += 1;

    // [2pts] Head pitch collapse: sustained forward head drop (>30°) without correction
    // indicates loss of neck extensor tone
    const pitch = m.headPitch || 0;
    if (pitch > 35) score += 2;
    else if (pitch > 25) score += 1;

    // [1pt] Eye rubs or unusual facial movement: seizure prodrome or confusion
    const eyeRubs = m.eyeRubs || 0;
    if (eyeRubs > 2) score += 1;

    // Threshold: medical events are high-severity, so require strong convergence (score >= 5).
    // Asymmetry alone (score=4) is near-definitive but we require one corroborating signal.
    return score >= 5;
}

export function classifyBehavior(m) {
    const states = [];
    
    // baseline.ear is the raw landmark ratio captured during the 3s calibration
    const baselineEAR = m.baseline?.ear || 0.3; 
    const blendshapes = m.blendshapes || [];
    const getProb = (name) => blendshapes.find(b => b.categoryName === name)?.score || 0;

    // --- PHASE 1: SIMPLE LAYER (Metric Heuristics) ---

    // MICROSLEEP: Hard metric for absolute safety
    if (m.closureDurationMs > 2500) {
        return ["microsleep"];
    }

    // DROWSY: Calibrated Identification
    // Use the ratio of current EAR to baseline open-eye EAR
    const earRatio = m.ear / baselineEAR; 
    const isBlinking = getProb("eyeBlinkLeft") > 0.75 || getProb("eyeBlinkRight") > 0.75;
    
    // Lower threshold (0.60) to avoid false positives from looking down
    if (earRatio < 0.60 || m.perclos > 0.22 || isBlinking) {
        states.push("drowsy");
    }

    // YAWNING: Base metric
    if (getProb("jawOpen") > 0.82) {
        states.push("drowsy");
    }

    // DISTRACTED: Direct Orientation Metrics
    if (Math.abs(m.headYaw) > 22 || Math.abs(m.headPitch) > 22) {
        states.push("distracted");
    }

    // PHONE USE: Object identification metric (More aggressive)
    if (m.phoneDetectedDurationMs > 400) {
        states.push("phone_use");
    }

    // --- PHASE 2: COMPOUND LAYER (Multi-Signal Scoring) ---
    // Runs independently of Phase 1 — intoxicated/medical can co-occur with drowsy/distracted.
    // Medical takes priority: if triggered, return immediately (severity 5, requires response).
    if (classifyMedical(m)) {
        return ["medical"];
    }
    if (classifyIntoxicated(m)) {
        states.push("intoxicated");
    }

    if (states.length === 0) return ["alert"];
    return [...new Set(states)];
}

export function behaviorSeverity(states) {
    const severityMap = { microsleep: 5, medical: 5, intoxicated: 4, drowsy: 3, phone_use: 2, distracted: 2, alert: 0 };
    return Math.max(...states.map(s => severityMap[s] ?? 0));
}

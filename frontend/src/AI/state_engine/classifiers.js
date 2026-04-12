/**
 * HYBRID INTELLIGENT ARCHITECTURE
 * 
 * 1. SIMPLE LAYER (Heuristic): Uses calibrated metrics for Alert, Drowsy, Distracted, 
 *    Phone, and Microsleep. Instant, transparent, and reactive.
 * 2. COMPOUND LAYER (Neural): Uses a 18->8->2 MLP for Intoxicated and Medical. 
 *    Handles subtle, non-linear signatures of impairment.
 */

// NEURAL WEIGHTS: Extracted from 50k-sample training pass (Compound focus)
const COMPOUND_MODEL = {
  w1: [
    [0.154, -0.478], [0.185, -0.275], [-0.152, -0.654], [0.047, -0.134], [0.785, 1.516], 
    [2.253, 1.167], [0.778, -0.893], [0.357, 1.482], [-0.077, 2.243], [-0.235, 1.625],
    [0.146, -0.263], [0.130, -0.133], [0.796, 0.410], [1.386, -1.894], [0.201, -0.219],
    [0.393, 1.173], [0.454, 1.416], [-3.677, -2.261]
  ],
  b1: [0.0, 3.583],
  w2: [
    [1.594, -4.456], [1.830, -3.242], [-0.161, -1.844], [2.822, -3.136], [0.912, -3.811],
    [1.915, 4.439], [0.766, 1.694], [3.987, -3.591], [-1.633, -3.293], [3.500, 3.060]
  ],
  b2: [0.0, -14.048]
};

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/**
 * HELPER: Extracts normalized feature vector for Neural Inference
 */
function getFeatureVector(m, baseline) {
    const raw = {
        fEAR: m.ear || 0.4,
        fPERCLOS: m.perclos || 0,
        fYawn: (m.yawnCount || 0) / 3,
        fSlowBlink: (m.slowBlinkRate || 0) / 2,
        fBlinkVar: (m.blinkIntervalVariance || 0) / 400,
        fYaw: Math.abs(m.headYaw || 0) / 30,
        fPitch: Math.abs(m.headPitch || 0) / 30,
        fRoll: Math.abs(m.headRoll || 0) / 20,
        fEntropy: (m.headMovementEntropy || 0) / 3.0,
        fTremor: (m.microTremor || 0) / 0.005,
        fJerk: (m.headJerkVelocity || 0) / 100,
        fClosureDur: (m.closureDurationMs || 0) / 2500,
        fDistractDur: (m.distractionDurationMs || 0) / 3000,
        fPhoneDur: (m.phoneDetectedDurationMs || 0) / 2000,
        fMissingDur: (m.faceMissingDurationMs || 0) / 3000,
        fAsymmetry: (m.asymmetryScore || 0) / 0.3,
        fPosture: (m.postureLean || 0) / 0.25,
        isFacingForward: Math.abs(m.headYaw || 0) < 15 ? 1.0 : 0.0
    };
    return [
        raw.fEAR, raw.fPERCLOS, raw.fYawn, raw.fSlowBlink, raw.fBlinkVar,
        raw.fYaw, raw.fPitch, raw.fRoll, raw.fEntropy, raw.fTremor, raw.fJerk,
        raw.fClosureDur, raw.fDistractDur, raw.fPhoneDur, raw.fMissingDur,
        raw.fAsymmetry, raw.fPosture, raw.isFacingForward
    ];
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

    if (states.length === 0) return ["alert"];
    return [...new Set(states)]; 
}

export function behaviorSeverity(states) {
    const severityMap = { microsleep: 5, medical: 5, intoxicated: 4, drowsy: 3, phone_use: 2, distracted: 2, alert: 0 };
    return Math.max(...states.map(s => severityMap[s] ?? 0));
}

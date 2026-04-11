/**
 * Eye metrics — MediaPipe 468-point mesh.
 *
 * Exports:
 *   getAverageEAR(landmarks)     — averaged EAR across both eyes
 *   getPerEyeEAR(landmarks)      — { leftEAR, rightEAR, asymmetry }
 *   getGazeDirection(landmarks)  — horizontal gaze ratio [0,1]
 *   getGazeVertical(landmarks)   — vertical gaze ratio [0,1] (0=up, 1=down)
 */

// ── Landmark index constants ──────────────────────────────────────────────────

const RIGHT_EYE_POINTS = [33, 160, 158, 133, 153, 144]; // Observer-left eye
const LEFT_EYE_POINTS  = [362, 385, 387, 263, 373, 380]; // Observer-right eye

// Iris centers (requires numIrises: 1 or more)
const LEFT_IRIS_CENTER  = 468;
const RIGHT_IRIS_CENTER = 473;

// Eye corners for gaze reference frame
const L_EYE_INNER  = 133;
const L_EYE_OUTER  = 33;
const R_EYE_INNER  = 362;
const R_EYE_OUTER  = 263;

// Vertical eye bounds for vertical gaze
const L_EYE_TOP    = 159;
const L_EYE_BOTTOM = 145;

function euclideanDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * EAR formula: (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 */
function calculateEAR(pointsArray, landmarks) {
    const [p1, p2, p3, p4, p5, p6] = pointsArray.map(i => landmarks[i]);
    const height1 = euclideanDistance(p2, p6);
    const height2 = euclideanDistance(p3, p5);
    const width   = euclideanDistance(p1, p4);
    if (width === 0) return 0;
    return (height1 + height2) / (2.0 * width);
}

/**
 * Average EAR across both eyes.
 */
export function getAverageEAR(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;
    const rightEAR = calculateEAR(RIGHT_EYE_POINTS, landmarks);
    const leftEAR  = calculateEAR(LEFT_EYE_POINTS,  landmarks);
    return (rightEAR + leftEAR) / 2.0;
}

/**
 * Per-eye EAR with asymmetry score.
 * asymmetry = |leftEAR - rightEAR| / avgEAR
 * High asymmetry (>0.25) indicates unilateral eye drooping — a stroke indicator.
 */
export function getPerEyeEAR(landmarks) {
    if (!landmarks || landmarks.length === 0) return { leftEAR: null, rightEAR: null, asymmetry: 0 };
    const rightEAR  = calculateEAR(RIGHT_EYE_POINTS, landmarks);
    const leftEAR   = calculateEAR(LEFT_EYE_POINTS,  landmarks);
    const avg       = (rightEAR + leftEAR) / 2.0;
    const asymmetry = avg > 0 ? Math.abs(rightEAR - leftEAR) / avg : 0;
    return { leftEAR, rightEAR, asymmetry };
}

/**
 * Horizontal gaze ratio via iris position.
 * ~0.5 = looking center. <0.4 or >0.6 = sideways.
 */
export function getGazeDirection(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0.5;
    const iris     = landmarks[LEFT_IRIS_CENTER];
    const eyeInner = landmarks[L_EYE_INNER];
    const eyeOuter = landmarks[L_EYE_OUTER];
    if (!iris || !eyeInner || !eyeOuter) return 0.5;
    const distCenterOuter = Math.hypot(iris.x - eyeOuter.x, iris.y - eyeOuter.y);
    const distTotalWidth  = Math.hypot(eyeInner.x - eyeOuter.x, eyeInner.y - eyeOuter.y);
    if (distTotalWidth === 0) return 0.5;
    return distCenterOuter / distTotalWidth;
}

/**
 * Vertical gaze ratio via iris vertical position within eye aperture.
 * 0.0 = looking up, 0.5 = center, 1.0 = looking down.
 * "Looking down" is a strong phone-use / texting co-signal.
 */
export function getGazeVertical(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0.5;
    const iris      = landmarks[LEFT_IRIS_CENTER];
    const eyeTop    = landmarks[L_EYE_TOP];
    const eyeBottom = landmarks[L_EYE_BOTTOM];
    if (!iris || !eyeTop || !eyeBottom) return 0.5;
    const totalHeight = Math.abs(eyeBottom.y - eyeTop.y);
    if (totalHeight === 0) return 0.5;
    return (iris.y - eyeTop.y) / totalHeight;
}

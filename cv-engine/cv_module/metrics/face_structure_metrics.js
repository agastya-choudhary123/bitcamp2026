/**
 * Face structure metrics — brow position, face area / lean.
 * Note: facial asymmetry has been merged into eye_metrics.js → getPerEyeEAR().asymmetryScore
 */

const LEFT_INNER_BROW  = 107;
const RIGHT_INNER_BROW = 336;
const LEFT_EYE_CORNER  = 33;
const RIGHT_EYE_CORNER = 263;

/**
 * Brow droop score [0,1] — higher = more drooped.
 * Normalized by face height. Used as a secondary drowsiness co-signal.
 */
export function getBrowPosition(landmarks) {
    if (!landmarks || landmarks.length < 340) return 0.5;
    const forehead  = landmarks[10];
    const chin      = landmarks[152];
    const faceH     = Math.abs(chin.y - forehead.y) || 1;
    const leftGap   = (landmarks[LEFT_EYE_CORNER].y  - landmarks[LEFT_INNER_BROW].y)  / faceH;
    const rightGap  = (landmarks[RIGHT_EYE_CORNER].y - landmarks[RIGHT_INNER_BROW].y) / faceH;
    return (leftGap + rightGap) / 2;
}

/**
 * Face area fraction of the frame [0,1].
 * Used to track slumping: if faceAreaRatio shrinks over time → driver moving away from camera.
 */
export function getFaceAreaRatio(landmarks, videoElement) {
    if (!landmarks || landmarks.length === 0) return 0;
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of landmarks) {
        if (lm.x < minX) minX = lm.x;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.y > maxY) maxY = lm.y;
    }
    return (maxX - minX) * (maxY - minY);
}

/**
 * Posture lean: horizontal offset of face centroid from frame center.
 * Positive = leaning right, negative = leaning left.
 * Value range roughly [-0.5, 0.5]; sustained |lean| > 0.15 = notable.
 */
export function getPostureLean(landmarks) {
    if (!landmarks || landmarks.length === 0) return 0;
    let sumX = 0;
    for (const lm of landmarks) sumX += lm.x;
    const centroidX = sumX / landmarks.length;
    return centroidX - 0.5; // Positive = leaning right of frame center
}

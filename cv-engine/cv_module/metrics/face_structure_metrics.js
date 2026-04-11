/**
 * Face structure metrics — derived from MediaPipe 468-point mesh.
 *
 * These metrics capture facial geometry that is relatively stable in normal
 * driving but deviates measurably under intoxication or medical distress.
 */

// ── Landmark index constants ──────────────────────────────────────────────────

// Nose centerline reference points
const NOSE_TIP   = 1;
const NOSE_BRIDGE = 6;

// Inner brow landmarks (for brow position / tension)
const LEFT_INNER_BROW  = 107; // Left brow inner corner (near nose)
const RIGHT_INNER_BROW = 336; // Right brow inner corner

// Left face landmarks (mirrored set for symmetry)
const LEFT_CHEEK_OUTER  = 234;
const LEFT_EYE_CORNER   = 33;
const LEFT_MOUTH_CORNER = 61;

// Right face landmarks
const RIGHT_CHEEK_OUTER  = 454;
const RIGHT_EYE_CORNER   = 263;
const RIGHT_MOUTH_CORNER = 291;

/**
 * Computes facial symmetry score (0 = perfectly symmetric, higher = more asymmetric).
 *
 * Method: compare the distance from each left landmark to the nose centerline
 * vs the corresponding right landmark. Stroke / medical events cause pronounced
 * unilateral droop that produces high asymmetry.
 *
 * Returns a ratio in range [0, ~0.5] where >0.08 is clinically notable.
 */
export function getFacialSymmetry(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0;

    const nose = landmarks[NOSE_TIP];

    // Measure horizontal distance (x-axis) from nose to each paired landmark
    const pairs = [
        [LEFT_CHEEK_OUTER, RIGHT_CHEEK_OUTER],
        [LEFT_EYE_CORNER,  RIGHT_EYE_CORNER],
        [LEFT_MOUTH_CORNER, RIGHT_MOUTH_CORNER]
    ];

    let totalAsymmetry = 0;
    for (const [leftIdx, rightIdx] of pairs) {
        const leftDist  = Math.abs(landmarks[leftIdx].x  - nose.x);
        const rightDist = Math.abs(landmarks[rightIdx].x - nose.x);
        const pairWidth = leftDist + rightDist;
        if (pairWidth > 0) {
            totalAsymmetry += Math.abs(leftDist - rightDist) / pairWidth;
        }
    }

    return totalAsymmetry / pairs.length; // Normalized average asymmetry ratio
}

/**
 * Returns normalized brow position (0 = fully raised, 1 = fully drooped).
 *
 * Method: measure vertical distance from inner brow to eye corner as a
 * fraction of face height. Drooping inner brows = drowsiness or heavy eyelids.
 */
export function getBrowPosition(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0.5;

    const leftBrow   = landmarks[LEFT_INNER_BROW];
    const rightBrow  = landmarks[RIGHT_INNER_BROW];
    const leftEye    = landmarks[LEFT_EYE_CORNER];
    const rightEye   = landmarks[RIGHT_EYE_CORNER];

    // Face height for normalization
    const forehead = landmarks[10];
    const chin     = landmarks[152];
    const faceHeight = Math.abs(chin.y - forehead.y) || 1;

    // Average vertical gap between brow and eye corner (normalized by face height)
    const leftGap  = (leftEye.y  - leftBrow.y)  / faceHeight;
    const rightGap = (rightEye.y - rightBrow.y)  / faceHeight;

    // Higher value = brow closer to eye = more drooped
    return (leftGap + rightGap) / 2;
}

/**
 * Returns face area as a fraction of the total frame area.
 *
 * Method: rough bounding box from extreme landmarks. If this shrinks over time,
 * the driver is slumping away from the camera (medical / loss of consciousness).
 */
export function getFaceAreaRatio(landmarks, videoElement) {
    if (!landmarks || landmarks.length === 0) return 0;
    if (!videoElement || !videoElement.videoWidth) return 0;

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of landmarks) {
        if (lm.x < minX) minX = lm.x;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.y > maxY) maxY = lm.y;
    }

    const faceArea = (maxX - minX) * (maxY - minY);
    return faceArea; // Already normalized [0,1] since landmarks are in [0,1]
}

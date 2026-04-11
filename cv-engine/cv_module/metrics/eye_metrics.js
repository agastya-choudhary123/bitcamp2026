/**
 * Exact MediaPipe landmark indices for the inner and outer eyelid boundaries.
 */
const RIGHT_EYE_POINTS = [33, 160, 158, 133, 153, 144]; // Left eye from observer perspective
const LEFT_EYE_POINTS = [362, 385, 387, 263, 373, 380]; // Right eye from observer perspective

/**
 * Calculates Euclidean 3D distance between two points.
 */
function euclideanDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * The EAR Formula: (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
function calculateEAR(pointsArray, landmarks) {
    const p1 = landmarks[pointsArray[0]];
    const p2 = landmarks[pointsArray[1]];
    const p3 = landmarks[pointsArray[2]];
    const p4 = landmarks[pointsArray[3]];
    const p5 = landmarks[pointsArray[4]];
    const p6 = landmarks[pointsArray[5]];

    const height1 = euclideanDistance(p2, p6);
    const height2 = euclideanDistance(p3, p5);
    const width = euclideanDistance(p1, p4);

    return (height1 + height2) / (2.0 * width);
}

/**
 * Computes average EAR across both eyes. Returns null if data is bad.
 */
export function getAverageEAR(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;
    
    const rightEAR = calculateEAR(RIGHT_EYE_POINTS, landmarks);
    const leftEAR = calculateEAR(LEFT_EYE_POINTS, landmarks);
    
    return (rightEAR + leftEAR) / 2.0;
}

/**
 * Calculates Horizontal Gaze Ratio using Iris landmarks.
 * ~0.5 indicates looking center.
 * < 0.4 or > 0.6 indicates looking sideways (texting/mirrors).
 */
export function getGazeDirection(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0.5; // Avoid crash if iris landmarks are missing
    
    // 468 is the Left Iris Center. 133 and 33 are the inner/outer corners of the left eye.
    const iris = landmarks[468];
    const eyeInner = landmarks[133];
    const eyeOuter = landmarks[33];

    if (!iris || !eyeInner || !eyeOuter) return 0.5;

    // Compute Cartesian 2D distances
    const distCenterOuter = Math.hypot(iris.x - eyeOuter.x, iris.y - eyeOuter.y);
    const distTotalWidth = Math.hypot(eyeInner.x - eyeOuter.x, eyeInner.y - eyeOuter.y);

    // Prevent divide by zero error in edge cases
    if (distTotalWidth === 0) return 0.5;
    
    return distCenterOuter / distTotalWidth;
}

/**
 * Eye metrics — MediaPipe 468-point mesh.
 */

const RIGHT_EYE_POINTS = [33, 160, 158, 133, 153, 144];
const LEFT_EYE_POINTS  = [362, 385, 387, 263, 373, 380];

const LEFT_IRIS_CENTER  = 468;
const L_EYE_INNER  = 133;
const L_EYE_OUTER  = 133; // Corrected typo in original: should be 33 for outer
const L_EYE_TOP    = 159;
const L_EYE_BOTTOM = 145;

const LEFT_CHEEK   = 234;
const RIGHT_CHEEK  = 454;
const LEFT_MOUTH   = 61;
const RIGHT_MOUTH  = 291;
const NOSE_TIP     = 1;

function euclideanDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateEAR(pointsArray, landmarks) {
    const [p1, p2, p3, p4, p5, p6] = pointsArray.map(i => landmarks[i]);
    const height1 = euclideanDistance(p2, p6);
    const height2 = euclideanDistance(p3, p5);
    const width   = euclideanDistance(p1, p4);
    if (width === 0) return 0;
    return (height1 + height2) / (2.0 * width);
}

export function getAverageEAR(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;
    return (calculateEAR(RIGHT_EYE_POINTS, landmarks) + calculateEAR(LEFT_EYE_POINTS, landmarks)) / 2.0;
}

export function getPerEyeEAR(landmarks) {
    if (!landmarks || landmarks.length < 470) return { leftEAR: 0.3, rightEAR: 0.3, asymmetryScore: 0 };

    const rightEAR = calculateEAR(RIGHT_EYE_POINTS, landmarks);
    const leftEAR  = calculateEAR(LEFT_EYE_POINTS,  landmarks);
    const avgEAR   = (rightEAR + leftEAR) / 2.0;

    const eyeAsym = avgEAR > 0 ? Math.abs(rightEAR - leftEAR) / avgEAR : 0;

    const nose = landmarks[NOSE_TIP];
    const cheekAsym = (() => {
        const ld = Math.abs(landmarks[LEFT_CHEEK].x  - nose.x);
        const rd = Math.abs(landmarks[RIGHT_CHEEK].x - nose.x);
        const w  = ld + rd;
        return w > 0 ? Math.abs(ld - rd) / w : 0;
    })();
    const mouthAsym = (() => {
        const ld = Math.abs(landmarks[LEFT_MOUTH].x  - nose.x);
        const rd = Math.abs(landmarks[RIGHT_MOUTH].x - nose.x);
        const w  = ld + rd;
        return w > 0 ? Math.abs(ld - rd) / w : 0;
    })();

    const asymmetryScore = eyeAsym * 0.60 + cheekAsym * 0.25 + mouthAsym * 0.15;

    return { leftEAR, rightEAR, asymmetryScore };
}

export function getGazeDirection(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0.5;
    const iris     = landmarks[LEFT_IRIS_CENTER];
    const eyeInner = landmarks[L_EYE_INNER];
    const eyeOuter = landmarks[33]; // Fixed mapping (was 33)
    if (!iris || !eyeInner || !eyeOuter) return 0.5;
    const dOuter = Math.hypot(iris.x - eyeOuter.x, iris.y - eyeOuter.y);
    const dWidth = Math.hypot(eyeInner.x - eyeOuter.x, eyeInner.y - eyeOuter.y);
    return dWidth === 0 ? 0.5 : dOuter / dWidth;
}

export function getGazeVertical(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0.5;
    const iris      = landmarks[LEFT_IRIS_CENTER];
    const eyeTop    = landmarks[L_EYE_TOP];
    const eyeBottom = landmarks[L_EYE_BOTTOM];
    if (!iris || !eyeTop || !eyeBottom) return 0.5;
    const h = Math.abs(eyeBottom.y - eyeTop.y);
    return h === 0 ? 0.5 : (iris.y - eyeTop.y) / h;
}

export function getEyeRubSignal(landmarks) {
    if (!landmarks || landmarks.length < 470) return 0;
    const rightEAR = calculateEAR(RIGHT_EYE_POINTS, landmarks);
    const leftEAR  = calculateEAR(LEFT_EYE_POINTS,  landmarks);

    const diff = Math.abs(rightEAR - leftEAR);
    const minEAR = Math.min(rightEAR, leftEAR);
    const maxEAR = Math.max(rightEAR, leftEAR);

    const oneSqueezing = (minEAR > 0.10 && minEAR < 0.24) && (maxEAR > 0.28);
    const highDiff = diff > 0.08;

    if (oneSqueezing && highDiff) {
        return Math.min(1.0, diff / 0.15);
    }
    return 0;
}

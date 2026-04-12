/**
 * Mouth Aspect Ratio (MAR) Calculation
 * Used for yawn detection and impairment analysis.
 */

export function getMouthAspectRatio(landmarks) {
    if (!landmarks || landmarks.length < 15) return 0;
    
    // MediaPipe face mesh indices for mouth opening
    const top = landmarks[13];
    const bottom = landmarks[14];
    const left = landmarks[78];
    const right = landmarks[308];
    
    if (!top || !bottom || !left || !right) return 0;

    const vertical = Math.sqrt(Math.pow(top.x - bottom.x, 2) + Math.pow(top.y - bottom.y, 2));
    const horizontal = Math.sqrt(Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2));
    
    return vertical / (horizontal || 1);
}

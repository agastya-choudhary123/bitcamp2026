/**
 * Extracts approximate Mouth Aspect Ratio (MAR) to detect yawns.
 */
export function getMouthAspectRatio(landmarks) {
    // MediaPipe Inner Lip points
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const leftCorner = landmarks[78];
    const rightCorner = landmarks[308];

    // Compute Vertical and Horizontal dimensions of mouth in 3D
    const height = Math.sqrt(Math.pow(topLip.x - bottomLip.x, 2) + Math.pow(topLip.y - bottomLip.y, 2) + Math.pow(topLip.z - bottomLip.z, 2));
    const width = Math.sqrt(Math.pow(leftCorner.x - rightCorner.x, 2) + Math.pow(leftCorner.y - rightCorner.y, 2) + Math.pow(leftCorner.z - rightCorner.z, 2));

    return height / width;
}

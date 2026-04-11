/**
 * Extracts approximate Pitch and Yaw of the head by comparing the 
 * relative Z-depths (distance from camera) of specific facial landmarks.
 */
export function getHeadPose(landmarks) {
    // Standard MediaPipe Mesh Index points
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftCheek = landmarks[234]; // Left side of face (from user perspective)
    const rightCheek = landmarks[454]; // Right side of face (from user perspective)

    // Calculate face 2D width and height for normalization
    const faceWidth = Math.sqrt(Math.pow(leftCheek.x - rightCheek.x, 2) + Math.pow(leftCheek.y - rightCheek.y, 2));
    const faceHeight = Math.sqrt(Math.pow(forehead.x - chin.x, 2) + Math.pow(forehead.y - chin.y, 2));

    // YAW (Left/Right)
    // If looking right, the right cheek is closer to the camera (smaller Z) than the left cheek.
    const yawRatio = (leftCheek.z - rightCheek.z) / faceWidth; 
    
    // PITCH (Up/Down)
    // If looking down, the forehead is closer to the camera (smaller Z) than the chin.
    const pitchRatio = (chin.z - forehead.z) / faceHeight;

    // Convert these ratios into roughly degree-like numbers for easy thresholding
    return {
        yaw: yawRatio * 100,
        pitch: pitchRatio * 100
    };
}

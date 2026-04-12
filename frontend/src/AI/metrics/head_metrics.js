/**
 * Head pose metrics — derived from MediaPipe face mesh Z-depth differentials.
 */

export function getHeadPose(landmarks) {
    const forehead    = landmarks[10];
    const chin        = landmarks[152];
    const leftCheek   = landmarks[234]; // Left from user's perspective
    const rightCheek  = landmarks[454]; // Right from user's perspective

    const faceWidth  = Math.sqrt(
        Math.pow(leftCheek.x - rightCheek.x, 2) +
        Math.pow(leftCheek.y - rightCheek.y, 2)
    );
    const faceHeight = Math.sqrt(
        Math.pow(forehead.x - chin.x, 2) +
        Math.pow(forehead.y - chin.y, 2)
    );

    // YAW (Left/Right rotation):
    const yaw = faceWidth > 0
        ? (leftCheek.z - rightCheek.z) / faceWidth * 100
        : 0;

    // PITCH (Up/Down tilt):
    const pitch = faceHeight > 0
        ? (chin.z - forehead.z) / faceHeight * 100
        : 0;

    // ROLL (Side tilt):
    const leftEyeCorner  = landmarks[33];
    const rightEyeCorner = landmarks[263];
    const interEyeDist   = Math.sqrt(
        Math.pow(leftEyeCorner.x - rightEyeCorner.x, 2) +
        Math.pow(leftEyeCorner.y - rightEyeCorner.y, 2)
    );
    const roll = interEyeDist > 0
        ? (rightEyeCorner.y - leftEyeCorner.y) / interEyeDist * 100
        : 0;

    return { pitch, yaw, roll };
}

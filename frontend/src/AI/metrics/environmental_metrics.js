/**
 * Dedicated off-screen canvas to capture a tiny version of the video frame.
 * Downscaling to 64x48 saves massive CPU time when reading pixels manually.
 */
const offscreenCanvas = typeof document !== 'undefined' ? document.createElement("canvas") : null;
if (offscreenCanvas) {
    offscreenCanvas.width = 64;
    offscreenCanvas.height = 48;
}
const offCtx = offscreenCanvas ? offscreenCanvas.getContext("2d", { willReadFrequently: true }) : null;

export function calculateVisibilityMetrics(videoElement) {
    if (!offCtx) return { sceneBrightness: 128, visibilityCondition: "normal_visibility" };

    // Render the current video frame into the tiny canvas
    offCtx.drawImage(videoElement, 0, 0, 64, 48);
    
    // Extract raw RGB arrays
    const imageData = offCtx.getImageData(0, 0, 64, 48);
    const data = imageData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = 64 * 48;

    for (let i = 0; i < data.length; i += 4) {
        totalR += data[i];     // Red
        totalG += data[i + 1]; // Green
        totalB += data[i + 2]; // Blue
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;

    // Standard formula to map RGB to human-perceived luminance/brightness
    const brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

    let condition = "normal_visibility";
    if (brightness < 40) condition = "low_light";
    else if (brightness > 220) condition = "glare";

    return {
        sceneBrightness: brightness,
        visibilityCondition: condition
    };
}

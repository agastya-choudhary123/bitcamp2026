/**
 * Requests access to the webcam and binds the stream to a <video> element.
 */
export async function startWebcam(videoElement) {
    try {
        const constraints = {
            video: {
                width: 640,
                height: 480,
                facingMode: "user" // Force front-facing camera
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;

        // Return a promise that resolves once the video starts playing
        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });
    } catch (error) {
        console.error("Error accessing webcam: ", error);
        throw error;
    }
}

/**
 * Loads a pure video file into the video element for dashcam testing.
 */
export async function startUploadedVideo(videoElement, file) {
    const fileURL = URL.createObjectURL(file);
    videoElement.srcObject = null; // Unhook webcam if attached
    videoElement.src = fileURL;
    videoElement.loop = true; // Auto-loop dashcam footage

    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve();
        };
    });
}

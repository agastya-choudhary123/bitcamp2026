/**
 * Requests access to the webcam and binds the stream to a <video> element.
 */
export async function startWebcam(videoElement) {
    console.log("[Camera] Requesting webcam access...");
    try {
        const constraints = {
            video: {
                width: 640,
                height: 480,
                facingMode: "user"
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("[Camera] Permission granted, stream received.");
        
        videoElement.srcObject = stream;

        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                console.log("[Camera] Metadata loaded. Dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
                videoElement.play();
                resolve();
            };
        });
    } catch (error) {
        console.error("[Camera] FAILED to access webcam:", error);
        throw error;
    }
}

/**
 * Loads a pure video file into the video element for dashcam testing.
 */
export async function startUploadedVideo(videoElement, file) {
    console.log("[Camera] Loading uploaded video file:", file.name);
    const fileURL = URL.createObjectURL(file);
    videoElement.srcObject = null;
    videoElement.src = fileURL;
    videoElement.loop = true;

    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            resolve();
        };
    });
}

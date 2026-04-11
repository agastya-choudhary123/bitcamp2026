import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";

export class FaceLandmarkerManager {
    constructor() {
        this.faceLandmarker = null;
    }

    /**
     * Initializes the MediaPipe WASM files and the FaceLandmarker model pipeline.
     */
    async initialize() {
        if (this.faceLandmarker) return;
        
        // Load the WASM binary dependencies
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        // Initialize the model
        this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU" // Offload compute to the MacBook's GPU
            },
            outputFaceBlendshapes: false, // We only need the 3D coordinates, not the Apple blendshapes
            runningMode: "VIDEO",
            numFaces: 1 // We only care about the driver
        });
        
        console.log("MediaPipe FaceLandmarker loaded successfully.");
    }

    /**
     * Runs face tracking on a single frame of the video.
     */
    predictVideo(videoElement, timestampMs) {
        if (!this.faceLandmarker) return null;
        return this.faceLandmarker.detectForVideo(videoElement, timestampMs);
    }
}

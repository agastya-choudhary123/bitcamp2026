import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class FaceLandmarkerManager {
    constructor() {
        this.faceLandmarker = null;
    }

    /**
     * Initializes the MediaPipe WASM files and the FaceLandmarker model pipeline.
     */
    async initialize() {
        if (this.faceLandmarker) return;
        
        console.log("[AI] Starting MediaPipe FaceLandmarker initialization...");
        try {
            // Load the WASM binary dependencies
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
            );
            console.log("[AI] FilesetResolver loaded successfully.");
            
            // Initialize the model
            this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
            console.log("[AI] FaceLandmarker engine created successfully.");
        } catch (error) {
            console.error("[AI] FAILED to initialize FaceLandmarker:", error);
            throw error;
        }
    }

    /**
     * Runs face tracking on a single frame of the video.
     */
    predictVideo(videoElement, timestampMs) {
        if (!this.faceLandmarker) return null;
        try {
            return this.faceLandmarker.detectForVideo(videoElement, timestampMs);
        } catch (error) {
            console.error("[AI] Error during prediction frame:", error);
            return null;
        }
    }
}

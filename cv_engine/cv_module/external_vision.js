/**
 * Wrapper for TensorFlow.js COCO-SSD Object Detection model.
 */
export class ExternalVisionManager {
    constructor() {
        this.model = null;
    }

    async initialize() {
        // Load the lightweight mobile-net COCO-SSD model from the global scope (CDN)
        if (window.cocoSsd) {
            this.model = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
            console.log("[CV Engine] TensorFlow.js COCO-SSD Model Loaded!");
        } else {
            console.error("[CV Engine] COCO-SSD script not found in window object.");
        }
    }

    async predict(videoElement) {
        if (!this.model) return [];
        if (videoElement.readyState < 2) return []; // Make sure video is playing

        // Returns an array of bounding box predictions
        // e.g. [{class: 'car', score: 0.9, bbox: [x, y, width, height]}, ...]
        const predictions = await this.model.detect(videoElement);
        return predictions;
    }
}

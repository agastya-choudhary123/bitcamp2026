/**
 * Crash detection using TTC (Time-to-Collision) estimation.
 *
 * Method: track the bounding box area ratio of the largest threat object
 * over a rolling 2-second window (~10 frames at 5fps). A rapid area growth
 * rate signals an object rushing toward the camera (pre-impact). A sudden
 * collapse in area after a large value signals scene obstruction (post-impact).
 *
 * States:
 *   "clear"           — no crash indicators
 *   "crash_imminent"  — object growing fast, TTC < ~1.5s
 *   "crash_detected"  — post-impact: large object vanished (airbag / obstruction)
 */
export class CrashDetector {
    constructor({ windowSize = 10, imminentGrowthRate = 0.08, dropThreshold = 0.30 } = {}) {
        // windowSize: number of frames to keep (~10 frames = 2s at 5fps)
        this.windowSize = windowSize;
        // imminentGrowthRate: average per-frame area growth rate that triggers crash_imminent
        // 0.08 means the object grows by 8% of screen area per frame on average
        this.imminentGrowthRate = imminentGrowthRate;
        // dropThreshold: if area was above this and drops to near-zero → post-impact
        this.dropThreshold = dropThreshold;
        this.history = []; // [{area, ts}]
    }

    update(maxHazardArea) {
        const now = Date.now();
        this.history.push({ area: maxHazardArea, ts: now });

        // Keep only the last windowSize frames
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }

        if (this.history.length < 3) return "clear";

        const oldest = this.history[0].area;
        const latest = this.history[this.history.length - 1].area;
        const frames = this.history.length - 1;

        // Average per-frame growth in area ratio
        const avgGrowthPerFrame = (latest - oldest) / frames;

        // Post-impact: object was large, now gone (airbag / damage blocking view)
        const prevPeak = Math.max(...this.history.slice(0, -2).map(h => h.area));
        if (prevPeak >= this.dropThreshold && latest < 0.05) {
            return "crash_detected";
        }

        // Pre-impact: object approaching rapidly
        if (avgGrowthPerFrame >= this.imminentGrowthRate && latest > 0.10) {
            return "crash_imminent";
        }

        return "clear";
    }

    reset() {
        this.history = [];
    }
}

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

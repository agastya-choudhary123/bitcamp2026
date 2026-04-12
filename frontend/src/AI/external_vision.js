import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

/**
 * Crash detection using TTC (Time-to-Collision) estimation.
 */
export class CrashDetector {
    constructor({ windowSize = 10, imminentGrowthRate = 0.08, dropThreshold = 0.30 } = {}) {
        this.windowSize = windowSize;
        this.imminentGrowthRate = imminentGrowthRate;
        this.dropThreshold = dropThreshold;
        this.history = []; // [{area, ts}]
    }

    update(maxHazardArea) {
        const now = Date.now();
        this.history.push({ area: maxHazardArea, ts: now });

        if (this.history.length > this.windowSize) {
            this.history.shift();
        }

        if (this.history.length < 3) return "clear";

        const oldest = this.history[0].area;
        const latest = this.history[this.history.length - 1].area;
        const frames = this.history.length - 1;

        const avgGrowthPerFrame = (latest - oldest) / frames;

        const prevPeak = Math.max(...this.history.slice(0, -2).map(h => h.area));
        if (prevPeak >= this.dropThreshold && latest < 0.05) {
            return "crash_detected";
        }

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
        if (this.model) return;
        try {
            this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            console.log("[AI Pipeline] TensorFlow.js COCO-SSD Model Loaded!");
        } catch (e) {
            console.error("[AI Pipeline] Failed to load COCO-SSD:", e);
        }
    }

    async predict(videoElement) {
        if (!this.model) return [];
        if (videoElement.readyState < 2) return [];

        const predictions = await this.model.detect(videoElement);
        return predictions;
    }
}

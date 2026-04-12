/**
 * TIERED STATE STABILIZER
 * 
 * Implements specific timing windows based on state severity:
 * - BEHAVIORAL (Drowsy, Phone, Distracted): Fast onset (250ms), Solid recovery (1s)
 * - CRITICAL (Intoxicated, Medical): Robust confirmation (1.2s), Long recovery (3s)
 */

export class StateStabilizer {
    constructor() {
        this.timers = {}; // State -> { onsetTs, lastSeenTs }
        this.activeStates = new Set();
        
        // States that require robust confirmation and long cooldowns
        this.criticalStates = ["intoxicated", "medical"];
    }

    /**
     * Process classifications with tiered hysteresis logic.
     * @param {number} timestamp - Performance.now()
     * @param {string[]} rawStates - Raw frame detections
     */
    process(timestamp, rawStates) {
        const currentFrameSet = new Set(rawStates);
        const results = new Set();
        
        // Determine all states currently relevant (either seen now or active in UI)
        const relevantStates = new Set([...rawStates, ...this.activeStates]);

        for (const state of relevantStates) {
            if (state === "alert") continue;

            const isCritical = this.criticalStates.includes(state);
            const isDetected = currentFrameSet.has(state);
            
            // TIERED TIMING CONFIG
            const ON_DELAY  = isCritical ? 3000 : 650;
            const OFF_DELAY = isCritical ? 3000 : 1000;

            if (!this.activeStates.has(state)) {
                // ── QUALIFICATION ──
                if (isDetected) {
                    if (!this.timers[state]) {
                        this.timers[state] = { onsetTs: timestamp, lastSeenTs: timestamp };
                    } else {
                        this.timers[state].lastSeenTs = timestamp;
                    }

                    // Confirm behavior over the On-Delay window
                    if (timestamp - this.timers[state].onsetTs >= ON_DELAY) {
                        this.activeStates.add(state);
                    }
                } else {
                    // Canceled before qualification
                    delete this.timers[state];
                }
            } else {
                // ── COOLDOWN (Hysteresis) ──
                if (isDetected) {
                    this.timers[state].lastSeenTs = timestamp;
                } else {
                    const silence = timestamp - this.timers[state].lastSeenTs;
                    // Only release after 'Proof of Calmness' window
                    if (silence >= OFF_DELAY) {
                        this.activeStates.delete(state);
                        delete this.timers[state];
                    }
                }
            }

            // If it's active in the stability layer, add to results
            if (this.activeStates.has(state)) {
                results.add(state);
            }
        }

        // Final result mapping
        if (results.size === 0) return ["alert"];
        
        const finalArr = Array.from(results);
        // Ensure "alert" isn't mixed with active risks for cleaner UI
        if (finalArr.length > 1 && finalArr.includes("alert")) {
            return finalArr.filter(s => s !== "alert");
        }
        return finalArr;
    }
}

export const behaviorStabilizer = new StateStabilizer();

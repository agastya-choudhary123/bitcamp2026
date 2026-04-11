/**
 * This object represents the canonical "live" CV State.
 * The rest of the team will eventually read from this object.
 */
export const CvState = {
    timestamp: 0,
    internal: {
        faceDetected: false,
        drowsiness: {
            avgEAR: null,
            perclos30s: null,
            blinkRatePerMin: 0,
            mar: null,
            state: "alert"
        },
        distraction: {
            headPitch: null,
            headYaw: null,
            state: "attentive"
        },
        impairment: {
            state: "normal"
        }
    },
    external: {
        visibility: {
            sceneBrightness: null,
            state: "normal_visibility"
        },
        forwardHazard: {
            state: "clear"
        },
        crash: {
            state: "clear"  // "clear" | "crash_imminent" | "crash_detected"
        }
    }
};

/**
 * Helper function to safely update the shared state.
 */
export function updateSharedState(newStateDelta) {
    if (newStateDelta.internal) {
        if (newStateDelta.internal.drowsiness !== undefined) {
            Object.assign(CvState.internal.drowsiness, newStateDelta.internal.drowsiness);
        }
        if (newStateDelta.internal.distraction !== undefined) {
            Object.assign(CvState.internal.distraction, newStateDelta.internal.distraction);
        }
        if (newStateDelta.internal.impairment !== undefined) {
            Object.assign(CvState.internal.impairment, newStateDelta.internal.impairment);
        }
        if (newStateDelta.internal.faceDetected !== undefined) {
            CvState.internal.faceDetected = newStateDelta.internal.faceDetected;
        }
    }
    
    // Support external state updates
    if (newStateDelta.external) {
        if (newStateDelta.external.visibility !== undefined) {
            Object.assign(CvState.external.visibility, newStateDelta.external.visibility);
        }
        if (newStateDelta.external.forwardHazard !== undefined) {
            Object.assign(CvState.external.forwardHazard, newStateDelta.external.forwardHazard);
        }
        if (newStateDelta.external.crash !== undefined) {
            Object.assign(CvState.external.crash, newStateDelta.external.crash);
        }
    }
    
    CvState.timestamp = Date.now();
    return CvState;
}

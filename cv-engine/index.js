import { startWebcam, startUploadedVideo } from './cv_module/capture.js';
import { FaceLandmarkerManager } from './cv_module/mediapipe_vision.js';
import { ExternalVisionManager, CrashDetector } from './cv_module/external_vision.js';
import { getAverageEAR, getGazeDirection } from './cv_module/metrics/eye_metrics.js';
import { getHeadPose } from './cv_module/metrics/head_metrics.js';
import { calculateVisibilityMetrics } from './cv_module/metrics/environmental_metrics.js';
import { getMouthAspectRatio } from './cv_module/metrics/mouth_metrics.js';
import { drowsinessSmoother } from './cv_module/state_engine/smoothing.js';
import { classifyDrowsiness, classifyDistraction, classifyImpairment } from './cv_module/state_engine/classifiers.js';
import { CvState, updateSharedState } from './cv_module/shared_state.js';
import { DrawingUtils, FaceLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm';

const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("overlay");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const cameraSelect = document.getElementById("cameraSource");
const videoUploadDom = document.getElementById("videoUpload"); // Step 9: Media upload
const calibrateButton = document.getElementById("calibrateButton");
const logs = document.getElementById("logs");

const liveEARDom = document.getElementById("liveEAR");
const livePerclosDom = document.getElementById("livePERCLOS");
const liveStateDom = document.getElementById("liveState");

const liveBlinksDom = document.getElementById("liveBlinks");
const liveMARDom = document.getElementById("liveMAR");
const livePitchDom = document.getElementById("livePitch");
const liveYawDom = document.getElementById("liveYaw");
const liveGazeDom = document.getElementById("liveGaze");
const liveNodDom = document.getElementById("liveNod");
const liveDistractionStateDom = document.getElementById("liveDistractionState");
const liveImpairmentStateDom = document.getElementById("liveImpairmentState");

const liveBrightnessDom = document.getElementById("liveBrightness");
const liveVisibilityStateDom = document.getElementById("liveVisibilityState");
const liveHazardStateDom = document.getElementById("liveHazardState");

const faceManager = new FaceLandmarkerManager();
const externalVision = new ExternalVisionManager();
const crashDetector = new CrashDetector();
let lastVideoTime = -1;
let lastVisibilityCheckTime = 0;
let lastHazardCheckTime = 0;
let lastLogTime = 0;
let sessionId = "session_" + Math.random().toString(36).substr(2, 9);
let currentStream = null;
let isRecordingAnomaly = false;

// Calibration tracking for offset dashcams
let baselinePitch = 0;
let baselineYaw = 0;
let lastRawPitch = 0;
let lastRawYaw = 0;
let framesWithFace = 0;
let hasAutoCalibrated = false;

function log(msg) {
    logs.innerHTML += `<div>> ${msg}</div>`;
    logs.scrollTop = logs.scrollHeight;
}

calibrateButton.addEventListener("click", () => {
    baselinePitch = lastRawPitch;
    baselineYaw = lastRawYaw;
    log(`Camera alignment calibrated! 0-point offset: Pitch ${baselinePitch.toFixed(1)}, Yaw ${baselineYaw.toFixed(1)}`);
});

// Populate Cameras on Load
async function loadCameras() {
    try {
        // Request base permissions to expose labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        cameraSelect.innerHTML = '';
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(option);
        });
        
        log(`Found ${videoDevices.length} camera(s) connected! Use dropdown to select iPhone.`);
    } catch (e) {
        log(`Camera access denied or error: ${e.message}`);
    }
}
window.addEventListener('DOMContentLoaded', loadCameras);

startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    
    log("Downloading FaceLandmarker models (this may take a few seconds)...");
    await faceManager.initialize();

    log("Downloading TensorFlow COCO-SSD models...");
    await externalVision.initialize();
    
    log("Requesting exact camera feed from selection...");
    const selectedDeviceId = cameraSelect.value;
    
    const constraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
    };
    
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
    videoElement.play();
    
    log("Webcam started. Running inference loop!");
    requestAnimationFrame(inferenceLoop);
});

// Step 9: Allow uploaded video instead of webcam
videoUploadDom.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    startButton.disabled = true;
    log("Downloading FaceLandmarker models (this may take a few seconds)...");
    await faceManager.initialize();

    log("Downloading TensorFlow COCO-SSD models...");
    await externalVision.initialize();
    
    log("Loading uploaded video...");
    await startUploadedVideo(videoElement, file);
    
    log("Uploaded Video playing. Running inference loop!");
    requestAnimationFrame(inferenceLoop);
});

// This is the core run-loop that will execute 30 times a second
function inferenceLoop() {
    let nowInMs = performance.now();
    
    // Only run inference if there is a new frame to process
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;

        // --- STEP 10: VISIBILITY/ENVIRONMENT ENGINE (~2 times a sec) ---
        if (nowInMs - lastVisibilityCheckTime > 500) {
            lastVisibilityCheckTime = nowInMs;
            const visibility = calculateVisibilityMetrics(videoElement);
            
            updateSharedState({ external: { visibility } });
            
            liveBrightnessDom.innerText = `BRIGHTNESS: ${Math.floor(visibility.sceneBrightness)}`;
            liveVisibilityStateDom.innerText = `[ ${visibility.visibilityCondition} ]`;
            
            if (visibility.visibilityCondition === "low_light") liveVisibilityStateDom.style.color = "yellow";
            else if (visibility.visibilityCondition === "glare") liveVisibilityStateDom.style.color = "orange";
            else liveVisibilityStateDom.style.color = "lightgreen";
        }

        // --- STEP 11: EXTERNAL HAZARD ENGINE (~5 times a sec) ---
        // We do *not* use await here, because detecting bounding boxes takes longer and we don't want to freeze MediaPipe!
        if (nowInMs - lastHazardCheckTime > 200) {
            lastHazardCheckTime = nowInMs;
            
            externalVision.predict(videoElement).then(predictions => {
                let maxHazardArea = 0;
                let hazardClass = "none";
                
                // Track relevant road/pedestrian categories
                for (let p of predictions) {
                    if (["car", "truck", "bus", "person", "bicycle", "motorcycle"].includes(p.class)) {
                        // Calculate area as a percentage of the entire video screen
                        const boundingArea = p.bbox[2] * p.bbox[3];
                        const screenArea = videoElement.videoWidth * videoElement.videoHeight;
                        const ratio = boundingArea / (screenArea || 1);
                        
                        if (ratio > maxHazardArea) {
                            maxHazardArea = ratio;
                            hazardClass = p.class;
                        }
                    }
                }
                
                // Hazard classification heuristics based on Area Ratio (how close it is)
                let stringHazard = "clear";
                if (maxHazardArea > 0.40) stringHazard = "immediate_forward_risk";
                else if (maxHazardArea > 0.15) stringHazard = "hazard_ahead";

                // Crash detection via TTC (bounding box growth rate)
                const stringCrash = crashDetector.update(maxHazardArea);

                updateSharedState({
                    external: {
                        forwardHazard: {
                            state: stringHazard,
                            primaryTarget: hazardClass,
                            targetSizeRatio: maxHazardArea
                        },
                        crash: {
                            state: stringCrash
                        }
                    }
                });

                if (liveHazardStateDom) {
                    const crashLabel = stringCrash !== "clear" ? ` | CRASH: ${stringCrash}` : "";
                    liveHazardStateDom.innerText = `[ ${stringHazard} ] (${maxHazardArea > 0 ? hazardClass + " " + (maxHazardArea*100).toFixed(0) + "%" : "no targets"})${crashLabel}`;
                    liveHazardStateDom.style.color = stringCrash !== "clear" ? "red" : (stringHazard === "clear") ? "lightgreen" : (stringHazard === "hazard_ahead") ? "orange" : "red";
                }
            }).catch(e => console.error("TF prediction error: ", e));
        }
        
        // 1. Get exact point coordinates of the face from MediaPipe
        const results = faceManager.predictVideo(videoElement, nowInMs);
        
        // 2. Clear out the previous drawings from the canvas
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // 3. If we found a face, process it!
        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
            drowsinessSmoother.pushFaceDetected(nowInMs, true);
            const landmarks = results.faceLandmarks[0]; // We only care about numFaces: 1
            
            // --- STEP 4 & 6: CALCULATE METRICS ---
            const ear = getAverageEAR(landmarks);
            const gazeRatio = getGazeDirection(landmarks);
            
            // Extract raw angles from camera plane
            const rawPose = getHeadPose(landmarks);
            lastRawPitch = rawPose.pitch;
            lastRawYaw = rawPose.yaw;
            
            // Auto-calibrate on the ~30th consecutive detected frame (roughly 1 second in)
            framesWithFace++;
            if (framesWithFace === 30 && !hasAutoCalibrated) {
                baselinePitch = lastRawPitch;
                baselineYaw = lastRawYaw;
                hasAutoCalibrated = true;
                log(`Auto-calibrated initial posture! (Pitch: ${baselinePitch.toFixed(1)}, Yaw: ${baselineYaw.toFixed(1)})`);
            }

            // Adjust angles using our arbitrary calibration origin
            const pose = {
                pitch: rawPose.pitch - baselinePitch,
                yaw: rawPose.yaw - baselineYaw
            };

            const mar = getMouthAspectRatio(landmarks);
            
            // --- STEP 5: TEMPORAL SMOOTHING ---
            drowsinessSmoother.pushEAR(nowInMs, ear);
            drowsinessSmoother.pushHeadPose(nowInMs, pose.pitch, pose.yaw);

            const perclos = drowsinessSmoother.getPERCLOS();
            const closureDuration = drowsinessSmoother.getEyeClosureDurationMs(nowInMs);
            const distractionDuration = drowsinessSmoother.getDistractionDurationMs(nowInMs);
            const faceMissingDuration = drowsinessSmoother.getFaceMissingDurationMs(nowInMs);
            const blinkRate = drowsinessSmoother.getBlinkRatePerMinute();
            
            const progressiveRatio = drowsinessSmoother.getProgressiveFatigueRatio();
            const headJerkVelocity = drowsinessSmoother.headJerkVelocity;
            
            // --- STEP 7 & 8: STATE CLASSIFICATION ---
            const stringState = classifyDrowsiness(perclos, closureDuration, progressiveRatio);
            const stringDistraction = classifyDistraction(pose.pitch, pose.yaw, distractionDuration, faceMissingDuration, gazeRatio, headJerkVelocity);
            const stringImpairment = classifyImpairment(closureDuration, pose.pitch, distractionDuration, faceMissingDuration);

            // Update the shared state output object
            updateSharedState({
                internal: {
                    faceDetected: true,
                    drowsiness: {
                        avgEAR: ear,
                        perclos30s: perclos,
                        blinkRatePerMin: blinkRate,
                        mar: mar,
                        eyeClosureDurationMs: closureDuration,
                        state: stringState
                    },
                    distraction: {
                        headPitch: pose.pitch,
                        headYaw: pose.yaw,
                        state: stringDistraction
                    },
                    impairment: {
                        state: stringImpairment
                    }
                }
            });

            // --- Update UI Fast ---
            liveEARDom.innerText = `EAR: ${ear.toFixed(3)}`;
            liveEARDom.style.color = (ear < 0.22) ? "red" : "lightgreen";
            
            livePerclosDom.innerText = `PERCLOS: ${(perclos * 100).toFixed(1)}%`;
            livePerclosDom.style.color = (perclos > 0.15) ? "red" : (perclos > 0.10) ? "orange" : "lightgreen";
            
            liveBlinksDom.innerText = `BLINKS/MIN: ${blinkRate}`;
            liveMARDom.innerText = `MAR (Yawn): ${mar.toFixed(3)}`;
            liveMARDom.style.color = (mar > 0.5) ? "orange" : "white";

            liveStateDom.innerText = `[ ${stringState} ]`;
            if (stringState === "microsleep_risk") liveStateDom.style.color = "red";
            else if (stringState === "drowsy_warning") liveStateDom.style.color = "orange";
            else if (stringState === "fatigue_suspected" || stringState === "progressive_fatigue") liveStateDom.style.color = "yellow";
            else liveStateDom.style.color = "lightgreen";

            livePitchDom.innerText = `PITCH: ${pose.pitch.toFixed(1)}`;
            livePitchDom.style.color = (pose.pitch > 15) ? "red" : "white";

            liveYawDom.innerText = `YAW: ${pose.yaw.toFixed(1)}`;
            liveYawDom.style.color = (Math.abs(pose.yaw) > 15) ? "red" : "white";

            liveGazeDom.innerText = `GAZE (Ratio): ${gazeRatio.toFixed(2)}`;
            liveGazeDom.style.color = (gazeRatio < 0.35 || gazeRatio > 0.65) ? "red" : "white";
            
            liveNodDom.innerText = `VELOCITY: ${headJerkVelocity.toFixed(0)}°/s`;
            liveNodDom.style.color = (headJerkVelocity > 60) ? "red" : "white";

            liveDistractionStateDom.innerText = `[ ${stringDistraction} ]`;
            if (stringDistraction === "sudden_head_jerk" || stringDistraction === "texting_gaze_detected") liveDistractionStateDom.style.color = "red";
            else liveDistractionStateDom.style.color = (stringDistraction === "attentive") ? "lightgreen" : "orange";

            liveImpairmentStateDom.innerText = `[ ${stringImpairment} ]`;
            if (stringImpairment === "possible_incapacitation" || stringImpairment === "non_responsive_emergency") liveImpairmentStateDom.style.color = "red";
            else if (stringImpairment === "possible_impairment") liveImpairmentStateDom.style.color = "orange";
            else liveImpairmentStateDom.style.color = "lightgreen";

            // Draw the graphical mesh (keep this for debugging)
            const drawingUtils = new DrawingUtils(canvasCtx);
            for (const face of results.faceLandmarks) {
                drawingUtils.drawConnectors(
                    face,
                    FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                    { color: "#C0C0C070", lineWidth: 1 }
                );
            }
        } else {
            // Face missing logic
            framesWithFace = 0; // Reset consecutive frame counter if face is lost before calibration
            
            drowsinessSmoother.pushFaceDetected(nowInMs, false);
            const faceMissingDuration = drowsinessSmoother.getFaceMissingDurationMs(nowInMs);
            const stringDistraction = classifyDistraction(0, 0, 0, faceMissingDuration);
            const stringImpairment = classifyImpairment(0, 0, 0, faceMissingDuration);

            updateSharedState({ 
                internal: { 
                    faceDetected: false,
                    distraction: {
                        state: stringDistraction
                    },
                    impairment: {
                        state: stringImpairment
                    }
                } 
            });
            
            liveEARDom.innerText = `EAR: ---`;
            liveEARDom.style.color = "white";

            liveGazeDom.innerText = `GAZE (Ratio): ---`;
            liveNodDom.innerText = `VELOCITY: ---`;

            liveDistractionStateDom.innerText = `[ ${stringDistraction} ]`;
            liveDistractionStateDom.style.color = (stringDistraction === "attentive") ? "lightgreen" : "red";

            liveImpairmentStateDom.innerText = `[ ${stringImpairment} ]`;
            liveImpairmentStateDom.style.color = (stringImpairment === "normal") ? "lightgreen" : "red";
        }

        // --- STEP 12: LOGGING & ANOMALY HANDLING ---
        const state = CvState.internal?.drowsiness?.state;
        const hazard = CvState.external?.forwardHazard?.state;
        const impairment = CvState.internal?.impairment?.state;
        
        const distraction = CvState.internal?.distraction?.state;
        const isDistracted = distraction && distraction !== "attentive";
        const isAnomaly = state !== "awake" || hazard !== "clear" || impairment !== "normal";

        // Immediate anomaly logging + clipping
        if ((isAnomaly || isDistracted) && !isRecordingAnomaly) {
            log(`[ANOMALY] ${state} / ${hazard} / distraction: ${distraction}. Clipping footage...`);
            handleAnomaly(CvState);
        }

        // Routine periodic logging (every 3 seconds)
        if (nowInMs - lastLogTime > 3000) {
            lastLogTime = nowInMs;
            pushLog(CvState, false);
        }
    }
    
    // Schedule the next loop iteration exactly when the browser paints the next frame
    window.requestAnimationFrame(inferenceLoop);
}

async function pushLog(state, isAnomaly, clip = null) {
    // Map internal state to drowsinessLevel 0-3
    const drowsinessState = state.internal?.drowsiness?.state || "awake";
    let drowsinessLevel = 0;
    if (drowsinessState === "microsleep_risk") drowsinessLevel = 3;
    else if (drowsinessState === "drowsy_warning") drowsinessLevel = 2;
    else if (drowsinessState.includes("fatigue")) drowsinessLevel = 1;

    const driverNameInput = document.getElementById("driver-name-input");
    const driverName = driverNameInput ? driverNameInput.value : "Anthony";

    const payload = {
        driverName: driverName,
        timestamp: Date.now(),
        lat: 38.9897, // Match user example
        lng: -76.9378,
        ear: state.internal?.drowsiness?.avgEAR || 0,
        perclos: Math.round((state.internal?.drowsiness?.perclos30s || 0) * 100),
        drowsinessLevel: drowsinessLevel,
        internal: {
            faceDetected: state.internal?.faceDetected || false,
            trackingConfidence: 0.95, // Mock confidence
            drowsiness: state.internal?.drowsiness || {},
            distraction: state.internal?.distraction || {},
            impairment: state.internal?.impairment || {}
        },
        external: {
            forwardHazard: state.external?.forwardHazard || {},
            visibility: state.external?.visibility || {}
        },
        videoClip: clip
    };

    try {
        await fetch('http://localhost:3001/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Failed to push log to production backend:", e);
    }
}

function handleAnomaly(state) {
    if (!currentStream || isRecordingAnomaly) return;
    
    isRecordingAnomaly = true;
    const recorder = new MediaRecorder(currentStream, { mimeType: 'video/webm' });
    const chunks = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            pushLog(state, true, base64);
            isRecordingAnomaly = false;
        };
    };
    
    recorder.start();
    // Capture 10 seconds of the event
    setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
    }, 10000);
}

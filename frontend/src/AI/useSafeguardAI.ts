import { useEffect, useRef, useState, useCallback } from "react";
import { FaceLandmarkerManager } from "./mediapipe_vision";
import { ExternalVisionManager, CrashDetector } from "./external_vision";
import { getAverageEAR, getPerEyeEAR, getGazeDirection, getGazeVertical, getEyeRubSignal } from "./metrics/eye_metrics";
import { getHeadPose } from "./metrics/head_metrics";
import { calculateVisibilityMetrics } from "./metrics/environmental_metrics";
import { getMouthAspectRatio } from "./metrics/mouth_metrics";
import { getBrowPosition, getFaceAreaRatio, getPostureLean } from "./metrics/face_structure_metrics";
import { drowsinessSmoother } from "./state_engine/smoothing";
import { classifyBehavior, behaviorSeverity } from "./state_engine/classifiers";
import { behaviorStabilizer } from "./state_engine/stabilizer";
import { updateSharedState } from "./shared_state";
import { startWebcam } from "./capture";

export function useSafeguardAI(
  videoRef: React.RefObject<HTMLVideoElement | null>, 
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [behaviorStates, setBehaviorStates] = useState<string[]>(["alert"]);
  const [severity, setSeverity] = useState(0);
  const [hazard, setHazard] = useState<any>(null);
  
  // CALIBRATION: First 100 frames to learn the user's 'Normal' face
  const calibrationRef = useRef({ buffer: [] as any[], baseline: null as any, isComplete: false });
  
  const faceManagerRef = useRef(new FaceLandmarkerManager());
  const externalVisionRef = useRef(new ExternalVisionManager());
  const crashDetectorRef = useRef(new CrashDetector());
  const isLoopRunning = useRef(false);
  const lastVisibilityCheck = useRef(0);
  const lastHazardCheck = useRef(0);

  const inferenceLoop = useCallback(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    
    if (!isLoopRunning.current || !videoElement || !canvasElement) {
        if (isLoopRunning.current) requestAnimationFrame(inferenceLoop);
        return;
    }

    if (videoElement.readyState < 2) {
        requestAnimationFrame(inferenceLoop);
        return;
    }

    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    try {
        const nowInMs = performance.now();
        
        // Active Temporal Purging: Clear expired timestamps every frame
        drowsinessSmoother.purgeExpired(nowInMs);

        // Hazard detection
        if (nowInMs - lastHazardCheck.current > 200) {
          lastHazardCheck.current = nowInMs;
          externalVisionRef.current.predict(videoElement).then(predictions => {
            let maxHazardArea = 0;
            let hazardClass = "none";
            let phoneDetected = false;
            for (let p of predictions) {
                if (p.class === "cell phone" && p.score > 0.38) phoneDetected = true;
                if (["car", "truck", "bus", "person"].includes(p.class)) {
                    const ratio = (p.bbox[2] * p.bbox[3]) / (640 * 480);
                    if (ratio > maxHazardArea) { maxHazardArea = ratio; hazardClass = p.class; }
                }
            }
            drowsinessSmoother.pushPhoneDetected(nowInMs, phoneDetected);
            setHazard({ state: maxHazardArea > 0.15 ? "hazard" : "clear", primaryTarget: hazardClass });
          });
        }

        // Face tracking
        const results = faceManagerRef.current.predictVideo(videoElement, nowInMs);
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          setIsFaceDetected(true);
          drowsinessSmoother.pushFaceDetected(nowInMs, true);
          const landmarks = results.faceLandmarks[0];

          // Drawing Landmarks (Blue Debug Dots)
          canvasCtx.fillStyle = "#005fe7";
          for (const point of landmarks) {
              canvasCtx.beginPath();
              canvasCtx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 1, 0, 2 * Math.PI);
              canvasCtx.fill();
          }

          // Compute raw metrics
          const ear = getAverageEAR(landmarks);
          const gazeRatio = getGazeDirection(landmarks);
          const rawPose = getHeadPose(landmarks);
          const mar = getMouthAspectRatio(landmarks);
          const eyeRubSignal = getEyeRubSignal(landmarks);
          const perEye = getPerEyeEAR(landmarks);
          const gazeVertical = getGazeVertical(landmarks);
          const browPosition = getBrowPosition(landmarks);
          const faceAreaRatio = getFaceAreaRatio(landmarks, videoElement);
          const postureLean = getPostureLean(landmarks);

          // Push to smoother
          drowsinessSmoother.pushEAR(nowInMs, ear);
          drowsinessSmoother.pushEyeRubSignal(nowInMs, eyeRubSignal);
          drowsinessSmoother.pushHeadPose(nowInMs, rawPose.pitch, rawPose.yaw, rawPose.roll);
          drowsinessSmoother.pushGaze(nowInMs, gazeRatio, gazeVertical);
          drowsinessSmoother.pushMAR(nowInMs, mar);
          drowsinessSmoother.pushLandmarkSnapshot(landmarks);
          drowsinessSmoother.pushFaceArea(faceAreaRatio);
          drowsinessSmoother.pushPostureLean(postureLean);

          // Extract ALL raw telemetry
          const report = {
            ear,
            perclos: drowsinessSmoother.getPERCLOS(),
            blinkRate: drowsinessSmoother.getBlinkRatePerMinute(),
            blinkDuration: drowsinessSmoother.getAvgBlinkDurationMs(),
            blinkVariance: drowsinessSmoother.getBlinkIntervalVariance(),
            fatigueRatio: drowsinessSmoother.getProgressiveFatigueRatio(),
            headPitch: rawPose.pitch,
            headYaw: rawPose.yaw,
            headRoll: rawPose.roll,
            headJerk: drowsinessSmoother.headJerkVelocity,
            nodFreq: drowsinessSmoother.getNodFrequency(),
            distractionMs: drowsinessSmoother.getDistractionDurationMs(nowInMs),
            rollDeviation: drowsinessSmoother.getRollDeviationMs(nowInMs),
            entropy: drowsinessSmoother.getHeadMovementEntropy(),
            microTremor: drowsinessSmoother.getMicroTremor(),
            gazeRatio,
            gazeVertical,
            gazeFixation: drowsinessSmoother.getGazeFixationDurationMs(nowInMs),
            gazeVariance: drowsinessSmoother.getGazeVariance(),
            gazeRepeat: drowsinessSmoother.getGazeDriftRepetition(),
            yawnCount: drowsinessSmoother.getYawnCountPer5Min(),
            slowBlinks: drowsinessSmoother.getSlowBlinkRate(),
            eyeRubs: drowsinessSmoother.getEyeRubCount(),
            mar,
            postureLean
          };

          // Capture Model-Driven State Identification (Blendshapes)
          const blendshapes = results.faceBlendshapes?.[0]?.categories || [];

          // POPULATE CALIBRATION
          if (!calibrationRef.current.isComplete) {
              calibrationRef.current.buffer.push({ blendshapes, ear });
              if (calibrationRef.current.buffer.length >= 100) {
                  // Finalize Baseline
                  const baseline: any = {};
                  const keys = ["eyeBlinkLeft", "eyeBlinkRight", "jawOpen", "eyeSquintLeft", "eyeSquintRight"];
                  keys.forEach(k => {
                      const sum = calibrationRef.current.buffer.reduce((acc, curr) => {
                          return acc + (curr.blendshapes.find((b: any) => b.categoryName === k)?.score || 0);
                      }, 0);
                      baseline[k] = sum / 100;
                  });
                  // Capture raw metric averages
                  baseline.ear = calibrationRef.current.buffer.reduce((acc, curr) => acc + curr.ear, 0) / 100;
                  
                  calibrationRef.current.baseline = baseline;
                  calibrationRef.current.isComplete = true;
                  console.log("[AI] Calibration Complete (Metrics Included):", baseline);
              }
          }

          const rawStates = classifyBehavior({
            ...report,
            blendshapes,
            baseline: calibrationRef.current.baseline,
            closureDurationMs: drowsinessSmoother.getEyeClosureDurationMs(nowInMs),
            faceMissingDurationMs: drowsinessSmoother.getFaceMissingDurationMs(nowInMs),
            phoneDetectedDurationMs: drowsinessSmoother.getPhoneDetectedDurationMs(nowInMs),
            asymmetryScore: perEye.asymmetryScore,
            progressiveRatio: report.fatigueRatio,
            blinkRatePerMin: report.blinkRate,
            avgBlinkDurationMs: report.blinkDuration,
            blinkIntervalVariance: report.blinkVariance,
            nodFrequency: report.nodFreq,
            rollDeviationMs: report.rollDeviation,
            headMovementEntropy: report.entropy,
            gazeFixationDurationMs: report.gazeFixation,
            gazeDriftRepetition: report.gazeRepeat,
            avgAttentionRecoveryMs: drowsinessSmoother.getAvgAttentionRecoveryMs(),
            browPosition,
            faceAreaTrend: drowsinessSmoother.getFaceAreaTrend(),
            avgPostureLean: drowsinessSmoother.getAvgPostureLean()
          });

          // APPLY HYSTERESIS (Confirmation & Cooldown)
          const states = behaviorStabilizer.process(nowInMs, rawStates);

          setMetrics(report);
          setBehaviorStates(states);
          setSeverity(behaviorSeverity(states));

          updateSharedState({ metrics: { ear }, behaviorStates: states, behaviorSeverity: behaviorSeverity(states) });
        } else {
          setIsFaceDetected(false);
          drowsinessSmoother.pushFaceDetected(nowInMs, false);
        }
    } catch (err) { console.error(err); }

    requestAnimationFrame(inferenceLoop);
  }, []);

  useEffect(() => {
    async function init() {
        try {
            await faceManagerRef.current.initialize();
            await externalVisionRef.current.initialize();
            const check = setInterval(async () => {
                if (videoRef.current) {
                    clearInterval(check);
                    await startWebcam(videoRef.current);
                    isLoopRunning.current = true;
                    inferenceLoop();
                }
            }, 500);
        } catch (e) { console.error(e); }
    }
    init();
    return () => { isLoopRunning.current = false; };
  }, [inferenceLoop]);

  return { isFaceDetected, metrics, behaviorStates, severity, hazard };
}

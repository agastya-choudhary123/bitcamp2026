import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiRiskResult {
  score: number;
  label: string;
  summary: string;
  recommendations: string[];
  loading: boolean;
  error: string;
  lastUpdated: number | null;
}

// Only re-evaluate when severity changes OR every 3 minutes — never faster.
const MIN_INTERVAL_MS = 3 * 60 * 1000;

// Minimal prompt — keeps input tokens under 200 to preserve free tier quota.
function buildPrompt(metrics: any, behaviorStates: string[], severity: number): string {
  const m = metrics || {};
  const states = behaviorStates.join(",") || "alert";
  return `Driver safety AI. Given these metrics, return JSON only: {"score":<0-100>,"label":"<Low|Moderate|High|Critical>","summary":"<1 sentence>","recommendations":["<rec1>","<rec2>"]}

states:${states} severity:${severity}/5
EAR:${m.ear?.toFixed(3)??"?"} PERCLOS:${m.perclos!=null?(m.perclos*100).toFixed(1)+"%":"?"} blinkRate:${m.blinkRatePerMin?.toFixed(1)??m.blinkRate?.toFixed(1)??"?"} slowBlinks:${m.slowBlinks??0} yawns:${m.yawnCount??0} entropy:${m.entropy?.toFixed(2)??"?"} tremor:${m.microTremor?.toFixed(5)??"?"} blinkVar:${m.blinkIntervalVariance?.toFixed(0)??"?"} roll:${m.headRoll?.toFixed(1)??"?"}deg pitch:${m.headPitch?.toFixed(1)??"?"}deg asymmetry:${m.asymmetryScore?.toFixed(3)??"?"} posture:${m.postureLean?.toFixed(2)??"?"}

Rules: intoxicated→+40,medical/microsleep→+45,drowsy→+20. PERCLOS>30%→critical. asymmetry>0.25→>=75. entropy>2+tremor>0.0002→intoxication.`;
}

export function useGeminiRisk(
  metrics: any,
  behaviorStates: string[],
  severity: number,
  driverName?: string
): GeminiRiskResult {
  const [result, setResult] = useState<GeminiRiskResult>({
    score: 0, label: "Low", summary: "", recommendations: [],
    loading: false, error: "", lastUpdated: null,
  });

  const metricsRef = useRef(metrics);
  const statesRef = useRef(behaviorStates);
  const severityRef = useRef(severity);
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastCallRef = useRef<number>(0);
  const firedOnceRef = useRef(false);
  const retryAfterRef = useRef<number>(0); // timestamp before which we must not call

  metricsRef.current = metrics;
  statesRef.current = behaviorStates;
  severityRef.current = severity;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

  async function evaluate() {
    const now = Date.now();
    if (now - lastCallRef.current < MIN_INTERVAL_MS) return;

    isRunningRef.current = true;
    lastCallRef.current = now;
    setResult((r) => ({ ...r, loading: true, error: "" }));

    try {
      const response = await fetch("http://localhost:3001/risk/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: metricsRef.current,
          behaviorStates: statesRef.current,
          severity: severityRef.current,
          driverName: driverName ?? "anonymous"
        })
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limited — will retry");
        throw new Error(`Server error: ${response.status}`);
      }

      const parsed = await response.json();

      if (!isMountedRef.current) return;
      setResult({
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        label: parsed.label ?? "Low",
        summary: parsed.summary ?? "",
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
        loading: false, error: "", lastUpdated: Date.now(),
      });
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setResult((r) => ({ ...r, loading: false, error: e.message.includes("Rate limited") ? "Rate limited — will retry" : "Risk engine temporarily offline" }));
    } finally {
      isRunningRef.current = false;
    }
  }

  // Fire once when metrics first arrive
  useEffect(() => {
    isMountedRef.current = true;
    const waitForMetrics = setInterval(() => {
      if (metricsRef.current && !firedOnceRef.current) {
        firedOnceRef.current = true;
        clearInterval(waitForMetrics);
        evaluate();
      }
    }, 1500);
    return () => {
      isMountedRef.current = false;
      clearInterval(waitForMetrics);
    };
  }, []);

  // Re-evaluate only when severity changes (new state detected)
  const prevSeverityRef = useRef(severity);
  useEffect(() => {
    if (!firedOnceRef.current) return;
    if (severity === prevSeverityRef.current) return;
    prevSeverityRef.current = severity;
    // Debounce 6s to let the state stabilize before calling
    const t = setTimeout(evaluate, 6000);
    return () => clearTimeout(t);
  }, [severity]);

  return result;
}

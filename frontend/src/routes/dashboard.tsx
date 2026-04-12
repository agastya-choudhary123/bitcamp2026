import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Activity, ShieldCheck, Video as VideoIcon, Terminal, Binary, ChevronDown, ChevronUp, Info, AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";
import WaveformChart from "@/components/WaveformChart";
import { useSafeguardAI } from "@/AI/useSafeguardAI";
import { useGeminiRisk } from "@/AI/useGeminiRisk";
import { useClipCapture } from "@/AI/useClipCapture";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [ { title: "Safeguard AI — Debug Dashboard" } ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAuthenticated, isLoading, logout, user } = useAuth0();
  const [history, setHistory] = useState<number[]>(new Array(40).fill(0.35));

  const userName = user?.name ?? user?.nickname ?? localStorage.getItem("driverName") ?? "Driver";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = Route.useNavigate();

  const { metrics, behaviorStates, severity, hazard } = useSafeguardAI(videoRef, canvasRef);
  const geminiRisk = useGeminiRisk(metrics, behaviorStates, severity, userName);
  const { isRecording } = useClipCapture(videoRef, behaviorStates, severity, userName);

  useEffect(() => {
    if (metrics) setHistory((h) => [...h.slice(1), metrics.ear || 0]);
  }, [metrics]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("driverName");
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <div className="min-h-screen bg-white text-[#09090b] p-6 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in">
        
        {/* TOP SYSTEM NAV */}
        <header className="flex justify-between items-center border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#005fe7] p-2.5 rounded-xl shadow-lg shadow-blue-100">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase">Safeguard Intelligence</h1>
              <div className="flex items-center gap-2 text-[12px] font-black uppercase text-gray-400 tracking-widest">
                <span className={severity > 2 ? "text-red-500" : "text-[#10b981]"}>● {severity > 2 ? "RISK_IDENTIFIED" : "SYSTEM_SAFE"}</span>
                <span>/</span>
                <span>NODE_01</span>
                <span>/</span>
                <span>{userName}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/replays" className="text-[12px] font-black uppercase tracking-widest text-[#09090b] hover:text-[#005fe7] transition-colors">Replays</Link>
            <Link to="/emergency-contacts" className="text-[12px] font-black uppercase tracking-widest text-[#09090b] hover:text-[#005fe7] transition-colors">Emergency</Link>
            <button onClick={handleLogout} className="text-[12px] font-black uppercase tracking-widest text-red-500 hover:text-red-600">Disconnect</button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT: FEED & ALERTS */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <div className="safeguard-card p-4">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-gray-400">
                        <VideoIcon size={14} className="text-[#005fe7]" />
                        Optical Stream Layer
                    </div>
                </div>
                <div className="video-container aspect-video relative rounded-xl bg-black">
                    <video ref={videoRef} className="w-full h-full object-cover opacity-90 shadow-2xl" muted playsInline />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={640} height={480} />
                    {isRecording && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 px-2.5 py-1.5 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">REC</span>
                      </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="safeguard-card p-8 h-[220px]">
                    <div className="flex items-center gap-2 mb-6 text-[12px] font-black uppercase tracking-widest text-gray-400">
                        <Activity size={16} className="text-[#005fe7]" />
                        EAR History
                    </div>
                    <WaveformChart dataPoints={history} />
                </div>
                
                <div className="space-y-8">
                    {/* STATE FLAGS */}
                    <div className="safeguard-card p-8 min-h-[140px] flex flex-col">
                        <div className="flex items-center gap-2 mb-6 text-[12px] font-black uppercase tracking-widest text-gray-400">
                            <Terminal size={14} className="text-[#005fe7]" />
                            Behavioral State Flags
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2 content-start">
                            {behaviorStates.map(s => (
                                <span key={s} className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border ${s === 'alert' ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* STATUS SUMMARY */}
                    <div className={`safeguard-card p-6 border-l-4 transition-colors ${severity > 2 ? 'border-l-red-500 bg-red-50' : 'border-l-[#005fe7] bg-white'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            {severity > 2 ? <AlertTriangle className="text-red-600" size={20} /> : <ShieldCheck className="text-[#005fe7]" size={20} />}
                            <h2 className="text-[12px] font-black uppercase tracking-widest">{hazard?.state === "hazard" ? "IMMEDIATE RISK" : "SYSTEM_NOMINAL"}</h2>
                        </div>
                        <p className="text-[12px] font-bold text-gray-500 leading-tight uppercase tracking-tight">Active State Sync: {behaviorStates.join(", ")}</p>
                    </div>
                </div>
            </div>
            
          </div>

          {/* RIGHT: DEBUG TELEMETRY GRID */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="safeguard-card p-8">
                <div className="flex items-center gap-3 mb-8 text-[12px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-4">
                    <Binary size={16} className="text-[#005fe7]" />
                    Raw Diagnostics [Grid Mode]
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-6 content-start items-start">
                    <MetricBlock label="EAR" value={metrics?.ear} format="4f" isAlert={metrics?.ear < 0.25} 
                                 desc="Eye Aspect Ratio. Measures openness of eyes." />
                    
                    <MetricBlock label="PERCLOS" value={metrics?.perclos} format="pct" isAlert={metrics?.perclos > 0.12} 
                                 desc="Percent Eye Closure time. Sci measurement of drowsiness." />

                    <MetricBlock label="Blink Rate" value={metrics?.blinkRate} format="1f" isAlert={metrics?.blinkRate > 25 || metrics?.blinkRate < 5} 
                                 desc="Blinks per minute. High rate indicates fatigue." />

                    <MetricBlock label="Blink Duration" value={metrics?.blinkDuration} format="ms" isAlert={metrics?.blinkDuration > 250} 
                                 desc="Avg blink duration. Normal is 100-150ms." />

                    <MetricBlock label="Fatigue Ratio" value={metrics?.fatigueRatio} format="2f" isAlert={metrics?.fatigueRatio < 0.85} 
                                 desc="Ratio of current EAR vs baseline awake state." />

                    <MetricBlock label="Head Entropy" value={metrics?.entropy} format="2f" isAlert={metrics?.entropy > 2.0} 
                                 desc="Randomness of head movement. High=unstable." />

                    <MetricBlock label="MicroTremor" value={metrics?.microTremor} format="5f" isAlert={metrics?.microTremor > 0.002} 
                                 desc="Tiny, involuntary tremors in facial landmarks." />

                    <MetricBlock label="Gaze Ratio" value={metrics?.gazeRatio} format="2f" isAlert={Math.abs(metrics?.gazeRatio - 0.5) > 0.3} 
                                 desc="Horizontal focus. 0.5 is centered path." />

                    <MetricBlock label="Gaze Vertical" value={metrics?.gazeVertical} format="2f" isAlert={metrics?.gazeVertical > 0.65} 
                                 desc="Vertical focus. > 0.65 indicates phone use." />

                    <MetricBlock label="Yawn Count" value={metrics?.yawnCount} format="0f" isAlert={metrics?.yawnCount > 0} 
                                 desc="Number of yawning events in the last 5 minutes." />

                    <MetricBlock label="Posture Lean" value={metrics?.postureLean} format="2f" isAlert={Math.abs(metrics?.postureLean) > 0.15} 
                                 desc="Horizontal body alignment. Side-to-side lean." />

                    <MetricBlock label="Slow Blinks" value={metrics?.slowBlinks} format="0f" isAlert={metrics?.slowBlinks > 0} 
                                 desc="Count of blinks lasting > 300ms." />

                    <MetricBlock label="Eye Rubs" value={metrics?.eyeRubs} format="0f" isAlert={metrics?.eyeRubs > 0} 
                                 desc="Detection of manual eye/face manipulation." />

                    <MetricBlock label="Head Pitch" value={metrics?.headPitch} format="1f" isAlert={Math.abs(metrics?.headPitch) > 18} 
                                 desc="Vertical head tilt (nodding events)." />

                    <MetricBlock label="Head Yaw" value={metrics?.headYaw} format="1f" isAlert={Math.abs(metrics?.headYaw) > 20} 
                                 desc="Horizontal rotation (looking left/right)." />

                    <MetricBlock label="Head Roll" value={metrics?.headRoll} format="1f" isAlert={Math.abs(metrics?.headRoll) > 12} 
                                 desc="Side-to-side head tilt (ear towards shoulder)." />
                </div>

                <div className="mt-10 pt-6 border-t border-gray-100 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                        <span>Risk Integrity Profile</span>
                        <div className="flex items-center gap-2">
                            {geminiRisk.loading && (
                                <RefreshCw size={10} className="animate-spin text-[#005fe7]" />
                            )}
                            {geminiRisk.lastUpdated && !geminiRisk.loading && (
                                <span className="text-[10px] text-gray-300">
                                    {new Date(geminiRisk.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Score + label */}
                    <div className="flex items-end gap-3">
                        <span className={`text-4xl font-black tabular-nums ${
                            geminiRisk.score >= 75 ? "text-red-500" :
                            geminiRisk.score >= 50 ? "text-amber-500" :
                            geminiRisk.score >= 25 ? "text-[#005fe7]" : "text-[#10b981]"
                        }`}>
                            {geminiRisk.loading && geminiRisk.lastUpdated === null ? "—" : geminiRisk.score}
                        </span>
                        <span className={`text-[11px] font-black uppercase tracking-widest mb-1 ${
                            geminiRisk.score >= 75 ? "text-red-500" :
                            geminiRisk.score >= 50 ? "text-amber-500" :
                            geminiRisk.score >= 25 ? "text-[#005fe7]" : "text-[#10b981]"
                        }`}>
                            {geminiRisk.label}
                        </span>
                    </div>

                    {/* Score bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                geminiRisk.score >= 75 ? "bg-red-500" :
                                geminiRisk.score >= 50 ? "bg-amber-500" :
                                geminiRisk.score >= 25 ? "bg-[#005fe7]" : "bg-[#10b981]"
                            }`}
                            style={{ width: `${geminiRisk.score}%` }}
                        />
                    </div>

                    {/* Summary */}
                    {geminiRisk.summary && (
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                            {geminiRisk.summary}
                        </p>
                    )}

                    {/* Recommendations */}
                    {geminiRisk.recommendations.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</p>
                            {geminiRisk.recommendations.map((rec, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <CheckCircle size={11} className="text-[#10b981] mt-0.5 shrink-0" />
                                    <span className="text-[11px] text-gray-600 leading-tight">{rec}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error state */}
                    {geminiRisk.error && !geminiRisk.loading && (
                        <p className="text-[10px] text-red-400">{geminiRisk.error}</p>
                    )}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, format, isAlert, desc }: { label: string, value: any, format: string, isAlert?: boolean, desc: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const displayValue = () => {
    if (value === undefined || value === null) return "---";
    if (format === "4f") return value.toFixed(4);
    if (format === "3f") return value.toFixed(3);
    if (format === "2f") return value.toFixed(2);
    if (format === "1f") return value.toFixed(1);
    if (format === "5f") return value.toFixed(5);
    if (format === "pct") return (value * 100).toFixed(1) + "%";
    if (format === "ms") return Math.round(value) + "ms";
    return value;
  };

  return (
    <div className="flex flex-col h-auto min-h-[48px] self-start">
        <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className={`flex flex-col transition-colors ${isAlert ? 'text-red-600' : 'text-[#09090b]'}`}>
                <span className="text-[11px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100 whitespace-nowrap">{label}</span>
                <span className="font-mono text-[15px] font-black leading-tight">{displayValue()}</span>
            </div>
            <div className="text-gray-300 group-hover:text-[#005fe7] transition-colors ml-2">
                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>
        </div>
        {isOpen && (
            <div className="mt-1.5 p-2.5 bg-gray-50 rounded-lg text-[11px] font-bold text-gray-500 leading-tight animate-fade-in border border-gray-100 overflow-hidden break-words w-full">
                <div className="flex items-start gap-1.5">
                    <Info size={12} className="text-[#005fe7] mt-0.5 shrink-0" />
                    <span>{desc}</span>
                </div>
            </div>
        )}
    </div>
  );
}

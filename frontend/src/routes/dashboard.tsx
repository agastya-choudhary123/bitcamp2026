import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Activity, AlertTriangle, User, Info, LineChart, Video as VideoIcon, LogOut, Phone } from "lucide-react";
import WaveformChart from "@/components/WaveformChart";
import AIReport from "@/components/AIReport";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Dashboard" },
      { name: "description", content: "Real-time driver drowsiness monitoring dashboard" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [earScore, setEarScore] = useState(0.35);
  const [history, setHistory] = useState<number[]>(new Array(40).fill(0.35));
  const [perclos, setPerclos] = useState(0.05);
  const [headPose, setHeadPose] = useState("Stable");
  const [systemState, setSystemState] = useState("Awake");
  const [hazardState, setHazardState] = useState("Clear");
  const [userName, setUserName] = useState("Anthony");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDrowsinessAlert, setShowDrowsinessAlert] = useState(false);
  const [drowsinessAcknowledged, setDrowsinessAcknowledged] = useState(false);
  const navigate = Route.useNavigate();

  useEffect(() => {
    const storedName = localStorage.getItem("driverName");
    if (storedName) setUserName(storedName);
  }, []);

  // --- REAL DATA POLLING ---
  useEffect(() => {
    const fetchStatus = async () => {
      const username = localStorage.getItem("username") || "Anthony";
      try {
        const resp = await fetch(`http://localhost:3001/status/${username}`);
        const data = await resp.json();
        
        if (data.ear !== undefined) {
          setEarScore(data.ear);
          setHistory((h) => [...h.slice(1), data.ear]);
          setPerclos(data.perclos / 100 || 0);
          
          // Interpret internal states
          const dState = data.internal?.drowsiness?.state || "awake";
          setSystemState(dState.replace(/_/g, " ").toUpperCase());
          
          const pitch = data.internal?.distraction?.headPitch || 0;
          const yaw = data.internal?.distraction?.headYaw || 0;
          if (Math.abs(pitch) > 15 || Math.abs(yaw) > 15) setHeadPose("Distracted");
          else setHeadPose("Stable");

          // Interpret external hazards
          const hState = data.external?.forwardHazard?.state || "clear";
          setHazardState(hState.replace(/_/g, " ").toUpperCase());
        }
      } catch (err) {
        console.error("Failed to poll status:", err);
      }
    };

    const interval = setInterval(fetchStatus, 3000); // 3 second polling
    fetchStatus();
    
    return () => clearInterval(interval);
  }, []);

  // Show drowsiness popup when score drops below threshold
  useEffect(() => {
    if (earScore < 0.25 && !drowsinessAcknowledged) {
      setShowDrowsinessAlert(true);
    }
    if (earScore >= 0.25) {
      setDrowsinessAcknowledged(false);
    }
  }, [earScore, drowsinessAcknowledged]);

  const handleAcknowledgeDrowsiness = () => {
    setShowDrowsinessAlert(false);
    setDrowsinessAcknowledged(true);
  };

  const handleLogout = () => {
    navigate({ to: "/" });
  };

  const getStatusColor = () => {
    if (earScore < 0.25) return "text-accent-red";
    if (earScore < 0.3) return "text-accent-yellow";
    return "text-accent-green";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{userName}'s Dashboard</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-semibold">Real-time eye monitoring system</p>
        </div>
        <div className="flex gap-3">
          <Link to="/replays" className="glass-card p-3 px-6 flex items-center gap-2 text-sm font-medium hover:bg-foreground/5 transition-colors text-foreground">
            <VideoIcon size={18} className="text-primary" />
            Replays
          </Link>
          <Link to="/guide" className="glass-card p-3 px-6 flex items-center gap-2 text-sm font-medium hover:bg-foreground/5 transition-colors text-foreground">
            <Info size={18} />
            Safety Guide
          </Link>
          <Link to="/emergency-contacts" className="glass-card p-3 px-6 flex items-center gap-2 text-sm font-medium hover:bg-foreground/5 transition-colors text-foreground">
            <Phone size={18} className="text-primary" />
            Contacts
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="glass-card p-3 px-6 flex items-center gap-2 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
            >
              <User size={18} />
              {userName}
            </button>
            {showProfileMenu && (
              <div className="absolute top-full mt-2 right-0 w-48 glass-card border border-primary/20 p-2 z-[100] shadow-2xl animate-fade-in">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-destructive/20 transition-colors text-accent-red flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-4 relative">
            <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Camera size={16} className="text-primary" />
              Live Visual Monitoring
            </div>
            <div className="video-container aspect-video flex items-center justify-center bg-black/40 overflow-hidden">
               {/* Note: This is a placeholder for the CV-Engine overlay if embedded */}
               <div className="text-center">
                 <p className="text-muted-foreground italic text-sm">Webcam feed processed by CV Engine</p>
                 <p className="text-[10px] text-primary mt-1">DATA PIPELINE ACTIVE</p>
               </div>
            </div>
          </div>

          {/* Waveform Chart */}
          <div className="glass-card p-6 h-[250px]">
            <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Activity size={16} className="text-primary" />
              EAR Waveform History
            </div>
            <WaveformChart dataPoints={history} />
          </div>

          <AIReport sessionId="current_session" />
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <LineChart size={16} className="text-primary" />
              Current EAR Level
            </div>
            <div className="gauge-container mb-4">
              <div className="absolute inset-0 rounded-full border-[10px] border-foreground/5"></div>
              <div
                className="absolute inset-0 rounded-full border-[10px] border-transparent border-t-primary transition-all duration-500"
                style={{ transform: `rotate(${(earScore - 0.2) * 400}deg)` }}
              ></div>
              <span className={`gauge-value ${getStatusColor()}`}>{earScore.toFixed(3)}</span>
            </div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{systemState}</p>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-foreground uppercase text-xs tracking-widest opacity-50">Live Telemetry</h3>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-muted-foreground text-sm">PERCLOS</span>
              <span className="font-mono text-primary font-bold">{(perclos * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-muted-foreground text-sm">Head Pose</span>
              <span className={`font-mono font-bold ${headPose === "Stable" ? "text-accent-green" : "text-accent-yellow"}`}>{headPose}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-muted-foreground text-sm">Road Hazards</span>
              <span className={`font-mono font-bold ${hazardState === "CLEAR" ? "text-accent-green" : "text-accent-red"}`}>{hazardState}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground text-sm">Safety Status</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${systemState === "AWAKE" ? "bg-accent-green/20 text-accent-green" : "bg-accent-red/20 text-accent-red"}`}>
                {systemState === "AWAKE" ? "NOMINAL" : "CRITICAL"}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Drowsiness Alert Modal */}
      {showDrowsinessAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-10 max-w-md w-full mx-4 border-2 border-accent-red/50 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-accent-red/20 flex items-center justify-center animate-pulse">
              <AlertTriangle size={40} className="text-accent-red" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">Drowsiness Detected!</h2>
            <p className="text-muted-foreground">
              Your eye closure ratio has dropped to dangerous levels. Please pull over safely if you feel fatigued.
            </p>
            <button
              onClick={handleAcknowledgeDrowsiness}
              className="btn-primary w-full text-lg font-bold py-4"
            >
              I'm Awake — Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

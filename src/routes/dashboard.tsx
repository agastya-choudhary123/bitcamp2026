import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Activity, AlertTriangle, User, Info, LineChart, Video as VideoIcon } from "lucide-react";
import WaveformChart from "@/components/WaveformChart";

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

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setEarScore((prev) => {
        const next = Math.max(0.15, Math.min(0.45, prev + (Math.random() - 0.5) * 0.08));
        setHistory((h) => [...h.slice(1), next]);
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (earScore < 0.25) return "text-accent-red";
    if (earScore < 0.3) return "text-accent-yellow";
    return "text-accent-green";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Driver Dashboard</h1>
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
          <div className="glass-card p-3 px-6 flex items-center gap-2 text-sm font-medium text-foreground">
            <User size={18} />
            Anthony
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
            <div className="video-container aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="video-feed" />
              {!isCameraActive && <p className="text-muted-foreground italic">Activating camera...</p>}
              {earScore < 0.25 && (
                <div className="absolute inset-x-0 top-0 p-4 bg-destructive/80 backdrop-blur-md flex items-center justify-center gap-3 animate-pulse">
                  <AlertTriangle className="text-destructive-foreground" />
                  <span className="text-destructive-foreground font-bold text-lg uppercase">Drowsiness Detected! Wake Up!</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 h-[250px]">
            <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Activity size={16} className="text-primary" />
              EAR Waveform History
            </div>
            <WaveformChart dataPoints={history} />
          </div>
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
            <p className="text-muted-foreground text-sm px-4">Analyzing eye closure patterns and duration.</p>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-foreground uppercase text-xs tracking-widest opacity-50">Current Metrics</h3>
            <div className="flex justify-between items-center py-2 border-b border-foreground/5">
              <span className="text-muted-foreground text-sm">PERCLOS (every min)</span>
              <span className="font-mono text-primary">0.05</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-foreground/5">
              <span className="text-muted-foreground text-sm">Head Pose</span>
              <span className="font-mono text-accent-green">Stable</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground text-sm">System Status</span>
              <span className="bg-accent-green/20 text-accent-green px-3 py-1 rounded-full text-xs font-bold">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

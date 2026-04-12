import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Info, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [ { title: "Safeguard AI — Technical Guide" } ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="min-h-screen bg-white text-[#09090b] p-8 lg:p-12 font-sans">
      <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
        
        <header className="flex items-center gap-6 border-b border-gray-100 pb-8">
            <Link to="/dashboard" className="safeguard-card p-3 hover:bg-gray-50 transition-colors">
              <ArrowLeft size={22} className="text-[#005fe7]" />
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">System Documentation</h1>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Node Operational Standards v1.0.4</p>
            </div>
        </header>

        <section className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#005fe7]">Core Intelligence</h2>
            <div className="safeguard-card p-8 space-y-4">
                <div className="flex items-center gap-3">
                    <Zap size={18} className="text-[#005fe7]" />
                    <h3 className="font-bold text-lg">Inertial Metric Layer</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed font-bold uppercase tracking-tight">
                    Each frame is processed via the MediaPipe FaceMesh engine. Key landmarks (EAR, MAR, Gaze) are extracted and passed to the Temporal Smoother for state classification.
                </p>
            </div>
        </section>

        <section className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#005fe7]">Safety Protocols</h2>
            <div className="safeguard-card p-8 space-y-4">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-[#10b981]" />
                    <h3 className="font-bold text-lg">Microsleep Trigger</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed font-bold uppercase tracking-tight">
                    Classification of 'Microsleep' occurs when EAR remains below threshold for {">"} 3000ms. This bypasses normal filtering and initiates emergency responders sync.
                </p>
            </div>
        </section>
      </div>
    </div>
  );
}

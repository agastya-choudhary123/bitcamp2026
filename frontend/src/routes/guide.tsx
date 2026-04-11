import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, AlertTriangle, CheckCircle, Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Safety Guide" },
      { name: "description", content: "Understanding EAR and PERCLOS drowsiness metrics" },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in pb-16">
      <header className="flex items-center gap-4 mb-12">
        <Link to="/dashboard" className="glass-card p-3 hover:bg-foreground/10 transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </Link>
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Safety Reference Guide</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-semibold">Understanding EAR and PERCLOS Metrics</p>
        </div>
      </header>

      {/* EAR Section */}
      <div className="glass-card p-10 mb-6">
        <div className="flex items-center gap-4 justify-center mb-3">
          <Zap className="text-primary" size={28} />
          <h2 className="text-2xl font-extrabold text-foreground text-center">Eye Aspect Ratio (EAR)</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto mb-8 text-sm">
          EAR is a real-time snapshot of how open your eyes are. It is calculated by taking the distances between the eyelids and dividing by the eye width.
        </p>

        <div className="flex flex-wrap gap-6 justify-center">
          <div className="glass-card p-8 border-t-4 border-t-accent-green flex flex-col items-center text-center w-full md:w-fit max-w-xs">
            <div className="text-accent-green font-bold text-xl mb-4 flex items-center gap-3">
              <CheckCircle size={22} />
              {"\u00A0\u00A0>"} 0.30
            </div>
            <h3 className="text-foreground font-bold text-lg mb-2">Standard / Awake</h3>
            <p className="text-sm text-muted-foreground">Eyes are fully open and alert. Your baseline state.</p>
          </div>
          <div className="glass-card p-8 border-t-4 border-t-accent-yellow flex flex-col items-center text-center w-full md:w-fit max-w-xs">
            <div className="text-accent-yellow font-bold text-xl mb-4 flex items-center gap-3">
              <AlertTriangle size={22} />
              {"\u00A0\u00A0"}0.25 - 0.30
            </div>
            <h3 className="text-foreground font-bold text-lg mb-2">Warning / Droopy</h3>
            <p className="text-sm text-muted-foreground">Initial signs of fatigue or heavy eyelids detected.</p>
          </div>
          <div className="glass-card p-8 border-t-4 border-t-accent-red flex flex-col items-center text-center w-full md:w-fit max-w-xs">
            <div className="text-accent-red font-bold text-xl mb-4 flex items-center gap-3">
              <AlertTriangle size={22} />
              {"\u00A0\u00A0<"} 0.25
            </div>
            <h3 className="text-foreground font-bold text-lg mb-2">Danger / Closed</h3>
            <p className="text-sm text-muted-foreground">Eyes are effectively closed. High risk of immediate collision.</p>
          </div>
        </div>
      </div>

      {/* PERCLOS Section */}
      <div className="glass-card p-10 mb-6">
        <div className="flex items-center gap-4 justify-center mb-3">
          <Info className="text-primary" size={28} />
          <h2 className="text-2xl font-extrabold text-foreground text-center">Percentage of Eye Closure (PERCLOS)</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto mb-8 text-sm">
          PERCLOS is the most reliable physiological indicator of fatigue. It measures the percentage of time your eyes are closed over a 1-minute rolling window.
        </p>

        <div className="overflow-hidden rounded-2xl border border-foreground/10">
          <table className="w-full text-center text-sm border-collapse">
            <thead className="uppercase text-xs font-bold tracking-widest text-muted-foreground border-b border-foreground/10">
              <tr>
                <th className="p-5 px-8">Score Range</th>
                <th className="p-5 px-8">Alert Level</th>
                <th className="p-5 px-8">System Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              <tr>
                <td className="p-5 px-8 font-mono text-accent-green text-lg">0.00 - 0.08</td>
                <td className="p-5 px-8 text-foreground font-semibold">Normal / Alert</td>
                <td className="p-5 px-8 text-muted-foreground">Passive monitoring mode.</td>
              </tr>
              <tr>
                <td className="p-5 px-8 font-mono text-accent-yellow text-lg">0.08 - 0.12</td>
                <td className="p-5 px-8 text-foreground font-bold">Drowsy / Fatigued</td>
                <td className="p-5 px-8 text-muted-foreground">Visual Warning on Dashboard.</td>
              </tr>
              <tr>
                <td className="p-5 px-8 font-mono text-accent-red text-lg">{"\u00A0\u00A0>"} 0.12</td>
                <td className="p-5 px-8 text-foreground font-extrabold text-accent-red">Critical Risk</td>
                <td className="p-5 px-8 text-accent-red font-bold">Emergency SMS to Contact.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground italic pt-2">
        * Metrics are based on standard NHTSA drowsiness detection research.
      </footer>
    </div>
  );
}

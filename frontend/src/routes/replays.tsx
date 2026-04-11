import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Clock, ArrowLeft, Video, Filter } from "lucide-react";

interface ReplaySession {
  id: string;
  title: string;
  date: string;
  duration: string;
  alertsCount: number;
  avgEar: number;
}

export const Route = createFileRoute("/replays")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Driving Replays" },
      { name: "description", content: "Review past driving sessions and safety logs" },
    ],
  }),
  component: ReplaysPage,
});

function ReplaysPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "length">("date");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sessions: ReplaySession[] = [
    { id: "1", title: "Night Drive to Baltimore", date: "2026-04-10", duration: "45:12", alertsCount: 3, avgEar: 0.32 },
    { id: "2", title: "Morning Commute", date: "2026-04-09", duration: "22:05", alertsCount: 0, avgEar: 0.38 },
    { id: "3", title: "Long Haul - Interstate 95", date: "2026-04-08", duration: "135:30", alertsCount: 12, avgEar: 0.28 },
    { id: "4", title: "Evening Trip", date: "2026-04-07", duration: "15:20", alertsCount: 1, avgEar: 0.35 },
  ];

  const getDurationInSeconds = (duration: string) => {
    const parts = duration.split(":").reverse();
    return parts.reduce((acc, part, i) => acc + parseInt(part) * Math.pow(60, i), 0);
  };

  const filteredSessions = sessions
    .filter((s) => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      return getDurationInSeconds(b.duration) - getDurationInSeconds(a.duration);
    });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-fade-in pb-48">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-12">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="glass-card p-4 hover:bg-foreground/10 transition-colors">
            <ArrowLeft size={24} className="text-foreground" />
          </Link>
          <div>
            <h1 className="text-5xl font-extrabold text-foreground tracking-tight">Driving Replays</h1>
            <p className="text-muted-foreground mt-2 uppercase tracking-widest text-xs font-bold opacity-60">Review past sessions and safety logs</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 items-center">
          <input
            type="text"
            placeholder="Search replays..."
            className="px-6 py-4 bg-foreground/5 border border-foreground/10 rounded-2xl text-foreground focus:outline-none focus:border-primary w-full md:w-64 transition-all font-medium placeholder:text-muted-foreground/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-3 bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-4 text-foreground hover:bg-foreground/10 transition-all min-w-[160px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{sortBy === "date" ? "Newest" : "Longest"}</span>
              </div>
            </button>
            {isSortOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 glass-card border border-primary/20 p-2 z-[100] shadow-2xl animate-fade-in">
                <button onClick={() => { setSortBy("date"); setIsSortOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors ${sortBy === "date" ? "text-primary" : "text-muted-foreground"}`}>
                  Newest First
                </button>
                <button onClick={() => { setSortBy("length"); setIsSortOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors ${sortBy === "length" ? "text-primary" : "text-muted-foreground"}`}>
                  Longest First
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20 pb-32">
        {filteredSessions.map((session) => (
          <div key={session.id} className="glass-card p-10 border-t-4 border-t-primary hover:bg-foreground/5 transition-all group flex flex-col justify-between min-h-[250px] hover:translate-y-[-8px] duration-300">
            <div>
              <div className="flex justify-between items-start gap-4 mb-6">
                <h3 className="text-foreground font-bold text-2xl leading-tight group-hover:text-primary transition-colors">{session.title}</h3>
                <div className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 whitespace-nowrap bg-primary/10 px-2 py-1 rounded">
                  {new Date(session.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-3 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <Clock size={16} className="text-primary" />
                </div>
                {session.duration}
              </div>
              <button className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/70 hover:scale-110 text-primary-foreground px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-tighter transition-all shadow-[0_0_20px_var(--color-primary/30%)] hover:shadow-[0_0_30px_var(--color-primary/50%)]">
                <Play size={14} fill="currentColor" />
                PLAY SESSION
              </button>
            </div>
          </div>
        ))}
        {filteredSessions.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <Video size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-foreground text-xl font-bold">No sessions found</h3>
            <p className="text-muted-foreground">Try a different search term or start a new drive.</p>
          </div>
        )}
      </div>
    </div>
  );
}

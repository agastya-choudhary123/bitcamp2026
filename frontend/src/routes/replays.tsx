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
    meta: [ { title: "Safeguard AI — Driving Replays" } ],
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

  const filteredSessions = sessions
    .filter((s) => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      return b.duration > a.duration ? 1 : -1;
    });

  return (
    <div className="min-h-screen bg-white text-[#09090b] p-8 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 pb-10">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="safeguard-card p-3 hover:bg-gray-50 transition-colors">
              <ArrowLeft size={22} className="text-[#005fe7]" />
            </Link>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Archived Replays</h1>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mt-1">Telemetry Storage • 4 sessions found</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="SEARCH DATA..."
              className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-black uppercase tracking-widest placeholder:text-gray-300 w-full md:w-64 focus:outline-none focus:border-[#005fe7] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSessions.map((session) => (
            <div key={session.id} className="safeguard-card p-10 flex flex-col justify-between min-h-[250px] hover:border-[#005fe7]/50 transition-all group">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-black text-xl uppercase tracking-tighter group-hover:text-[#005fe7] transition-colors leading-none">{session.title}</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#005fe7] bg-blue-50 px-2.5 py-1 rounded">
                    {session.date}
                  </span>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Clock size={14} />
                        Duration: <span className="text-[#09090b]">{session.duration}</span>
                    </div>
                </div>
              </div>
              
              <button className="btn-primary w-full flex items-center justify-center gap-3 mt-10">
                <Play size={14} fill="currentColor" />
                <span className="text-[11px] font-black uppercase tracking-widest">Load Telemetry</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

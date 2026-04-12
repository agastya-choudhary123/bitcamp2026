import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Play, Clock, ArrowLeft, X, AlertTriangle, Video as VideoIcon } from "lucide-react";

interface Replay {
  _id: string;
  driverName: string;
  sessionStart: string;
  sessionEnd: string;
  videoUrl: string;
  states: string[];
}

export const Route = createFileRoute("/replays")({
  head: () => ({
    meta: [{ title: "Safeguard AI — Driving Replays" }],
  }),
  component: ReplaysPage,
});

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReplaysPage() {
  const { getAccessTokenSilently, user } = useAuth0();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReplay, setActiveReplay] = useState<Replay | null>(null);

  const driverName =
    user?.name ?? user?.nickname ?? localStorage.getItem("driverName") ?? "Driver";

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`http://localhost:3001/replay/${encodeURIComponent(driverName)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        // Newest first
        setReplays(data.sort((a: Replay, b: Replay) =>
          new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime()
        ));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [driverName, getAccessTokenSilently]);

  const filtered = replays.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.driverName.toLowerCase().includes(term) ||
      formatDate(r.sessionStart).toLowerCase().includes(term) ||
      r.states.some((s) => s.includes(term))
    );
  });

  const hasAlerts = (r: Replay) => r.states.some((s) => s !== "alert");

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
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                Telemetry Storage •{" "}
                {loading ? "Loading..." : `${filtered.length} clip${filtered.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
          </div>

          <input
            type="text"
            placeholder="SEARCH DATA..."
            className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-black uppercase tracking-widest placeholder:text-gray-300 w-full md:w-64 focus:outline-none focus:border-[#005fe7] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </header>

        {loading && (
          <div className="text-center py-24 text-[12px] font-black uppercase tracking-widest text-gray-300">
            Loading telemetry...
          </div>
        )}

        {error && (
          <div className="text-center py-24 text-[12px] font-black uppercase tracking-widest text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-300">
            <VideoIcon size={40} strokeWidth={1} />
            <p className="text-[12px] font-black uppercase tracking-widest">No clips recorded yet</p>
            <p className="text-[11px] font-bold text-gray-400">
              Clips are saved automatically when a non-alert state is detected.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((replay) => (
              <div
                key={replay._id}
                className="safeguard-card p-8 flex flex-col justify-between min-h-[240px] hover:border-[#005fe7]/50 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                        {formatDate(replay.sessionStart)}
                      </p>
                      <p className="font-black text-sm uppercase tracking-tight leading-tight group-hover:text-[#005fe7] transition-colors">
                        {replay.driverName}
                      </p>
                    </div>
                    {hasAlerts(replay) && (
                      <AlertTriangle size={14} className="text-red-500 shrink-0 mt-1" />
                    )}
                  </div>

                  {replay.states.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {replay.states.map((s) => (
                        <span
                          key={s}
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                            s === "alert"
                              ? "bg-gray-50 text-gray-400 border-gray-100"
                              : "bg-red-50 text-red-600 border-red-100"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Clock size={12} />
                    <span>{formatDuration(replay.sessionStart, replay.sessionEnd)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveReplay(replay)}
                  className="btn-primary w-full flex items-center justify-center gap-3 mt-8"
                >
                  <Play size={13} fill="currentColor" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Play Clip</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {activeReplay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setActiveReplay(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {formatDate(activeReplay.sessionStart)}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activeReplay.states.map((s) => (
                    <span
                      key={s}
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        s === "alert"
                          ? "bg-gray-50 text-gray-400 border-gray-100"
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setActiveReplay(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <video
              src={activeReplay.videoUrl}
              controls
              autoPlay
              className="w-full bg-black max-h-[60vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

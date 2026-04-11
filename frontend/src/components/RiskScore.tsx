import { useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ShieldAlert, RefreshCw, CheckCircle } from "lucide-react";

interface RiskData {
  score: number | null;
  label: string;
  summary: string;
  recommendations: string[];
}

export default function RiskScore() {
  const { getAccessTokenSilently } = useAuth0();
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRisk = useCallback(async () => {
    const username = localStorage.getItem("username") || "";
    if (!username) return;
    setLoading(true);
    setError("");
    try {
      const token = await getAccessTokenSilently();
      const resp = await fetch(`http://localhost:3001/risk/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to fetch risk score");
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  const scoreColor = () => {
    if (!data || data.score === null) return "text-muted-foreground";
    if (data.score >= 75) return "text-accent-red";
    if (data.score >= 50) return "text-accent-yellow";
    if (data.score >= 25) return "text-primary";
    return "text-accent-green";
  };

  const barColor = () => {
    if (!data || data.score === null) return "bg-muted-foreground";
    if (data.score >= 75) return "bg-accent-red";
    if (data.score >= 50) return "bg-accent-yellow";
    if (data.score >= 25) return "bg-primary";
    return "bg-accent-green";
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <ShieldAlert size={16} className="text-primary" />
          Risk Score
        </div>
        <button
          onClick={fetchRisk}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-foreground/10 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-primary" : "text-muted-foreground"} />
        </button>
      </div>

      {error && <p className="text-accent-red text-xs">{error}</p>}

      {data?.score !== null && data?.score !== undefined ? (
        <>
          <div className="flex items-end gap-3">
            <span className={`text-5xl font-black tabular-nums ${scoreColor()}`}>{data.score}</span>
            <span className={`text-sm font-bold mb-1 ${scoreColor()}`}>{data.label}</span>
          </div>

          {/* Score bar */}
          <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor()}`}
              style={{ width: `${data.score}%` }}
            />
          </div>

          {data.summary && (
            <p className="text-muted-foreground text-xs leading-relaxed">{data.summary}</p>
          )}

          {data.recommendations?.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">To Lower Your Risk</p>
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle size={13} className="text-accent-green mt-0.5 shrink-0" />
                  <span className="text-xs text-foreground/80">{rec}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        !loading && (
          <p className="text-muted-foreground text-xs">No driving data yet — start a session to see your risk score.</p>
        )
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Sparkles, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { getSafetyReport } from '../lib/server-functions';

interface AIReportProps {
  sessionId: string;
}

const AIReport: React.FC<AIReportProps> = ({ sessionId }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSafetyReport(sessionId);
      if (result.report) {
        setReport(result.report);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to connect to safety engine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Sparkles className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">AI Safety Insights</h2>
            <p className="text-muted text-xs uppercase tracking-widest font-black opacity-60">Powered by Gemini 1.5 Pro</p>
          </div>
        </div>
        
        {!report && !loading && (
          <button 
            onClick={generateReport}
            className="btn-primary px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            Generate Report
          </button>
        )}
      </div>

      {loading && (
        <div className="py-12 flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="text-primary animate-spin" size={48} />
          <p className="text-muted font-bold tracking-widest text-xs uppercase">Analyzing driving patterns...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {report && (
        <div className="space-y-6 animate-fade-in">
          <div className="prose prose-invert max-w-none text-muted leading-relaxed text-sm">
            {report.split('\n').map((line, i) => (
              <p key={i} className="mb-4">{line}</p>
            ))}
          </div>
          
          <div className="pt-6 border-t border-white/5 flex items-center gap-3 text-accent-green">
            <ShieldCheck size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Analysis Verified by SafeDrive AI</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReport;

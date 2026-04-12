import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ArrowLeft, Phone, Save, MessageSquare, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/emergency-contacts")({
  head: () => ({
    meta: [ { title: "Safeguard AI — Emergency Contact" } ],
  }),
  component: EmergencyContactPage,
});

function EmergencyContactPage() {
  const { getAccessTokenSilently } = useAuth0();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const username = localStorage.getItem("username");

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`http://localhost:3001/user/${username}/contact`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const contact = Array.isArray(data) ? data[0] : data;
        if (contact?.name) {
          setName(contact.name);
          setPhone(contact.phone);
          setRelationship(contact.relationship);
        }
      } catch (err) { console.error(err); }
    })();
  }, [username, getAccessTokenSilently]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const resp = await fetch(`http://localhost:3001/user/${username}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone, relationship })
      });
      if (resp.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save contact", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#09090b] p-8 lg:p-12 font-sans">
      <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
        
        <header className="flex items-center gap-6 border-b border-gray-100 pb-8">
            <Link to="/dashboard" className="safeguard-card p-3 hover:bg-gray-50 transition-colors">
              <ArrowLeft size={22} className="text-[#005fe7]" />
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Safety Protocol</h1>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mt-1">Emergency Responder Configuration</p>
            </div>
        </header>

        <div className="safeguard-card p-8 bg-gray-50 border-gray-100">
            <div className="flex items-center gap-3 mb-4">
                <ShieldAlert size={20} className="text-[#005fe7]" />
                <h2 className="text-xs font-black uppercase tracking-widest">Protocol Logic</h2>
            </div>
            <p className="text-[12px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                When a critical behavioral state (microsleep) is identified, an automated SMS trigger will be dispatched to this node. Includes real-time GPS telemetry and driver identification hash.
            </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
            <div className="safeguard-card p-8 space-y-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Responder Full Name</label>
                    <input 
                        className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 font-black uppercase tracking-widest text-sm focus:border-[#005fe7] outline-none transition-all"
                        type="text" value={name} onChange={(e) => setName(e.target.value)} required 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Telemetry Contact (Phone)</label>
                    <input 
                        className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 font-black uppercase tracking-widest text-sm focus:border-[#005fe7] outline-none transition-all"
                        type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Node Relationship</label>
                    <input 
                        className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 font-black uppercase tracking-widest text-sm focus:border-[#005fe7] outline-none transition-all"
                        type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)} required 
                    />
                </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-5 flex items-center justify-center gap-3">
                <Save size={20} />
                <span className="text-sm font-black uppercase tracking-widest">{loading ? "SYNCING..." : "COMMIT CHANGES"}</span>
            </button>

            {saved && (
                <div className="text-center text-[#10b981] text-[10px] font-black uppercase tracking-widest animate-fade-in">
                    Protocol updated successfully
                </div>
            )}
        </form>
      </div>
    </div>
  );
}

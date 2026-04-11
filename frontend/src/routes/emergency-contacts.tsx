import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ArrowLeft, Phone, Save, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/emergency-contacts")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Emergency Contact" },
      { name: "description", content: "Set up your emergency contact for drowsiness alerts" },
    ],
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

  // Fetch contact on load
  useState(() => {
    if (!username) return;
    (async () => {
      const token = await getAccessTokenSilently();
      fetch(`http://localhost:3001/user/${username}/contact`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.name) {
            setName(data.name);
            setPhone(data.phone);
            setRelationship(data.relationship);
          }
        });
    })();
  });

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
    <div className="p-8 max-w-2xl mx-auto animate-fade-in pb-48">
      <header className="flex items-center gap-4 mb-12">
        <Link to="/dashboard" className="glass-card p-3 hover:bg-foreground/10 transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </Link>
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Emergency Contact</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-semibold">
            Person to notify when drowsiness is critical
          </p>
        </div>
      </header>

      <div className="glass-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">How it works</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          When the system detects critical drowsiness (PERCLOS &gt; 0.12), an emergency SMS will be sent to your designated contact with your name and live GPS location so they can check on you immediately.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-primary" />
            <h3 className="text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
              Contact Details
            </h3>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Full Name</label>
            <input type="text" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Phone Number</label>
            <input type="tel" placeholder="+1 (555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Relationship</label>
            <input type="text" placeholder="Spouse, Parent, Friend..." value={relationship} onChange={(e) => setRelationship(e.target.value)} required />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full text-lg font-bold py-4">
          <Save size={20} />
          Save Contact
        </button>

        {saved && (
          <div className="text-center text-accent-green text-sm font-bold animate-fade-in">
            ✓ Emergency contact saved successfully!
          </div>
        )}
      </form>
    </div>
  );
}

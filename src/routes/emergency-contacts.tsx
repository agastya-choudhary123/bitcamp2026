import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Phone, User, Save, Plus, Trash2 } from "lucide-react";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export const Route = createFileRoute("/emergency-contacts")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Emergency Contacts" },
      { name: "description", content: "Set up emergency contacts for drowsiness alerts" },
    ],
  }),
  component: EmergencyContactsPage,
});

function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "", phone: "", relationship: "" },
  ]);
  const [saved, setSaved] = useState(false);

  const addContact = () => {
    setContacts([...contacts, { id: Date.now().toString(), name: "", phone: "", relationship: "" }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((c) => c.id !== id));
    }
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setContacts(contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving emergency contacts:", contacts);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in pb-48">
      <header className="flex items-center gap-4 mb-12">
        <Link to="/dashboard" className="glass-card p-3 hover:bg-foreground/10 transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </Link>
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Emergency Contacts</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-semibold">
            People to notify when drowsiness is critical
          </p>
        </div>
      </header>

      <div className="glass-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Phone size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">How it works</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          When the system detects critical drowsiness (PERCLOS &gt; 0.12), your emergency contacts will receive an SMS with your name and GPS location so they can check on you.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {contacts.map((contact, index) => (
          <div key={contact.id} className="glass-card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                Contact {index + 1}
              </h3>
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(contact.id)}
                  className="text-accent-red hover:bg-accent-red/20 p-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-muted-foreground ml-1">Full Name</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={contact.name}
                onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-muted-foreground ml-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={contact.phone}
                onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-muted-foreground ml-1">Relationship</label>
              <input
                type="text"
                placeholder="Spouse, Parent, Friend..."
                value={contact.relationship}
                onChange={(e) => updateContact(contact.id, "relationship", e.target.value)}
                required
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addContact}
          className="w-full glass-card p-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus size={18} />
          Add Another Contact
        </button>

        <button type="submit" className="btn-primary w-full text-lg font-bold py-4">
          <Save size={20} />
          Save Contacts
        </button>

        {saved && (
          <div className="text-center text-accent-green text-sm font-bold animate-fade-in">
            ✓ Emergency contacts saved successfully!
          </div>
        )}
      </form>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus, ShieldPlus } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Sign Up" },
      { name: "description", content: "Create your SafeDrive AI account" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const navigate = Route.useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Signing up...", formData);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card p-10 w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-primary/20 rounded-2xl mb-4 border border-primary/30">
            <ShieldPlus size={48} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Join SafeDrive</h1>
          <p className="text-muted-foreground text-center">Start your journey towards a safer driving experience.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Full Name</label>
            <input type="text" placeholder="John Doe" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Username</label>
            <input type="text" placeholder="johndoe123" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Password</label>
            <input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Confirm Password</label>
            <input type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            <UserPlus size={20} />
            Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/" className="text-primary font-semibold cursor-pointer hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

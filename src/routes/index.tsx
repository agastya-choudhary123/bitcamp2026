import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeDrive AI — Sign In" },
      { name: "description", content: "Sign in to SafeDrive AI drowsiness detection system" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = Route.useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Logging in...", { username, password });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card p-10 w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-primary/20 rounded-2xl mb-4 border border-primary/30">
            <ShieldAlert size={48} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">SafeDrive AI</h1>
          <p className="text-muted-foreground text-center">Your companion for safe, alert driving journeys.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            <LogIn size={20} />
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          New to SafeDrive?{" "}
          <Link to="/signup" className="text-primary font-semibold cursor-pointer hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { LogIn, ShieldAlert } from "lucide-react";

const API = "http://localhost:3001";

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
  const { loginWithRedirect, isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const resp = await fetch(`${API}/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: user.name ?? user.nickname ?? "Driver" }),
        });
        const data = await resp.json();
        localStorage.setItem("driverName", data.user?.name ?? user.name ?? "Driver");
        localStorage.setItem("username", user.sub ?? "");
      } catch (e) {
        // fallback: use Auth0 profile directly
        localStorage.setItem("driverName", user.name ?? user.nickname ?? "Driver");
        localStorage.setItem("username", user.sub ?? "");
      }
      navigate({ to: "/dashboard" });
    })();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-10 w-full max-w-md animate-fade-in flex flex-col items-center gap-4">
          <ShieldAlert size={48} className="text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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

        <button
          onClick={() => loginWithRedirect()}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
        >
          <LogIn size={20} />
          Sign In
        </button>
      </div>
    </div>
  );
}

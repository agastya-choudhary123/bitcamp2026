import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { LogIn, ShieldCheck } from "lucide-react";

const API = "http://localhost:3001";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [ { title: "Safeguard AI — Sign In" } ],
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
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}`,
            "x-safeguard-dev-bypass": "true"
          },
          body: JSON.stringify({ name: user.name ?? user.nickname ?? "Driver", sub: user.sub }),
        });
        const data = await resp.json();
        localStorage.setItem("driverName", data.user?.name ?? user.name ?? "Driver");
        localStorage.setItem("username", user.sub ?? "");
      } catch (e) {
        localStorage.setItem("driverName", user.name ?? user.nickname ?? "Driver");
        localStorage.setItem("username", user.sub ?? "");
      }
      navigate({ to: "/dashboard" });
    })();
  }, [isAuthenticated, user, navigate, getAccessTokenSilently]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck size={48} className="text-[#005fe7] animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Node Syncing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white text-[#09090b]">
      <div className="safeguard-card p-12 w-full max-w-md animate-fade-in text-center">
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-gray-50 rounded-2xl mb-6 border border-gray-100">
            <ShieldCheck size={52} className="text-[#005fe7]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Safeguard AI</h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Intelligent Behavioral Analytics</p>
        </div>

        <button
          onClick={() => loginWithRedirect()}
          className="btn-primary w-full flex items-center justify-center gap-3 py-4"
        >
          <LogIn size={20} />
          <span className="text-sm font-black uppercase tracking-widest">Connect to Node</span>
        </button>
        
        <p className="text-[10px] font-bold text-gray-400 mt-8 uppercase tracking-widest">Authorized Access Only</p>
      </div>
    </div>
  );
}

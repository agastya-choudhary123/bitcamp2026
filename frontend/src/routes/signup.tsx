import { createFileRoute } from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { UserPlus, ShieldPlus } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Safeguard AI — Sign Up" },
      { name: "description", content: "Create your Safeguard AI account" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card p-10 w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-primary/20 rounded-2xl mb-4 border border-primary/30">
            <ShieldPlus size={48} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Join Safeguard</h1>
          <p className="text-muted-foreground text-center">Start your journey towards a safer driving experience.</p>
        </div>

        <button
          onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
        >
          <UserPlus size={20} />
          Create Account
        </button>
      </div>
    </div>
  );
}

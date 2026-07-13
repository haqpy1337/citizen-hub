import { useState } from "react";
import { useAuth } from "../App";
import CrestLogo from "../components/CrestLogo";

type Tab = "login" | "register";

export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="panel w-full max-w-sm p-8 flex flex-col gap-6">
        <div className="flex justify-center">
          <CrestLogo height={48} />
        </div>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-ink">SC Refinery Assistant</h1>
          <p className="text-xs text-muted mt-1">Track your refinery jobs</p>
        </div>

        <div className="flex border border-edge rounded-md overflow-hidden">
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={[
                "flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors",
                tab === t ? "bg-hull text-quant" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="field"
              placeholder="pilot_name"
              autoComplete="username"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

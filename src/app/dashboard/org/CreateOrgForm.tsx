"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"create" | "join">("create");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/dashboard/org/${data.id}`);
    router.refresh();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/orgs/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: inviteToken.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/dashboard/org/${data.orgId}`);
    router.refresh();
  }

  return (
    <div className="panel p-6 space-y-4">
      <div className="flex gap-2">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition ${
              tab === t ? "bg-quant text-void" : "border border-edge text-muted hover:text-ink"
            }`}
          >
            {t === "create" ? "Org erstellen" : "Beitreten"}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Org-Name</label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. ARGO Mining Co."
              required
              minLength={2}
              maxLength={40}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Erstelle…" : "Org erstellen"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="label">Einladungs-Token</label>
            <input
              className="field font-mono"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Token aus dem Einladungslink"
              required
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Beitrete…" : "Org beitreten"}
          </button>
        </form>
      )}
    </div>
  );
}

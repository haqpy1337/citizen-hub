"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Member = {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; username: string };
};

type Split = { userId: string; sharePercent: number; paidOut: boolean };

type Job = {
  id: string;
  stationName: string;
  status: string;
  startedAt: string;
  finishesAt: string;
  durationSec: number;
  materials: { name: string; quantity: number }[];
  user: { id: string; username: string };
  earningsSplits: Split[];
};

type Group = {
  id: string;
  name: string;
  createdAt: string;
  myRole: string;
  creatorId: string;
  creator: { id: string; username: string };
  members: Member[];
};

type UserResult = { id: string; username: string };

export default function GroupDetailClient({
  group: initialGroup,
  initialJobs,
  currentUserId,
}: {
  group: Group;
  initialJobs: Job[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [group, setGroup] = useState(initialGroup);
  const [tab, setTab] = useState<"members" | "jobs">("members");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [editingSplits, setEditingSplits] = useState<Record<string, Record<string, string>>>({});
  const [splitsError, setSplitsError] = useState<Record<string, string>>({});
  const [splitsLoading, setSplitsLoading] = useState<Record<string, boolean>>({});

  // Member search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isCreator = group.myRole === "creator";

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); return; }
    const delay = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const memberIds = new Set(group.members.map((m) => m.userId));
      setSearchResults(data.filter((u: UserResult) => !memberIds.has(u.id)));
    }, 200);
    return () => clearTimeout(delay);
  }, [searchQ, group.members]);

  async function addMember(user: UserResult) {
    setAddingId(user.id);
    const res = await fetch(`/api/groups/${group.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    setAddingId(null);
    if (!res.ok) return;
    const newMember: Member = await res.json();
    setGroup((g) => ({ ...g, members: [...g.members, newMember] }));
    setSearchQ("");
    setSearchResults([]);
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/groups/${group.id}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) return;
    setGroup((g) => ({ ...g, members: g.members.filter((m) => m.userId !== userId) }));
  }

  function openSplitEditor(job: Job) {
    const memberIds = group.members.map((m) => m.userId);
    const existing: Record<string, string> = {};
    for (const m of group.members) {
      const split = job.earningsSplits.find((s) => s.userId === m.userId);
      existing[m.userId] = split ? String(split.sharePercent) : "";
    }
    setEditingSplits((prev) => ({ ...prev, [job.id]: existing }));
  }

  function closeSplitEditor(jobId: string) {
    setEditingSplits((prev) => { const n = { ...prev }; delete n[jobId]; return n; });
    setSplitsError((prev) => { const n = { ...prev }; delete n[jobId]; return n; });
  }

  async function saveSplits(jobId: string) {
    const inputs = editingSplits[jobId] ?? {};
    const splits = Object.entries(inputs)
      .map(([userId, val]) => ({ userId, sharePercent: Number(val) || 0 }))
      .filter((s) => s.sharePercent > 0);
    const total = splits.reduce((s, x) => s + x.sharePercent, 0);
    if (Math.round(total) !== 100) {
      setSplitsError((p) => ({ ...p, [jobId]: `Summe: ${total}% — muss 100% ergeben` }));
      return;
    }
    setSplitsLoading((p) => ({ ...p, [jobId]: true }));
    const res = await fetch(`/api/groups/${group.id}/jobs/${jobId}/splits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splits }),
    });
    setSplitsLoading((p) => ({ ...p, [jobId]: false }));
    if (!res.ok) { setSplitsError((p) => ({ ...p, [jobId]: "Fehler beim Speichern" })); return; }
    const newSplits: Split[] = await res.json();
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, earningsSplits: newSplits } : j));
    closeSplitEditor(jobId);
  }

  async function togglePaidOut(jobId: string, userId: string) {
    const res = await fetch(`/api/groups/${group.id}/jobs/${jobId}/splits/${userId}`, { method: "PATCH" });
    if (!res.ok) return;
    const updated: Split = await res.json();
    setJobs((prev) => prev.map((j) => j.id !== jobId ? j : {
      ...j,
      earningsSplits: j.earningsSplits.map((s) => s.userId === userId ? { ...s, paidOut: updated.paidOut } : s),
    }));
  }

  async function deleteGroup() {
    if (!confirm(`Gruppe "${group.name}" wirklich löschen?`)) return;
    const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/groups");
  }

  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a href="/dashboard/groups" className="text-sm text-muted hover:text-ink transition">Gruppen</a>
            <span className="text-muted/50">/</span>
            <span className="text-sm text-ink">{group.name}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">{group.name}</h1>
          <p className="text-sm text-muted mt-0.5">
            {group.members.length} {group.members.length === 1 ? "Mitglied" : "Mitglieder"} · von {group.creator.username}
          </p>
        </div>
        {isCreator && (
          <button onClick={deleteGroup} className="btn text-danger border-danger/30 hover:bg-danger/10 text-sm px-3 py-1.5">
            Gruppe löschen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-edge">
        {(["members", "jobs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition border-b-2 -mb-px ${
              tab === t ? "border-quant text-quant" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "members" ? "Mitglieder" : "Jobs"}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="space-y-4">
          {/* Add member search */}
          {isCreator && (
            <div className="panel p-4 space-y-2" ref={searchRef}>
              <label className="label">Nutzer hinzufügen</label>
              <input
                className="field"
                placeholder="Username suchen…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="rounded-md border border-edge bg-hull overflow-hidden">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => addMember(u)}
                      disabled={addingId === u.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-panel transition border-b border-edge last:border-0"
                    >
                      <div className="h-7 w-7 rounded-full bg-panel border border-edge flex items-center justify-center text-[11px] font-bold text-ink uppercase">
                        {u.username[0]}
                      </div>
                      <span className="text-sm text-ink">{u.username}</span>
                      {addingId === u.id && <span className="ml-auto text-xs text-muted">…</span>}
                    </button>
                  ))}
                </div>
              )}
              {searchQ.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-muted px-1">Kein Nutzer gefunden.</p>
              )}
            </div>
          )}

          {/* Member list */}
          <div className="space-y-1">
            {group.members.map((m) => (
              <div key={m.userId} className="panel flex items-center gap-3 p-3">
                <div className="h-8 w-8 rounded-full bg-hull border border-edge flex items-center justify-center text-xs font-bold text-ink uppercase shrink-0">
                  {m.user.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{m.user.username}</div>
                  {m.userId === currentUserId && <div className="text-[10px] text-muted">Du</div>}
                </div>
                {m.role === "creator" && (
                  <span className="tag text-[10px] uppercase tracking-wider">Ersteller</span>
                )}
                {isCreator && m.userId !== currentUserId && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="text-xs text-muted hover:text-danger transition ml-2"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="panel p-8 text-center text-muted text-sm">
              Noch keine Jobs von Gruppenmitgliedern.
            </div>
          ) : (
            jobs.map((j) => {
              const isEditing = !!editingSplits[j.id];
              const inputs = editingSplits[j.id] ?? {};
              const total = Object.values(inputs).reduce((s, v) => s + (Number(v) || 0), 0);
              return (
                <div key={j.id} className="panel p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display font-semibold text-ink">{j.stationName}</div>
                      <div className="text-xs text-muted mt-0.5">
                        von <span className="text-ink">{j.user.username}</span> · {formatDuration(j.durationSec)} · {new Date(j.startedAt).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                    <span className={`tag text-[10px] uppercase shrink-0 ${j.status === "running" ? "text-toxic" : "text-muted"}`}>
                      {j.status === "running" ? "Läuft" : "Fertig"}
                    </span>
                  </div>

                  {/* Materials */}
                  {j.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {j.materials.map((m, i) => (
                        <span key={i} className="tag">{m.name} {m.quantity} SCU</span>
                      ))}
                    </div>
                  )}

                  {/* Splits display */}
                  {!isEditing && j.earningsSplits.length > 0 && (
                    <div className="border-t border-edge pt-3 space-y-1.5">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Aufteilung</p>
                      {j.earningsSplits.map((s) => {
                        const member = group.members.find((m) => m.userId === s.userId);
                        return (
                          <div key={s.userId} className="flex items-center gap-2 text-sm">
                            <span className="flex-1 text-ink">{member?.user.username ?? s.userId}</span>
                            <span className="font-mono text-quant tabular-nums">{s.sharePercent}%</span>
                            <button
                              onClick={() => togglePaidOut(j.id, s.userId)}
                              className={`text-xs px-2 py-0.5 rounded border transition ${s.paidOut ? "border-toxic/40 text-toxic" : "border-edge text-muted hover:border-amber hover:text-amber"}`}
                            >
                              {s.paidOut ? "✓ Bezahlt" : "Ausstehend"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Split editor */}
                  {isEditing && (
                    <div className="border-t border-edge pt-3 space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Aufteilung setzen (Summe: <span className={Math.round(total) === 100 ? "text-toxic" : "text-amber"}>{total}%</span>)</p>
                      {group.members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-ink">{m.user.username}</span>
                          <div className="relative w-24">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              className="field pr-6 text-right"
                              value={inputs[m.userId] ?? ""}
                              onChange={(e) => setEditingSplits((prev) => ({
                                ...prev,
                                [j.id]: { ...prev[j.id], [m.userId]: e.target.value }
                              }))}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                          </div>
                        </div>
                      ))}
                      {splitsError[j.id] && <p className="text-xs text-danger">{splitsError[j.id]}</p>}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveSplits(j.id)}
                          disabled={splitsLoading[j.id]}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          {splitsLoading[j.id] ? "…" : "Speichern"}
                        </button>
                        <button onClick={() => closeSplitEditor(j.id)} className="btn-ghost text-xs px-3 py-1.5">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Split action */}
                  {!isEditing && (
                    <div className="border-t border-edge pt-2">
                      <button
                        onClick={() => openSplitEditor(j)}
                        className="text-xs text-muted hover:text-quant transition"
                      >
                        {j.earningsSplits.length > 0 ? "✎ Aufteilung bearbeiten" : "+ Aufteilung setzen"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

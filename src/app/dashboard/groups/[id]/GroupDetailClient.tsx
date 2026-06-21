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
  const [jobs] = useState<Job[]>(initialJobs);

  // Member search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isCreator = group.myRole === "creator";

  useEffect(() => {
    if (!searchOpen) return;
    function onOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [searchOpen]);

  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); return; }
    const delay = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ.trim())}`);
      if (!res.ok) return;
      const data: UserResult[] = await res.json();
      const memberIds = new Set(group.members.map((m) => m.userId));
      setSearchResults(data.filter((u) => !memberIds.has(u.id)));
      setSearchOpen(true);
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
    setSearchOpen(false);
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/groups/${group.id}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) return;
    setGroup((g) => ({ ...g, members: g.members.filter((m) => m.userId !== userId) }));
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
            <div className="panel p-4">
              <label className="label mb-2">Nutzer hinzufügen</label>
              <div className="relative" ref={searchRef}>
                <input
                  className="field"
                  placeholder="Username suchen…"
                  value={searchQ}
                  onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-edge bg-panel overflow-hidden shadow-lg">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addMember(u)}
                        disabled={addingId === u.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-hull transition"
                      >
                        <div className="h-7 w-7 rounded-full bg-hull border border-edge flex items-center justify-center text-[11px] font-bold text-ink uppercase">
                          {u.username[0]}
                        </div>
                        <span className="text-sm text-ink">{u.username}</span>
                        {addingId === u.id && <span className="ml-auto text-xs text-muted">…</span>}
                      </button>
                    ))}
                  </div>
                )}
                {searchOpen && searchQ.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-edge bg-panel px-4 py-3 text-sm text-muted">
                    Kein Nutzer gefunden.
                  </div>
                )}
              </div>
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
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="panel p-8 text-center text-muted text-sm">
              Noch keine Jobs von Gruppenmitgliedern.
            </div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="panel p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display font-semibold text-ink">{j.stationName}</div>
                    <div className="text-xs text-muted mt-0.5">
                      von <span className="text-ink">{j.user.username}</span> · {formatDuration(j.durationSec)} · {new Date(j.startedAt).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <span className={`tag text-[10px] uppercase ${j.status === "running" ? "text-toxic" : "text-muted"}`}>
                    {j.status === "running" ? "Läuft" : "Fertig"}
                  </span>
                </div>
                {j.materials.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {j.materials.map((m, i) => (
                      <span key={i} className="tag">{m.name} {m.quantity} SCU</span>
                    ))}
                  </div>
                )}
                {j.earningsSplits.length > 0 && (
                  <div className="border-t border-edge pt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {j.earningsSplits.map((s) => {
                      const member = group.members.find((m) => m.userId === s.userId);
                      return (
                        <div key={s.userId} className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted">{member?.user.username ?? s.userId}</span>
                          <span className="text-ink font-mono">{s.sharePercent}%</span>
                          <span className={s.paidOut ? "text-toxic" : "text-amber"}>
                            {s.paidOut ? "✓" : "○"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

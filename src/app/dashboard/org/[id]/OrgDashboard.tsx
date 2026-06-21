"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; username: string };
type Member = { userId: string; role: string; user: User };
type GroupMember = { userId: string; user: User };
type Group = { id: string; name: string; members: GroupMember[]; _count: { jobs: number } };
type Split = { userId: string; sharePercent: number; paidOut: boolean };
type Job = {
  id: string; stationName: string; systemName: string | null; status: string;
  startedAt: string; finishesAt: string; groupId: string | null;
  user: User; group: { id: string; name: string } | null;
  materials: { name: string; quantity: number; unit: string; yieldPercent: number | null }[];
  earningsSplits: Split[];
};
type Org = { id: string; name: string; members: Member[]; groups: Group[] };

function estimateValue(job: Job): number {
  return job.materials.reduce((sum, m) => sum + m.quantity * ((m.yieldPercent ?? 100) / 100), 0);
}

export default function OrgDashboard({
  org: initialOrg, myRole, myUserId,
}: {
  org: Org; myRole: string; myUserId: string; myUsername: string;
}) {
  const router = useRouter();
  const [org, setOrg] = useState(initialOrg);
  const [tab, setTab] = useState<"jobs" | "pending" | "members" | "groups">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [splitDraft, setSplitDraft] = useState<Record<string, number>>({});
  const [savingSplit, setSavingSplit] = useState(false);
  const isAdmin = ["owner", "admin"].includes(myRole);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    const res = await fetch(`/api/orgs/${org.id}/jobs`);
    if (res.ok) setJobs(await res.json());
    setLoadingJobs(false);
  }, [org.id]);

  useEffect(() => {
    if (tab === "jobs" || tab === "pending") loadJobs();
  }, [tab, loadJobs]);

  function openSplitEditor(job: Job) {
    setExpandedJob(job.id);
    if (job.earningsSplits.length > 0) {
      const d: Record<string, number> = {};
      job.earningsSplits.forEach((s) => { d[s.userId] = s.sharePercent; });
      setSplitDraft(d);
    } else {
      // Default: equal split among all members
      const share = Math.floor(100 / org.members.length);
      const d: Record<string, number> = {};
      org.members.forEach((m, i) => {
        d[m.userId] = i === 0 ? 100 - share * (org.members.length - 1) : share;
      });
      setSplitDraft(d);
    }
  }

  async function saveSplits(jobId: string) {
    setSavingSplit(true);
    const splits = Object.entries(splitDraft).map(([userId, sharePercent]) => ({ userId, sharePercent }));
    const res = await fetch(`/api/orgs/${org.id}/jobs/${jobId}/splits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splits }),
    });
    if (res.ok) {
      const newSplits: Split[] = await res.json();
      setJobs((js) => js.map((j) => j.id === jobId ? { ...j, earningsSplits: newSplits } : j));
      setExpandedJob(null);
    }
    setSavingSplit(false);
  }

  async function togglePaid(jobId: string, userId: string) {
    const res = await fetch(`/api/orgs/${org.id}/jobs/${jobId}/splits/${userId}`, { method: "PATCH" });
    if (res.ok) {
      const updated: Split = await res.json();
      setJobs((js) => js.map((j) =>
        j.id === jobId
          ? { ...j, earningsSplits: j.earningsSplits.map((s) => s.userId === userId ? updated : s) }
          : j
      ));
    }
  }

  async function generateInvite() {
    const res = await fetch(`/api/orgs/${org.id}/invite`, { method: "POST" });
    if (res.ok) setInviteToken((await res.json()).token);
  }

  async function removeMember(userId: string) {
    const isSelf = userId === myUserId;
    if (!confirm(isSelf ? "Org verlassen?" : "Mitglied entfernen?")) return;
    const res = await fetch(`/api/orgs/${org.id}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) return;
    if (isSelf) { router.push("/dashboard/org"); router.refresh(); return; }
    setOrg((o) => ({ ...o, members: o.members.filter((m) => m.userId !== userId) }));
  }

  async function deleteOrg() {
    if (!confirm(`Org "${org.name}" wirklich löschen?`)) return;
    const res = await fetch(`/api/orgs/${org.id}`, { method: "DELETE" });
    if (res.ok) { router.push("/dashboard/org"); router.refresh(); }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreatingGroup(true);
    const res = await fetch(`/api/orgs/${org.id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName }),
    });
    if (res.ok) {
      const g = await res.json();
      setOrg((o) => ({ ...o, groups: [...o.groups, { ...g, members: g.members ?? [] }] }));
      setNewGroupName("");
    }
    setCreatingGroup(false);
  }

  async function addToGroup(groupId: string, userId: string) {
    const res = await fetch(`/api/orgs/${org.id}/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return;
    const member = org.members.find((m) => m.userId === userId);
    if (!member) return;
    setOrg((o) => ({
      ...o,
      groups: o.groups.map((g) =>
        g.id === groupId ? { ...g, members: [...g.members, { userId, user: member.user }] } : g
      ),
    }));
  }

  async function removeFromGroup(groupId: string, userId: string) {
    const res = await fetch(`/api/orgs/${org.id}/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return;
    setOrg((o) => ({
      ...o,
      groups: o.groups.map((g) =>
        g.id === groupId ? { ...g, members: g.members.filter((m) => m.userId !== userId) } : g
      ),
    }));
  }

  const roleColor = (role: string) =>
    role === "owner" ? "text-amber" : role === "admin" ? "text-quant" : "text-muted";

  const myGroups = org.groups.filter((g) => (g.members ?? []).some((gm) => gm.userId === myUserId));

  // Pending earnings per member
  const pendingByMember = org.members.map((m) => {
    const pending = jobs.flatMap((j) =>
      j.earningsSplits
        .filter((s) => s.userId === m.userId && !s.paidOut)
        .map((s) => ({ job: j, split: s }))
    );
    const total = pending.reduce((sum, { job, split }) => {
      return sum + estimateValue(job) * (split.sharePercent / 100);
    }, 0);
    return { member: m, pending, total };
  }).filter((x) => x.pending.length > 0);

  const splitTotal = Object.values(splitDraft).reduce((s, v) => s + v, 0);

  return (
    <div className="mx-auto max-w-5xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{org.name}</h1>
          <p className="text-muted text-sm">{org.members.length} Mitglieder · {org.groups.length} Gruppen</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={generateInvite} className="btn-ghost text-xs">+ Einladungslink</button>
          )}
          {myRole !== "owner" && (
            <button onClick={() => removeMember(myUserId)} className="btn-danger text-xs py-1.5 px-3">Org verlassen</button>
          )}
          {myRole === "owner" && (
            <button onClick={deleteOrg} className="btn-danger text-xs py-1.5 px-3">Org löschen</button>
          )}
        </div>
      </div>

      {inviteToken && (
        <div className="panel p-4 space-y-2">
          <p className="text-xs text-muted uppercase tracking-wider">Einladungs-Token (7 Tage gültig)</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 font-mono text-sm text-quant bg-hull px-3 py-2 rounded break-all">{inviteToken}</code>
            <button onClick={() => navigator.clipboard.writeText(inviteToken)} className="btn-ghost text-xs shrink-0">Kopieren</button>
          </div>
        </div>
      )}

      {myGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted uppercase tracking-wider">Meine Gruppen:</span>
          {myGroups.map((g) => (
            <div key={g.id} className="flex items-center gap-1 bg-hull border border-edge rounded px-2 py-1">
              <span className="text-xs text-ink">{g.name}</span>
              <button
                onClick={async () => {
                  if (!confirm("Gruppe verlassen?")) return;
                  await removeFromGroup(g.id, myUserId);
                }}
                className="text-muted hover:text-danger text-xs ml-1"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-edge">
        {(["jobs", "pending", "members", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition border-b-2 -mb-px ${
              tab === t ? "border-quant text-quant" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "jobs" ? "Jobs" : t === "pending" ? "Ausstehend" : t === "members" ? "Mitglieder" : "Gruppen"}
          </button>
        ))}
      </div>

      {/* ── Jobs Tab ── */}
      {tab === "jobs" && (
        <div className="space-y-3">
          {loadingJobs && <p className="text-muted text-sm">Lade Jobs…</p>}
          {!loadingJobs && jobs.length === 0 && <p className="text-muted text-sm">Keine Jobs in dieser Org.</p>}
          {jobs.map((job) => {
            const done = job.status === "done" || new Date(job.finishesAt) <= new Date();
            const isExpanded = expandedJob === job.id;
            const hasSplits = job.earningsSplits.length > 0;
            return (
              <div key={job.id} className="panel overflow-hidden">
                <div className="p-4 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{job.stationName}</span>
                      {job.systemName && <span className="text-muted text-xs">{job.systemName}</span>}
                      {job.group && <span className="tag">{job.group.name}</span>}
                      <span className={`tag ${done ? "text-toxic border-toxic/30" : "text-quant border-quant/30"}`}>
                        {done ? "Fertig" : "Läuft"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {(job.materials ?? []).map((m) => (
                        <span key={m.name} className="text-xs text-muted">{m.quantity} {m.unit} {m.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-xs text-quant font-mono">{job.user.username}</p>
                    <p className="text-xs text-muted">{new Date(job.startedAt).toLocaleDateString("de-DE")}</p>
                    <button
                      onClick={() => isExpanded ? setExpandedJob(null) : openSplitEditor(job)}
                      className="text-xs text-muted hover:text-ink transition mt-1"
                    >
                      {hasSplits ? "Aufteilung ✓" : "Aufteilung"} {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Splits: existing view */}
                {!isExpanded && hasSplits && (
                  <div className="border-t border-edge px-4 py-3 flex flex-wrap gap-3">
                    {job.earningsSplits.map((s) => {
                      const user = org.members.find((m) => m.userId === s.userId)?.user;
                      return (
                        <div key={s.userId} className="flex items-center gap-2">
                          <span className={`text-xs font-mono ${s.paidOut ? "text-muted line-through" : "text-ink"}`}>
                            {user?.username ?? s.userId} — {s.sharePercent}%
                          </span>
                          <button
                            onClick={() => togglePaid(job.id, s.userId)}
                            className={`text-xs px-2 py-0.5 rounded border transition ${
                              s.paidOut
                                ? "border-edge text-muted hover:border-quant hover:text-quant"
                                : "border-toxic/40 text-toxic hover:bg-toxic/10"
                            }`}
                          >
                            {s.paidOut ? "Bezahlt ✓" : "Als bezahlt markieren"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Splits: editor */}
                {isExpanded && (
                  <div className="border-t border-edge px-4 py-4 space-y-3">
                    <p className="text-xs text-muted uppercase tracking-wider">Gewinnaufteilung (muss 100% ergeben)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {org.members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2">
                          <span className="text-sm text-ink w-28 truncate">{m.user.username}</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={splitDraft[m.userId] ?? 0}
                            onChange={(e) => setSplitDraft((d) => ({ ...d, [m.userId]: Number(e.target.value) }))}
                            className="field w-20 text-right py-1"
                          />
                          <span className="text-xs text-muted">%</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-mono ${splitTotal === 100 ? "text-toxic" : "text-danger"}`}>
                        Gesamt: {splitTotal}%
                      </span>
                      <button
                        onClick={() => saveSplits(job.id)}
                        disabled={savingSplit || splitTotal !== 100}
                        className="btn-primary text-xs py-1.5"
                      >
                        Speichern
                      </button>
                      <button onClick={() => setExpandedJob(null)} className="text-xs text-muted hover:text-ink">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Ausstehend Tab ── */}
      {tab === "pending" && (
        <div className="space-y-4">
          {loadingJobs && <p className="text-muted text-sm">Lade…</p>}
          {!loadingJobs && pendingByMember.length === 0 && (
            <p className="text-muted text-sm">Keine ausstehenden Zahlungen.</p>
          )}
          {pendingByMember.map(({ member, pending, total }) => (
            <div key={member.userId} className="panel overflow-hidden">
              <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{member.user.username}</span>
                  {member.userId === myUserId && <span className="text-xs text-muted">(du)</span>}
                </div>
                <span className="font-mono text-sm text-quant">
                  {pending.length} Job{pending.length !== 1 ? "s" : ""} ausstehend · ~{total.toFixed(1)} SCU
                </span>
              </div>
              <div className="divide-y divide-edge/40">
                {pending.map(({ job, split }) => (
                  <div key={job.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-ink">{job.stationName}</p>
                      <p className="text-xs text-muted">
                        {new Date(job.startedAt).toLocaleDateString("de-DE")} · {split.sharePercent}% Anteil
                        · von {job.user.username}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePaid(job.id, member.userId)}
                      className="btn-ghost text-xs py-1 shrink-0"
                    >
                      Als bezahlt markieren
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Members Tab ── */}
      {tab === "members" && (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">Spieler</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">Rolle</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted">Gruppen</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {org.members.map((m) => {
                const memberGroups = org.groups.filter((g) =>
                  (g.members ?? []).some((gm) => gm.userId === m.userId)
                );
                return (
                  <tr key={m.userId} className="border-b border-edge/40 last:border-0 hover:bg-hull/50">
                    <td className="px-4 py-3 font-medium text-ink">
                      {m.user.username}
                      {m.userId === myUserId && <span className="ml-2 text-xs text-muted">(du)</span>}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs uppercase ${roleColor(m.role)}`}>{m.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {memberGroups.map((g) => <span key={g.id} className="tag">{g.name}</span>)}
                        {memberGroups.length === 0 && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin && m.userId !== myUserId && m.role !== "owner" && (
                        <button onClick={() => removeMember(m.userId)} className="text-xs text-danger hover:underline">
                          Entfernen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Groups Tab ── */}
      {tab === "groups" && (
        <div className="space-y-4">
          <form onSubmit={createGroup} className="panel p-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Neue Gruppe</label>
              <input
                className="field"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="z.B. Mining Fleet Alpha"
                required
                maxLength={40}
              />
            </div>
            <button type="submit" disabled={creatingGroup} className="btn-primary shrink-0">Erstellen</button>
          </form>

          {org.groups.length === 0 && <p className="text-muted text-sm">Noch keine Gruppen.</p>}

          {org.groups.map((group) => {
            const members = group.members ?? [];
            const iAmInGroup = members.some((gm) => gm.userId === myUserId);
            const notInGroup = org.members.filter((m) => !members.some((gm) => gm.userId === m.userId));
            return (
              <div key={group.id} className="panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-ink">{group.name}</h3>
                    <p className="text-xs text-muted">{group._count?.jobs ?? 0} Jobs · {members.length} Mitglieder</p>
                  </div>
                  {iAmInGroup && (
                    <button onClick={async () => { if (!confirm("Gruppe verlassen?")) return; await removeFromGroup(group.id, myUserId); }} className="text-xs text-danger hover:underline">
                      Verlassen
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.map((gm) => (
                    <div key={gm.userId} className="flex items-center gap-1 bg-hull border border-edge rounded px-2 py-1">
                      <span className="text-xs text-ink">{gm.user?.username ?? gm.userId}</span>
                      {isAdmin && gm.userId !== myUserId && (
                        <button onClick={() => removeFromGroup(group.id, gm.userId)} className="text-muted hover:text-danger text-xs ml-1">×</button>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && <span className="text-xs text-muted">Keine Mitglieder</span>}
                </div>
                {notInGroup.length > 0 && (
                  <div>
                    <p className="label mb-1">Mitglied hinzufügen</p>
                    <div className="flex flex-wrap gap-2">
                      {notInGroup.map((m) => (
                        <button key={m.userId} onClick={() => addToGroup(group.id, m.userId)} className="btn-ghost text-xs py-1">
                          + {m.user.username}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

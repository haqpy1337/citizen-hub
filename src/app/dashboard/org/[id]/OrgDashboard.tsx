"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; username: string };
type Member = { userId: string; role: string; user: User };
type GroupMember = { userId: string; user: User };
type Group = { id: string; name: string; members: GroupMember[]; _count: { jobs: number } };
type Job = {
  id: string; stationName: string; systemName: string | null; status: string;
  startedAt: string; finishesAt: string; groupId: string | null;
  user: User; group: { id: string; name: string } | null;
  materials: { name: string; quantity: number; unit: string }[];
};
type Org = { id: string; name: string; members: Member[]; groups: Group[] };

export default function OrgDashboard({
  org: initialOrg, myRole, myUserId, myUsername,
}: {
  org: Org; myRole: string; myUserId: string; myUsername: string;
}) {
  const router = useRouter();
  const [org, setOrg] = useState(initialOrg);
  const [tab, setTab] = useState<"jobs" | "members" | "groups">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const isAdmin = ["owner", "admin"].includes(myRole);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    const res = await fetch(`/api/orgs/${org.id}/jobs`);
    if (res.ok) setJobs(await res.json());
    setLoadingJobs(false);
  }, [org.id]);

  useEffect(() => { if (tab === "jobs") loadJobs(); }, [tab, loadJobs]);

  async function generateInvite() {
    const res = await fetch(`/api/orgs/${org.id}/invite`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setInviteToken(data.token);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Mitglied entfernen?")) return;
    await fetch(`/api/orgs/${org.id}/members/${userId}`, { method: "DELETE" });
    setOrg((o) => ({ ...o, members: o.members.filter((m) => m.userId !== userId) }));
    if (userId === myUserId) { router.push("/dashboard/org"); router.refresh(); }
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
      setOrg((o) => ({ ...o, groups: [...o.groups, g] }));
      setNewGroupName("");
    }
    setCreatingGroup(false);
  }

  async function addToGroup(groupId: string, userId: string) {
    await fetch(`/api/orgs/${org.id}/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const res = await fetch(`/api/orgs/${org.id}`);
    if (res.ok) { const data = await res.json(); setOrg(data); }
  }

  async function removeFromGroup(groupId: string, userId: string) {
    await fetch(`/api/orgs/${org.id}/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setOrg((o) => ({
      ...o,
      groups: o.groups.map((g) =>
        g.id === groupId ? { ...g, members: g.members.filter((m) => m.userId !== userId) } : g
      ),
    }));
  }

  const roleColor = (role: string) =>
    role === "owner" ? "text-amber" : role === "admin" ? "text-quant" : "text-muted";

  return (
    <div className="mx-auto max-w-5xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{org.name}</h1>
          <p className="text-muted text-sm">{org.members.length} Mitglieder · {org.groups.length} Gruppen</p>
        </div>
        {isAdmin && (
          <button onClick={generateInvite} className="btn-ghost text-xs">
            + Einladungslink
          </button>
        )}
      </div>

      {inviteToken && (
        <div className="panel p-4 space-y-2">
          <p className="text-xs text-muted uppercase tracking-wider">Einladungs-Token (7 Tage gültig)</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 font-mono text-sm text-quant bg-hull px-3 py-2 rounded break-all">
              {inviteToken}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteToken)}
              className="btn-ghost text-xs shrink-0"
            >
              Kopieren
            </button>
          </div>
          <p className="text-xs text-muted">Unter "Org beitreten" auf /dashboard/org eingeben.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-edge">
        {(["jobs", "members", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition border-b-2 -mb-px ${
              tab === t ? "border-quant text-quant" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "jobs" ? "Jobs" : t === "members" ? "Mitglieder" : "Gruppen"}
          </button>
        ))}
      </div>

      {/* Jobs Tab */}
      {tab === "jobs" && (
        <div className="space-y-3">
          {loadingJobs && <p className="text-muted text-sm">Lade Jobs…</p>}
          {!loadingJobs && jobs.length === 0 && (
            <p className="text-muted text-sm">Keine Jobs in dieser Org.</p>
          )}
          {jobs.map((job) => {
            const done = job.status === "done" || new Date(job.finishesAt) <= new Date();
            return (
              <div key={job.id} className="panel p-4 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink">{job.stationName}</span>
                    {job.systemName && <span className="text-muted text-xs">{job.systemName}</span>}
                    {job.group && (
                      <span className="tag">{job.group.name}</span>
                    )}
                    <span className={`tag ${done ? "text-toxic border-toxic/30" : "text-quant border-quant/30"}`}>
                      {done ? "Fertig" : "Läuft"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {job.materials.map((m) => (
                      <span key={m.name} className="text-xs text-muted">
                        {m.quantity} {m.unit} {m.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-quant font-mono">{job.user.username}</p>
                  <p className="text-xs text-muted">{new Date(job.startedAt).toLocaleDateString("de-DE")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members Tab */}
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
                  g.members.some((gm) => gm.userId === m.userId)
                );
                return (
                  <tr key={m.userId} className="border-b border-edge/40 last:border-0 hover:bg-hull/50">
                    <td className="px-4 py-3 font-medium text-ink">
                      {m.user.username}
                      {m.userId === myUserId && <span className="ml-2 text-xs text-muted">(du)</span>}
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs uppercase ${roleColor(m.role)}`}>
                      {m.role}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {memberGroups.map((g) => (
                          <span key={g.id} className="tag">{g.name}</span>
                        ))}
                        {memberGroups.length === 0 && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(isAdmin || m.userId === myUserId) && m.role !== "owner" && (
                        <button
                          onClick={() => removeMember(m.userId)}
                          className="text-xs text-danger hover:underline"
                        >
                          {m.userId === myUserId ? "Verlassen" : "Entfernen"}
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

      {/* Groups Tab */}
      {tab === "groups" && (
        <div className="space-y-4">
          {isAdmin && (
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
              <button type="submit" disabled={creatingGroup} className="btn-primary shrink-0">
                Erstellen
              </button>
            </form>
          )}

          {org.groups.length === 0 && (
            <p className="text-muted text-sm">Noch keine Gruppen.</p>
          )}

          {org.groups.map((group) => (
            <div key={group.id} className="panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{group.name}</h3>
                  <p className="text-xs text-muted">{group._count.jobs} Jobs · {group.members.length} Mitglieder</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.members.map((gm) => (
                  <div key={gm.userId} className="flex items-center gap-1 bg-hull rounded px-2 py-1">
                    <span className="text-xs text-ink">{gm.user.username}</span>
                    {isAdmin && (
                      <button
                        onClick={() => removeFromGroup(group.id, gm.userId)}
                        className="text-muted hover:text-danger text-xs ml-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {group.members.length === 0 && <span className="text-xs text-muted">Keine Mitglieder</span>}
              </div>
              {isAdmin && (
                <div>
                  <p className="label mb-1">Mitglied hinzufügen</p>
                  <div className="flex flex-wrap gap-2">
                    {org.members
                      .filter((m) => !group.members.some((gm) => gm.userId === m.userId))
                      .map((m) => (
                        <button
                          key={m.userId}
                          onClick={() => addToGroup(group.id, m.userId)}
                          className="btn-ghost text-xs py-1"
                        >
                          + {m.user.username}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

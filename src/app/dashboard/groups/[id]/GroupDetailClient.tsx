"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getClientOres } from "@/lib/clientUex";
import type { FullOre } from "@/app/api/ores/route";
import Avatar from "@/components/Avatar";
import { useT } from "@/components/LanguageProvider";

type Member = {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
};

type Split = { userId: string; sharePercent: number; paidOut: boolean };

type JobMaterial = {
  name: string;
  quantity: number;
  commodityId: number | null;
  yieldPercent: number | null;
  unit: string;
};

type Job = {
  id: string;
  stationName: string;
  status: string;
  startedAt: string;
  finishesAt: string;
  durationSec: number;
  materials: JobMaterial[];
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
  const { t } = useT();
  const [group, setGroup] = useState(initialGroup);
  const [tab, setTab] = useState<"members" | "jobs">("members");
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [editingSplits, setEditingSplits] = useState<Record<string, Record<string, string>>>({});
  const [splitsError, setSplitsError] = useState<Record<string, string>>({});
  const [splitsLoading, setSplitsLoading] = useState<Record<string, boolean>>({});
  const [allOres, setAllOres] = useState<FullOre[]>([]);

  useEffect(() => {
    getClientOres().then(setAllOres).catch(() => {});
  }, []);

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

  function calcJobValue(job: Job): number | null {
    if (allOres.length === 0) return null;
    const refinedPriceMap = new Map<number, number>();
    for (const o of allOres) {
      if (o.isRefined && o.parentId && o.priceSell) {
        const existing = refinedPriceMap.get(o.parentId);
        if (!existing || o.priceSell > existing) refinedPriceMap.set(o.parentId, o.priceSell);
      }
    }
    let total = 0;
    let anyPrice = false;
    for (const mat of job.materials) {
      const yieldMod = mat.yieldPercent ?? 0;
      const refined = mat.quantity * (100 + yieldMod) / 100;
      let price: number | null = null;
      if (mat.commodityId != null) price = refinedPriceMap.get(mat.commodityId) ?? null;
      if (price == null) {
        const needle = mat.name.toLowerCase().replace("(raw)", "(refined)").trim();
        price = allOres.find((o) => o.name.toLowerCase() === needle)?.priceSell ?? null;
      }
      if (price != null) { total += refined * price; anyPrice = true; }
    }
    return anyPrice ? total : null;
  }

  function openSplitEditor(job: Job) {
    const existing: Record<string, string> = {};
    const hasExisting = job.earningsSplits.length > 0;
    const n = group.members.length;
    if (hasExisting) {
      for (const m of group.members) {
        const split = job.earningsSplits.find((s) => s.userId === m.userId);
        existing[m.userId] = split ? String(split.sharePercent) : "";
      }
    } else {
      const base = Math.floor(100 / n);
      const remainder = 100 - base * n;
      group.members.forEach((m, i) => {
        existing[m.userId] = String(base + (i === 0 ? remainder : 0));
      });
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
      setSplitsError((p) => ({ ...p, [jobId]: t.groups.splits.sum(total) }));
      return;
    }
    setSplitsLoading((p) => ({ ...p, [jobId]: true }));
    const res = await fetch(`/api/groups/${group.id}/jobs/${jobId}/splits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splits }),
    });
    setSplitsLoading((p) => ({ ...p, [jobId]: false }));
    if (!res.ok) { setSplitsError((p) => ({ ...p, [jobId]: t.groups.splits.error })); return; }
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
    if (!confirm(t.groups.deleteConfirm(group.name))) return;
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
            <a href="/dashboard/groups" className="text-sm text-muted hover:text-ink transition">{t.groups.heading}</a>
            <span className="text-muted/50">/</span>
            <span className="text-sm text-ink">{group.name}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">{group.name}</h1>
          <p className="text-sm text-muted mt-0.5">
            {group.members.length} {group.members.length === 1 ? t.groups.member : t.groups.members} · {t.groups.by} {group.creator.username}
          </p>
        </div>
        {isCreator && (
          <button onClick={deleteGroup} className="btn text-danger border-danger/30 hover:bg-danger/10 text-sm px-3 py-1.5">
            {t.groups.deleteGroup}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-edge">
        {(["members", "jobs"] as const).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition border-b-2 -mb-px ${
              tab === tabId ? "border-quant text-quant" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tabId === "members" ? t.groups.tabs.members : t.groups.tabs.jobs}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="space-y-4">
          {/* Add member search */}
          {isCreator && (
            <div className="panel p-4 space-y-2" ref={searchRef}>
              <label className="label">{t.groups.addMember}</label>
              <input
                className="field"
                placeholder={t.groups.searchPlaceholder}
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
                <p className="text-sm text-muted px-1">{t.groups.notFound}</p>
              )}
            </div>
          )}

          {/* Member list */}
          <div className="space-y-1">
            {group.members.map((m) => (
              <div key={m.userId} className="panel flex items-center gap-3 p-3">
                <Avatar username={m.user.username} avatarUrl={m.user.avatarUrl} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{m.user.username}</div>
                </div>
                {m.role === "creator" && (
                  <span className="tag text-[10px] uppercase tracking-wider">{t.groups.creator}</span>
                )}
                {isCreator && m.userId !== currentUserId && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="text-xs text-muted hover:text-danger transition ml-2"
                  >
                    {t.groups.remove}
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
              {t.groups.jobs.empty}
            </div>
          ) : (
            jobs.map((j) => {
              const isEditing = !!editingSplits[j.id];
              const inputs = editingSplits[j.id] ?? {};
              const total = Object.values(inputs).reduce((s, v) => s + (Number(v) || 0), 0);
              const jobValue = calcJobValue(j);
              return (
                <div key={j.id} className="panel p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display font-semibold text-ink">{j.stationName}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {t.groups.jobs.by} <span className="text-ink">{j.user.username}</span> · {formatDuration(j.durationSec)} · {new Date(j.startedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`tag text-[10px] uppercase shrink-0 ${j.status === "running" ? "text-toxic" : "text-muted"}`}>
                      {j.status === "running" ? t.groups.jobs.running : t.groups.jobs.done}
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
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{t.groups.splits.heading}</p>
                      {j.earningsSplits.map((s) => {
                        const member = group.members.find((m) => m.userId === s.userId);
                        const share = jobValue != null ? Math.round(s.sharePercent / 100 * jobValue) : null;
                        return (
                          <div key={s.userId} className="flex items-center gap-2 text-sm">
                            <span className="flex-1 text-ink">{member?.user.username ?? s.userId}</span>
                            <span className="font-mono text-quant tabular-nums">{s.sharePercent}%</span>
                            {share != null && (
                              <span className="font-mono text-xs text-muted tabular-nums">~{share.toLocaleString()} aUEC</span>
                            )}
                            <button
                              onClick={() => togglePaidOut(j.id, s.userId)}
                              className={`text-xs px-2 py-0.5 rounded border transition ${s.paidOut ? "border-toxic/40 text-toxic" : "border-edge text-muted hover:border-amber hover:text-amber"}`}
                            >
                              {s.paidOut ? t.groups.splits.paid : t.groups.splits.pending}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Split editor */}
                  {isEditing && (
                    <div className="border-t border-edge pt-3 space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        {t.groups.splits.heading} (<span className={Math.round(total) === 100 ? "text-toxic" : "text-amber"}>{total}%</span>)
                      </p>
                      {group.members.map((m) => {
                        const pct = Number(inputs[m.userId] ?? 0) || 0;
                        const share = jobValue != null && pct > 0 ? Math.round(pct / 100 * jobValue) : null;
                        return (
                          <div key={m.userId} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-ink">{m.user.username}</span>
                            {share != null && (
                              <span className="font-mono text-xs text-muted tabular-nums">~{share.toLocaleString()} aUEC</span>
                            )}
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
                        );
                      })}
                      {splitsError[j.id] && <p className="text-xs text-danger">{splitsError[j.id]}</p>}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveSplits(j.id)}
                          disabled={splitsLoading[j.id]}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          {splitsLoading[j.id] ? t.groups.splits.saving : t.groups.splits.save}
                        </button>
                        <button onClick={() => closeSplitEditor(j.id)} className="btn-ghost text-xs px-3 py-1.5">
                          {t.groups.splits.cancel}
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
                        {j.earningsSplits.length > 0 ? t.groups.splits.editSplit : t.groups.splits.setSplit}
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

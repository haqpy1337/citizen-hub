"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LanguageProvider";

type Group = {
  id: string;
  name: string;
  createdAt: string;
  role: string;
  creator: { id: string; username: string };
  _count: { members: number };
};

export default function GroupsClient({ initialGroups }: { initialGroups: Group[] }) {
  const { t } = useT();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createGroup() {
    if (!name.trim()) return;
    setCreating(true);
    setErr(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setErr(data.error ?? t.groups.error); return; }
    setGroups((prev) => [data, ...prev]);
    setName("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{t.groups.heading}</h1>
        <p className="text-sm text-muted mt-1">{t.groups.subtitle}</p>
      </div>

      {/* Create form */}
      <div className="panel p-5">
        <h2 className="font-display font-semibold text-base text-ink mb-3">{t.groups.createHeading}</h2>
        <div className="flex gap-3">
          <input
            className="field flex-1"
            placeholder={t.groups.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
            maxLength={64}
          />
          <button
            className="btn-primary px-5"
            onClick={createGroup}
            disabled={creating || !name.trim()}
          >
            {creating ? "…" : t.groups.create}
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      </div>

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="panel p-8 text-center text-muted text-sm">
          {t.groups.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/dashboard/groups/${g.id}`}
              className="panel flex items-center gap-4 p-4 hover:border-quant/40 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-hull border border-edge font-display font-bold text-quant">
                {g.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-ink">{g.name}</div>
                <div className="text-xs text-muted mt-0.5">
                  {g._count.members} {g._count.members === 1 ? t.groups.member : t.groups.members} · {t.groups.by} {g.creator.username}
                </div>
              </div>
              {g.role === "creator" && (
                <span className="tag text-[10px] uppercase tracking-wider">{t.groups.creator}</span>
              )}
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted shrink-0">
                <path d="M7 5l5 5-5 5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

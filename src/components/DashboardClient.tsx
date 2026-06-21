"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActiveJob = {
  id: string;
  stationName: string;
  durationSec: number;
  finishesAt: string;
  materials: { name: string }[];
};

type ItemId =
  | "active-jobs"
  | "tile-jobs" | "tile-history" | "tile-ores"
  | "tile-trade" | "tile-refineries" | "tile-org" | "tile-new-job";

type SectionLayout = "full" | "sidebar";
type ConfigEntry = { id: ItemId; visible: boolean; sidebarLayout?: SectionLayout };
type Config = ConfigEntry[];

type ItemMeta = {
  id: ItemId; type: "section" | "tile"; label: string;
  sub?: string; href?: string; icon?: string; colorVar: string; dimVar: string;
};

// ── Metadata ──────────────────────────────────────────────────────────────────

const META: Record<ItemId, ItemMeta> = {
  "active-jobs":     { id: "active-jobs",     type: "section", label: "Active Jobs",    colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-jobs":       { id: "tile-jobs",        type: "tile", label: "My Jobs",       sub: "Manage your refinery orders",          href: "/dashboard/jobs",        icon: "⛏", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
  "tile-history":    { id: "tile-history",     type: "tile", label: "Job History",    sub: "Past runs with profit estimates",      href: "/dashboard/history",     icon: "▤", colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)" },
  "tile-ores":       { id: "tile-ores",        type: "tile", label: "Ore Prices",     sub: "Live prices for all ores",             href: "/dashboard/ores",        icon: "◇", colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-trade":      { id: "tile-trade",       type: "tile", label: "Trade Routes",   sub: "Best buy → sell routes by profit/SCU", href: "/dashboard/trade",       icon: "⇄", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
  "tile-refineries": { id: "tile-refineries",  type: "tile", label: "Refineries",     sub: "Live overview of all stations",        href: "/dashboard/refineries",  icon: "◈", colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)" },
  "tile-org":        { id: "tile-org",         type: "tile", label: "Org",            sub: "Shared jobs, groups & earnings",       href: "/dashboard/org",         icon: "◉", colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-new-job":    { id: "tile-new-job",     type: "tile", label: "New Job",        sub: "Log a new refinery drop-off",          href: "/dashboard/jobs/new",    icon: "+", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
};

const DEFAULT_ORDER: ItemId[] = ["active-jobs","tile-jobs","tile-history","tile-ores","tile-trade","tile-refineries","tile-org","tile-new-job"];
const STORAGE_KEY = "hma-dashboard-layout-v2";

function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER.map((id) => ({ id, visible: true }));
    const parsed: Config = JSON.parse(raw);
    const stored = new Set(parsed.map((x) => x.id));
    const merged = [...parsed];
    for (const id of DEFAULT_ORDER) if (!stored.has(id)) merged.push({ id, visible: true });
    return merged;
  } catch {
    return DEFAULT_ORDER.map((id) => ({ id, visible: true }));
  }
}
function saveConfig(c: Config) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

// ── Sub-components (defined outside main component for stable identity) ────────

function ActiveJobsSection({ jobs, compact }: { jobs: ActiveJob[]; compact?: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 10000); return () => clearInterval(id); }, []);
  if (jobs.length === 0) return null;
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between">
        <h2 className={`font-display font-semibold text-ink flex items-center gap-2 ${compact ? "text-base" : "text-lg"}`}>
          <span className="inline-block w-2 h-2 rounded-full bg-toxic animate-pulse shrink-0" />
          Currently Running
        </h2>
        <Link href="/dashboard/jobs" className="font-mono text-xs text-quant hover:underline">View all →</Link>
      </div>
      <div className={compact ? "space-y-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        {jobs.map((job) => {
          const now = Date.now();
          const finishes = new Date(job.finishesAt).getTime();
          const leftSec = Math.max(0, Math.floor((finishes - now) / 1000));
          const pct = Math.min(100, ((job.durationSec - leftSec) / job.durationSec) * 100);
          const ready = leftSec === 0;
          const h = Math.floor(leftSec / 3600);
          const m = Math.floor((leftSec % 3600) / 60);
          const timeLeft = h > 0 ? `${h}h ${m}m` : `${m}m`;
          return (
            <div key={job.id} className="panel p-3 relative overflow-hidden" style={ready ? { borderColor: "rgba(90,170,48,0.4)" } : undefined}>
              {ready && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top right,rgba(90,170,48,0.07) 0%,transparent 60%)" }} />}
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-ink text-sm truncate">{job.stationName}</div>
                  <div className="text-[11px] text-muted truncate">{job.materials.map((m) => m.name).join(", ")}</div>
                </div>
                <span className={`font-mono text-xs tabular-nums shrink-0 ${ready ? "text-toxic" : "text-quant"}`}>{ready ? "✓ Ready" : timeLeft}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full border border-edge bg-hull">
                <div className={`h-full rounded-full ${ready ? "bg-toxic" : "bg-quant"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DragHandle() {
  return (
    <div className="absolute top-2 left-2 z-20 text-muted/50 hover:text-muted/90 transition-colors select-none" aria-hidden style={{ cursor: "grab" }}>
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
        <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
        <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
        <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
      </svg>
    </div>
  );
}

function Tile({ meta, editing, onRemove }: { meta: ItemMeta; editing: boolean; onRemove: () => void }) {
  const isNew = meta.id === "tile-new-job";
  return (
    <div className="relative h-full">
      {editing && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="absolute -top-2 -right-2 z-30 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-void text-[10px] font-bold shadow-lg hover:scale-110 transition-transform"
        >×</button>
      )}
      {isNew ? (
        <Link href={meta.href!} className="panel group relative flex flex-col items-center justify-center gap-3 p-6 text-center overflow-hidden h-full transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 border-dashed">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(ellipse at center,var(--color-quant-dim) 0%,transparent 70%)" }} />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-edge group-hover:border-quant transition-colors">
            <span className="text-2xl text-muted group-hover:text-quant transition-colors">+</span>
          </div>
          <div className="relative">
            <div className="font-display text-lg font-semibold text-muted group-hover:text-ink transition-colors">New Job</div>
            <div className="text-xs text-muted mt-0.5">{meta.sub}</div>
          </div>
        </Link>
      ) : (
        <Link href={meta.href!} className="panel group relative flex flex-col gap-5 p-6 overflow-hidden h-full transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
          <div className="absolute inset-x-0 top-0 h-0.5 group-hover:h-1 transition-all duration-300" style={{ background: meta.colorVar }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(ellipse at top left,${meta.dimVar} 0%,transparent 60%)` }} />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl group-hover:scale-110 transition-transform" style={{ background: meta.dimVar, color: meta.colorVar }}>{meta.icon}</div>
          </div>
          <div className="relative">
            <div className="font-display text-xl font-semibold text-ink">{meta.label}</div>
            <div className="mt-1 text-sm text-muted">{meta.sub}</div>
          </div>
        </Link>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardClient({ username, activeJobs }: { username: string; activeJobs: ActiveJob[] }) {
  const [config, setConfig] = useState<Config>(() => DEFAULT_ORDER.map((id) => ({ id, visible: true })));
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<ItemId | null>(null);
  const [insertBeforeId, setInsertBeforeId] = useState<ItemId | null>(null);

  useEffect(() => { setConfig(loadConfig()); setHydrated(true); }, []);

  const update = useCallback((next: Config) => { setConfig(next); saveConfig(next); }, []);
  const hide = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, visible: false } : x));
  const show = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, visible: true } : x));
  const toggleSidebar = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, sidebarLayout: x.sidebarLayout === "sidebar" ? "full" : "sidebar" } : x));

  function handleDragStart(e: React.DragEvent, id: ItemId) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setTimeout(() => setDragId(id), 0);
  }

  function handleDragOver(e: React.DragEvent, id: ItemId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setInsertBeforeId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: ItemId) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") as ItemId;
    if (!sourceId || sourceId === targetId) { resetDrag(); return; }
    const next = [...config];
    const from = next.findIndex((x) => x.id === sourceId);
    const to = next.findIndex((x) => x.id === targetId);
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
    resetDrag();
  }

  function resetDrag() { setDragId(null); setInsertBeforeId(null); }

  function pushTransform(id: ItemId): string {
    if (!dragId || !insertBeforeId || id === dragId) return "none";
    const visIds = config.filter((x) => x.visible).map((x) => x.id);
    const gapIdx = visIds.indexOf(insertBeforeId);
    const myIdx = visIds.indexOf(id);
    if (myIdx === gapIdx - 1) return "translateX(-18px)";
    if (myIdx === gapIdx) return "translateX(18px)";
    return "none";
  }

  if (!hydrated) return null;

  const visible = config.filter((x) => x.visible);
  const hidden = config.filter((x) => !x.visible);

  // Group consecutive tiles; sections may pull adjacent tiles into a sidebar-row
  type Group =
    | { kind: "full-section"; entry: ConfigEntry }
    | { kind: "tiles"; entries: ConfigEntry[] }
    | { kind: "sidebar-row"; section: ConfigEntry; tiles: ConfigEntry[] };

  const groups: Group[] = [];
  for (let i = 0; i < visible.length; i++) {
    const entry = visible[i];
    if (META[entry.id].type === "section") {
      if (entry.sidebarLayout === "sidebar") {
        const tiles: ConfigEntry[] = [];
        let j = i + 1;
        while (j < visible.length && META[visible[j].id].type === "tile") { tiles.push(visible[j]); j++; }
        groups.push({ kind: "sidebar-row", section: entry, tiles });
        i = j - 1;
      } else {
        groups.push({ kind: "full-section", entry });
      }
    } else {
      const last = groups[groups.length - 1];
      if (last?.kind === "tiles") last.entries.push(entry);
      else groups.push({ kind: "tiles", entries: [entry] });
    }
  }

  // ── Draggable wrapper ──────────────────────────────────────────────────────
  const makeDraggable = (entry: ConfigEntry, extra?: string) => ({
    draggable: editing,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, entry.id),
    onDragOver: (e: React.DragEvent) => handleDragOver(e, entry.id),
    onDrop: (e: React.DragEvent) => handleDrop(e, entry.id),
    onDragEnd: resetDrag,
    style: {
      transform: pushTransform(entry.id),
      transition: "transform 180ms ease, opacity 180ms ease, box-shadow 180ms ease",
      opacity: dragId === entry.id ? 0.3 : 1,
      cursor: editing ? "grab" : undefined,
    } as React.CSSProperties,
    className: [
      "relative",
      editing && insertBeforeId === entry.id ? "ring-2 ring-quant/70 ring-offset-2 ring-offset-void rounded-lg" : "",
      extra ?? "",
    ].join(" "),
  });

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">
            Welcome back, <span className="text-quant">{username}</span>.
          </h1>
        </div>
        <button
          onClick={() => { setEditing((v) => !v); resetDrag(); }}
          className={`shrink-0 mt-1 flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-wider transition ${editing ? "border-quant text-quant bg-hull" : "border-edge text-muted hover:border-quant hover:text-quant"}`}
        >
          {editing
            ? <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M2 8l4 4 8-8"/></svg>Fertig</>
            : <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M11 2l3 3-8 8H3v-3L11 2z"/></svg>Anpassen</>
          }
        </button>
      </div>

      <div className={`space-y-6 ${editing ? "select-none" : ""}`}>
        {groups.map((group, gi) => {

          if (group.kind === "full-section") {
            const isSidebar = group.entry.sidebarLayout === "sidebar";
            return (
              <div key={group.entry.id} {...makeDraggable(group.entry, editing ? "rounded-lg outline-dashed outline-2 outline-offset-4 p-3 -mx-3 " + (insertBeforeId === group.entry.id ? "outline-quant bg-hull/20" : "outline-edge/30") : "")}>
                {editing && (
                  <>
                    <DragHandle />
                    <div className="flex items-center gap-2 mb-3 pl-5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Currently Running</span>
                      <div className="ml-auto flex gap-1">
                        <button onClick={() => toggleSidebar(group.entry.id)}
                          className={`flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${isSidebar ? "border-quant text-quant" : "border-edge text-muted hover:border-quant hover:text-quant"}`}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
                            <rect x="1" y="2" width="5" height="12" rx="1"/><rect x="8" y="2" width="7" height="12" rx="1"/>
                          </svg>
                          {isSidebar ? "Seitenleiste" : "Vollbreite"}
                        </button>
                        <button onClick={() => hide(group.entry.id)} className="flex items-center gap-1 rounded border border-danger/40 px-2 py-1 text-[10px] text-danger hover:bg-danger/10 transition">
                          × Ausblenden
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {activeJobs.length > 0
                  ? <ActiveJobsSection jobs={activeJobs} />
                  : editing ? <div className="rounded border border-dashed border-edge px-4 py-3 text-xs text-muted">Wird angezeigt wenn Jobs laufen</div>
                  : null}
              </div>
            );
          }

          if (group.kind === "sidebar-row") {
            return (
              <div key={`sr-${gi}`} className="flex gap-4 items-start">
                <div className="w-64 shrink-0"
                  {...makeDraggable(group.section, editing ? "rounded-lg outline-dashed outline-2 outline-offset-2 p-3 " + (insertBeforeId === group.section.id ? "outline-quant bg-hull/20" : "outline-edge/30") : "")}
                >
                  {editing && (
                    <>
                      <DragHandle />
                      <div className="flex items-center gap-1 mb-2 pl-5">
                        <button onClick={() => toggleSidebar(group.section.id)}
                          className="flex items-center gap-1 rounded border border-quant px-2 py-1 font-mono text-[10px] text-quant transition">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
                            <rect x="1" y="2" width="5" height="12" rx="1"/><rect x="8" y="2" width="7" height="12" rx="1"/>
                          </svg>
                          Seitenleiste
                        </button>
                        <button onClick={() => hide(group.section.id)} className="flex items-center gap-1 rounded border border-danger/40 px-2 py-1 text-[10px] text-danger hover:bg-danger/10 transition">×</button>
                      </div>
                    </>
                  )}
                  {activeJobs.length > 0
                    ? <ActiveJobsSection jobs={activeJobs} compact />
                    : editing ? <div className="rounded border border-dashed border-edge px-3 py-2 text-[11px] text-muted">Wird angezeigt wenn Jobs laufen</div>
                    : null}
                </div>
                <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {group.tiles.map((entry) => (
                    <div key={entry.id} {...makeDraggable(entry)}>
                      {editing && <DragHandle />}
                      <Tile meta={META[entry.id]} editing={editing} onRemove={() => hide(entry.id)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // tile grid
          return (
            <div key={`tg-${gi}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.entries.map((entry) => (
                <div key={entry.id} {...makeDraggable(entry)}>
                  {editing && <DragHandle />}
                  <Tile meta={META[entry.id]} editing={editing} onRemove={() => hide(entry.id)} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {editing && hidden.length > 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-edge p-4 space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">Ausgeblendet</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map((entry) => (
              <button key={entry.id} onClick={() => show(entry.id)}
                className="flex items-center gap-2 rounded-md border border-edge bg-hull px-3 py-2 text-muted hover:border-quant hover:text-quant transition">
                <span>{META[entry.id].icon ?? "▤"}</span>
                <span className="font-mono text-xs">{META[entry.id].label}</span>
                <span className="text-quant text-xs">+ Hinzufügen</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 && !editing && (
        <div className="flex flex-col items-center justify-center py-24 text-muted space-y-3">
          <p className="text-sm">Keine Kacheln sichtbar.</p>
          <button onClick={() => setEditing(true)} className="btn-ghost text-xs">Dashboard anpassen</button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActiveJob = {
  id: string; stationName: string; durationSec: number;
  finishesAt: string; materials: { name: string }[];
};

type ItemId =
  | "active-jobs"
  | "tile-jobs" | "tile-history" | "tile-ores"
  | "tile-trade" | "tile-refineries" | "tile-org" | "tile-new-job";

type SidebarSide = "left" | "right";
type ConfigEntry = { id: ItemId; visible: boolean; sidebar?: SidebarSide };
type Config = ConfigEntry[];

type ItemMeta = {
  id: ItemId; type: "section" | "tile"; label: string;
  sub?: string; href?: string; icon?: string; colorVar: string; dimVar: string;
};

// ── Metadata ──────────────────────────────────────────────────────────────────

const META: Record<ItemId, ItemMeta> = {
  "active-jobs":     { id: "active-jobs",     type: "section", label: "Active Jobs",   colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-jobs":       { id: "tile-jobs",        type: "tile", label: "My Jobs",      sub: "Manage your refinery orders",          href: "/dashboard/jobs",       icon: "⛏", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
  "tile-history":    { id: "tile-history",     type: "tile", label: "Job History",   sub: "Past runs with profit estimates",      href: "/dashboard/history",    icon: "▤", colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)" },
  "tile-ores":       { id: "tile-ores",        type: "tile", label: "Ore Prices",    sub: "Live prices for all ores",             href: "/dashboard/ores",       icon: "◇", colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-trade":      { id: "tile-trade",       type: "tile", label: "Trade Routes",  sub: "Best buy → sell routes by profit/SCU", href: "/dashboard/trade",      icon: "⇄", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
  "tile-refineries": { id: "tile-refineries",  type: "tile", label: "Refineries",    sub: "Live overview of all stations",        href: "/dashboard/refineries", icon: "◈", colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)" },
  "tile-org":        { id: "tile-org",         type: "tile", label: "Org",           sub: "Shared jobs, groups & earnings",       href: "/dashboard/org",        icon: "◉", colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-new-job":    { id: "tile-new-job",     type: "tile", label: "New Job",       sub: "Log a new refinery drop-off",          href: "/dashboard/jobs/new",   icon: "+", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
};

const DEFAULT_ORDER: ItemId[] = ["active-jobs","tile-jobs","tile-history","tile-ores","tile-trade","tile-refineries","tile-org","tile-new-job"];
const STORAGE_KEY = "hma-dashboard-layout-v3";

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

// ── Sub-components ────────────────────────────────────────────────────────────

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
          return (
            <div key={job.id} className="panel p-3 relative overflow-hidden" style={ready ? { borderColor: "rgba(90,170,48,0.4)" } : undefined}>
              {ready && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top right,rgba(90,170,48,0.07) 0%,transparent 60%)" }} />}
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-ink text-sm truncate">{job.stationName}</div>
                  <div className="text-[11px] text-muted truncate">{job.materials.map((m) => m.name).join(", ")}</div>
                </div>
                <span className={`font-mono text-xs tabular-nums shrink-0 ${ready ? "text-toxic" : "text-quant"}`}>{ready ? "✓ Ready" : h > 0 ? `${h}h ${m}m` : `${m}m`}</span>
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
    <div className="absolute top-2 left-2 z-20 text-muted/50 hover:text-muted/90 transition-colors select-none" style={{ cursor: "grab" }} aria-hidden>
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

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DashboardClient({ username, activeJobs }: { username: string; activeJobs: ActiveJob[] }) {
  const [config, setConfig] = useState<Config>(() => DEFAULT_ORDER.map((id) => ({ id, visible: true })));
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);

  // Drag state
  const [dragId, setDragId] = useState<ItemId | null>(null);
  const [insertBefore, setInsertBefore] = useState<ItemId | null>(null); // insert dragged item BEFORE this id
  const [sidebarHover, setSidebarHover] = useState<SidebarSide | null>(null); // for active-jobs sidebar drop zones
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setConfig(loadConfig()); setHydrated(true); }, []);

  const update = useCallback((next: Config) => { setConfig(next); saveConfig(next); }, []);
  const hide = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, visible: false } : x));
  const show = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, visible: true } : x));

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: ItemId) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setTimeout(() => setDragId(id), 0);
  }

  // Determine insert-before based on cursor position (left/right half of target)
  function handleDragOverTile(e: React.DragEvent, targetId: ItemId) {
    e.preventDefault();
    e.stopPropagation();
    if (targetId === dragId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX < rect.left + rect.width / 2;
    const visIds = config.filter((x) => x.visible).map((x) => x.id);
    const targetIdx = visIds.indexOf(targetId);

    if (isLeftHalf) {
      setInsertBefore(targetId);
    } else {
      // insert after targetId = insert before the next visible item
      const nextId = visIds[targetIdx + 1] ?? null;
      setInsertBefore(nextId);
    }
    setSidebarHover(null);
  }

  // Sidebar drop zones (only when dragging active-jobs)
  function handleDragOverSidebarZone(e: React.DragEvent, side: SidebarSide) {
    e.preventDefault();
    e.stopPropagation();
    setSidebarHover(side);
    setInsertBefore(null);
  }

  function handleDrop(e: React.DragEvent, targetId?: ItemId, sidebarSide?: SidebarSide) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") as ItemId;
    if (!sourceId) { resetDrag(); return; }

    const next = [...config];

    // Dropping active-jobs onto a sidebar zone
    if (sourceId === "active-jobs" && sidebarSide) {
      const idx = next.findIndex((x) => x.id === "active-jobs");
      if (idx !== -1) next[idx] = { ...next[idx], sidebar: sidebarSide };
      update(next);
      resetDrag();
      return;
    }

    // Reorder: insert before insertBefore
    if (insertBefore && sourceId !== insertBefore) {
      const fromIdx = next.findIndex((x) => x.id === sourceId);
      const [item] = next.splice(fromIdx, 1);
      const toIdx = next.findIndex((x) => x.id === insertBefore);
      next.splice(toIdx, 0, item);
      // Clear sidebar if tile is dropped into grid
      if (sourceId === "active-jobs") next[next.findIndex((x) => x.id === "active-jobs")].sidebar = undefined;
      update(next);
    } else if (targetId && targetId !== sourceId && !insertBefore) {
      // fallback: swap
      const fromIdx = next.findIndex((x) => x.id === sourceId);
      const toIdx = next.findIndex((x) => x.id === targetId);
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      update(next);
    }

    resetDrag();
  }

  function resetDrag() {
    setDragId(null);
    setInsertBefore(null);
    setSidebarHover(null);
  }

  // ── Push transform ─────────────────────────────────────────────────────────

  function getTileTransform(id: ItemId): string {
    if (!dragId || !insertBefore || id === dragId || !editing) return "none";
    const visIds = config.filter((x) => x.visible).map((x) => x.id);
    const gapIdx = visIds.indexOf(insertBefore);
    const myIdx = visIds.indexOf(id);
    if (gapIdx === -1 || myIdx === -1) return "none";
    if (myIdx === gapIdx - 1) return "translateX(-20px)";
    if (myIdx === gapIdx) return "translateX(20px)";
    return "none";
  }

  if (!hydrated) return null;

  const visible = config.filter((x) => x.visible);
  const hidden = config.filter((x) => !x.visible);

  // ── Layout grouping ────────────────────────────────────────────────────────
  // active-jobs with sidebar goes into a sidebar-row with the adjacent tile group
  type Group =
    | { kind: "full-section"; entry: ConfigEntry }
    | { kind: "tiles"; entries: ConfigEntry[] }
    | { kind: "sidebar-row"; section: ConfigEntry; side: SidebarSide; tiles: ConfigEntry[] };

  const groups: Group[] = [];
  for (let i = 0; i < visible.length; i++) {
    const entry = visible[i];
    if (META[entry.id].type === "section") {
      if (entry.sidebar) {
        // collect next tile group
        const tiles: ConfigEntry[] = [];
        let j = i + 1;
        while (j < visible.length && META[visible[j].id].type === "tile") { tiles.push(visible[j]); j++; }
        groups.push({ kind: "sidebar-row", section: entry, side: entry.sidebar, tiles });
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

  const isDraggingSection = dragId === "active-jobs";

  // ── Tile draggable props ───────────────────────────────────────────────────
  function tileProps(entry: ConfigEntry) {
    return {
      draggable: editing,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, entry.id),
      onDragOver: (e: React.DragEvent) => handleDragOverTile(e, entry.id),
      onDrop: (e: React.DragEvent) => handleDrop(e, entry.id),
      onDragEnd: resetDrag,
      style: {
        transform: getTileTransform(entry.id),
        transition: "transform 180ms ease, opacity 150ms ease",
        opacity: dragId === entry.id ? 0.25 : 1,
        cursor: editing ? "grab" as const : undefined,
        position: "relative" as const,
      },
      className: [
        "relative",
        // Drop gap indicator: thin glowing line before this tile
        editing && insertBefore === entry.id
          ? "before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-quant before:rounded-full before:shadow-[0_0_8px_var(--color-quant)]"
          : "",
      ].filter(Boolean).join(" "),
    };
  }

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

      <div className={`space-y-6 ${editing ? "select-none" : ""}`} onDragEnd={resetDrag}>
        {groups.map((group, gi) => {

          // ── Full-width section ──────────────────────────────────────────────
          if (group.kind === "full-section") {
            return (
              <div key={group.entry.id}
                draggable={editing}
                onDragStart={(e) => handleDragStart(e, group.entry.id)}
                onDragOver={(e) => { e.preventDefault(); handleDragOverTile(e, group.entry.id); }}
                onDrop={(e) => handleDrop(e, group.entry.id)}
                onDragEnd={resetDrag}
                className={`relative transition-all duration-200 ${editing ? "rounded-lg outline-dashed outline-2 outline-offset-4 p-3 -mx-3 cursor-grab " + (insertBefore === group.entry.id ? "outline-quant bg-hull/20" : "outline-edge/30") : ""}`}
                style={{ opacity: dragId === group.entry.id ? 0.25 : 1 }}
              >
                {editing && (
                  <>
                    <DragHandle />
                    <div className="flex items-center gap-2 mb-3 pl-5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Currently Running</span>
                      <div className="ml-auto flex gap-1">
                        <span className="font-mono text-[10px] text-muted/50 flex items-center gap-1">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3"><path d="M8 3v10M3 8h10"/></svg>
                          Links/rechts ziehen für Seitenleiste
                        </span>
                        <button onClick={() => hide(group.entry.id)} className="flex items-center gap-1 rounded border border-danger/40 px-2 py-1 text-[10px] text-danger hover:bg-danger/10 transition ml-2">
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

          // ── Sidebar row ─────────────────────────────────────────────────────
          if (group.kind === "sidebar-row") {
            const sectionEl = (
              <div
                draggable={editing}
                onDragStart={(e) => handleDragStart(e, group.section.id)}
                onDragEnd={resetDrag}
                className={`w-56 shrink-0 relative ${editing ? "rounded-lg outline-dashed outline-2 outline-edge/30 outline-offset-2 p-3 cursor-grab" : ""}`}
                style={{ opacity: dragId === group.section.id ? 0.25 : 1 }}
              >
                {editing && (
                  <>
                    <DragHandle />
                    <div className="flex items-center gap-1 mb-2 pl-5">
                      <span className="font-mono text-[10px] text-muted/60">Seitenleiste</span>
                      <button onClick={() => update(config.map((x) => x.id === group.section.id ? { ...x, sidebar: undefined } : x))}
                        className="ml-auto text-[10px] text-muted hover:text-ink transition px-1">↔ Vollbreite</button>
                      <button onClick={() => hide(group.section.id)} className="text-[10px] text-danger px-1">×</button>
                    </div>
                  </>
                )}
                {activeJobs.length > 0
                  ? <ActiveJobsSection jobs={activeJobs} compact />
                  : editing ? <div className="rounded border border-dashed border-edge px-3 py-2 text-[11px] text-muted">Wird angezeigt wenn Jobs laufen</div>
                  : null}
              </div>
            );

            const tilesEl = (
              <div ref={gridRef} className="relative flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Sidebar drop zones (visible when dragging active-jobs) */}
                {editing && isDraggingSection && (
                  <>
                    <div onDragOver={(e) => handleDragOverSidebarZone(e, "left")} onDrop={(e) => handleDrop(e, undefined, "left")}
                      className={`absolute -left-3 top-0 bottom-0 w-8 z-10 flex items-center justify-center rounded-l-lg transition-all ${sidebarHover === "left" ? "bg-quant/20 border-l-2 border-quant" : "bg-quant/5"}`}>
                      <span className="text-[10px] text-quant rotate-180 writing-mode-vertical font-mono" style={{ writingMode: "vertical-rl" }}>← Links</span>
                    </div>
                    <div onDragOver={(e) => handleDragOverSidebarZone(e, "right")} onDrop={(e) => handleDrop(e, undefined, "right")}
                      className={`absolute -right-3 top-0 bottom-0 w-8 z-10 flex items-center justify-center rounded-r-lg transition-all ${sidebarHover === "right" ? "bg-quant/20 border-r-2 border-quant" : "bg-quant/5"}`}>
                      <span className="text-[10px] text-quant font-mono" style={{ writingMode: "vertical-rl" }}>Rechts →</span>
                    </div>
                  </>
                )}
                {group.tiles.map((entry) => (
                  <div key={entry.id} {...tileProps(entry)}>
                    {editing && <DragHandle />}
                    <Tile meta={META[entry.id]} editing={editing} onRemove={() => hide(entry.id)} />
                  </div>
                ))}
              </div>
            );

            return (
              <div key={`sr-${gi}`} className="flex gap-4 items-start">
                {group.side === "left" ? <>{sectionEl}{tilesEl}</> : <>{tilesEl}{sectionEl}</>}
              </div>
            );
          }

          // ── Tile grid ───────────────────────────────────────────────────────
          return (
            <div key={`tg-${gi}`} className="relative">
              {/* Sidebar drop zones (visible when dragging active-jobs over tile grid) */}
              {editing && isDraggingSection && (
                <>
                  <div onDragOver={(e) => handleDragOverSidebarZone(e, "left")} onDrop={(e) => handleDrop(e, undefined, "left")}
                    className={`absolute -left-3 top-0 bottom-0 w-8 z-10 flex items-center justify-center rounded-l-lg transition-all ${sidebarHover === "left" ? "bg-quant/20 border-l-2 border-quant" : "bg-quant/5 border-l border-quant/20"}`}>
                    <span className="text-[10px] text-quant font-mono" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>← Links</span>
                  </div>
                  <div onDragOver={(e) => handleDragOverSidebarZone(e, "right")} onDrop={(e) => handleDrop(e, undefined, "right")}
                    className={`absolute -right-3 top-0 bottom-0 w-8 z-10 flex items-center justify-center rounded-r-lg transition-all ${sidebarHover === "right" ? "bg-quant/20 border-r-2 border-quant" : "bg-quant/5 border-r border-quant/20"}`}>
                    <span className="text-[10px] text-quant font-mono" style={{ writingMode: "vertical-rl" }}>Rechts →</span>
                  </div>
                </>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.entries.map((entry) => (
                  <div key={entry.id} {...tileProps(entry)}>
                    {editing && <DragHandle />}
                    <Tile meta={META[entry.id]} editing={editing} onRemove={() => hide(entry.id)} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden items */}
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

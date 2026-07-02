"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LanguageProvider";

// ── Anime.js Progress Bar ─────────────────────────────────────────────────────

function AnimatedProgressBar({ pct, ready }: { pct: number; ready: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplayed(pct);
      return;
    }
    hasAnimated.current = true;
    const obj = { value: 0 };
    import("animejs").then(({ default: anime }) => {
      anime({
        targets: obj,
        value: pct,
        duration: 1100,
        easing: "easeOutCubic",
        update: () => setDisplayed(obj.value),
      });
    });
  }, [pct]);

  return (
    <div
      className={`h-full rounded-full ${ready ? "bg-toxic" : "bg-quant"}`}
      style={{ width: `${displayed}%` }}
    />
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ActiveJob = {
  id: string;
  stationName: string;
  durationSec: number;
  finishesAt: string;
  materials: { name: string }[];
};

type ItemId =
  | "active-jobs"
  | "tile-jobs"
  | "tile-history"
  | "tile-ores"
  | "tile-trade"
  | "tile-refineries"
  | "tile-mining"
  | "tile-new-job";

type ItemMeta = {
  id: ItemId;
  type: "section" | "tile";
  label: string;
  sub?: string;
  href?: string;
  icon?: string;
  colorVar: string;
  dimVar: string;
};

const DEFAULT_ORDER: ItemId[] = [
  "active-jobs", "tile-jobs", "tile-history", "tile-ores",
  "tile-trade", "tile-refineries", "tile-mining", "tile-new-job",
];

const STORAGE_KEY = "hma-dashboard-layout";

// ── Helpers ──────────────────────────────────────────────────────────────────

type StoredConfig = { id: ItemId; visible: boolean }[];

function loadConfig(): StoredConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER.map((id) => ({ id, visible: true }));
    const parsed: StoredConfig = JSON.parse(raw);
    const validIds = new Set<string>(DEFAULT_ORDER);
    const stored = new Set(parsed.map((x) => x.id));
    // filter out stale IDs that no longer exist, add new defaults
    const merged = parsed.filter((x) => validIds.has(x.id as ItemId));
    for (const id of DEFAULT_ORDER) {
      if (!stored.has(id)) merged.push({ id, visible: true });
    }
    return merged;
  } catch {
    return DEFAULT_ORDER.map((id) => ({ id, visible: true }));
  }
}

function saveConfig(config: StoredConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ── Active Jobs section ───────────────────────────────────────────────────────

function ActiveJobsSection({ jobs, t }: { jobs: ActiveJob[]; t: ReturnType<typeof useT>["t"] }) {
  const [, forceUpdate] = useState(0);
  const cardsAnimated = useRef(false);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (cardsAnimated.current) return;
    cardsAnimated.current = true;
    import("animejs").then(({ default: anime }) => {
      anime({
        targets: "[data-job-card]",
        opacity: [0, 1],
        translateY: [12, 0],
        delay: anime.stagger(80),
        duration: 450,
        easing: "easeOutQuart",
      });
    });
  }, []);

  if (jobs.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-toxic animate-pulse" />
          {t.dashboard.currentlyRunning}
        </h2>
        <Link href="/dashboard/jobs" className="font-mono text-xs text-quant hover:underline">{t.dashboard.viewAll}</Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div key={job.id} data-job-card className="panel p-4 relative overflow-hidden" style={ready ? { borderColor: "rgba(90,170,48,0.4)" } : undefined}>
              {ready && <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(90,170,48,0.07) 0%, transparent 60%)" }} />}
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-ink truncate">{job.stationName}</div>
                  <div className="mt-0.5 text-xs text-muted truncate">{job.materials.map((m) => m.name).join(", ")}</div>
                </div>
                <span className={`font-mono text-sm tabular-nums shrink-0 ${ready ? "text-toxic" : "text-quant"}`}>
                  {ready ? t.dashboard.ready : timeLeft}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-edge bg-hull">
                <AnimatedProgressBar pct={pct} ready={ready} />
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="text-[10px] text-muted font-mono">{Math.round(pct)}{t.dashboard.complete}</span>
                {!ready && <span className="text-[10px] text-muted font-mono">{new Date(job.finishesAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Tile ─────────────────────────────────────────────────────────────────────

function Tile({ meta, editing, onRemove }: { meta: ItemMeta; editing: boolean; onRemove: () => void }) {
  const isNew = meta.id === "tile-new-job";

  if (isNew) {
    return (
      <div className="relative h-full">
        {editing && <RemoveBtn onRemove={onRemove} />}
        <Link
          href={meta.href!}
          className="panel group relative flex flex-col items-center justify-center gap-3 p-6 text-center overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 border-dashed h-full min-h-[160px]"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, var(--color-quant-dim) 0%, transparent 70%)" }} />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-edge group-hover:border-quant transition-colors duration-200">
            <span className="text-2xl text-muted group-hover:text-quant transition-colors duration-200">+</span>
          </div>
          <div className="relative">
            <div className="font-display text-lg font-semibold text-muted group-hover:text-ink transition-colors duration-200">{meta.label}</div>
            <div className="text-xs text-muted mt-0.5">{meta.sub}</div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {editing && <RemoveBtn onRemove={onRemove} />}
      <Link
        href={meta.href!}
        className="panel group relative flex flex-col gap-5 p-6 overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 h-full min-h-[160px]"
      >
        <div className="absolute inset-x-0 top-0 h-0.5 transition-all duration-300 group-hover:h-1" style={{ background: meta.colorVar }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top left, ${meta.dimVar} 0%, transparent 60%)` }} />
        <div className="relative flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-transform duration-200 group-hover:scale-110"
            style={{ background: meta.dimVar, color: meta.colorVar }}>
            {meta.icon}
          </div>
        </div>
        <div className="relative">
          <div className="font-display text-xl font-semibold text-ink transition-colors duration-200 group-hover:text-[var(--tile-color)]" style={{ "--tile-color": meta.colorVar } as React.CSSProperties}>
            {meta.label}
          </div>
          <div className="mt-1 text-sm text-muted">{meta.sub}</div>
        </div>
      </Link>
    </div>
  );
}

function RemoveBtn({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onRemove(); }}
      className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-void text-[10px] font-bold shadow-lg hover:scale-110 transition-transform"
      aria-label="Hide"
    >
      ×
    </button>
  );
}

// ── DragHandle ───────────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <div className="absolute top-2 left-2 z-10 cursor-grab text-muted/40 hover:text-muted transition-colors select-none" aria-hidden>
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
        <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
        <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
        <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardClient({ username, activeJobs }: { username: string; activeJobs: ActiveJob[] }) {
  const { t } = useT();
  const [config, setConfig] = useState<StoredConfig>(() => DEFAULT_ORDER.map((id) => ({ id, visible: true })));
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<ItemId | null>(null);
  const [dragOverId, setDragOverId] = useState<ItemId | null>(null);
  const dragCounter = useRef(0);
  const tilesAnimated = useRef(false);

  // Build META dynamically using translations
  const META: Record<ItemId, ItemMeta> = {
    "active-jobs": {
      id: "active-jobs", type: "section", label: t.dashboard.activeJobs, colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)",
    },
    "tile-jobs": {
      id: "tile-jobs", type: "tile", label: t.dashboard.tiles.jobs.label, sub: t.dashboard.tiles.jobs.sub, href: "/dashboard/jobs", icon: "⛏",
      colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)",
    },
    "tile-history": {
      id: "tile-history", type: "tile", label: t.dashboard.tiles.history.label, sub: t.dashboard.tiles.history.sub, href: "/dashboard/history", icon: "▤",
      colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)",
    },
    "tile-ores": {
      id: "tile-ores", type: "tile", label: t.dashboard.tiles.ores.label, sub: t.dashboard.tiles.ores.sub, href: "/dashboard/ores", icon: "◇",
      colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)",
    },
    "tile-trade": {
      id: "tile-trade", type: "tile", label: t.dashboard.tiles.trade.label, sub: t.dashboard.tiles.trade.sub, href: "/dashboard/trade", icon: "⇄",
      colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)",
    },
    "tile-refineries": {
      id: "tile-refineries", type: "tile", label: t.dashboard.tiles.refineries.label, sub: t.dashboard.tiles.refineries.sub, href: "/dashboard/refineries", icon: "◈",
      colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)",
    },
    "tile-mining": {
      id: "tile-mining", type: "tile", label: t.dashboard.tiles.mining.label, sub: t.dashboard.tiles.mining.sub, href: "/dashboard/mining", icon: "⛏",
      colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)",
    },
    "tile-new-job": {
      id: "tile-new-job", type: "tile", label: t.dashboard.tiles.newJob.label, sub: t.dashboard.tiles.newJob.sub, href: "/dashboard/jobs/new", icon: "+",
      colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)",
    },
  };

  // Load from localStorage after mount
  useEffect(() => {
    setConfig(loadConfig());
    setHydrated(true);
  }, []);

  // Tile entrance animation — fires once after hydration
  useEffect(() => {
    if (!hydrated || tilesAnimated.current) return;
    tilesAnimated.current = true;
    import("animejs").then(({ default: anime }) => {
      anime({
        targets: "[data-tile]",
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.96, 1],
        delay: anime.stagger(65, { start: 60 }),
        duration: 520,
        easing: "easeOutExpo",
      });
    });
  }, [hydrated]);

  const visible = config.filter((x) => x.visible);
  const hidden = config.filter((x) => !x.visible);

  const updateConfig = useCallback((next: StoredConfig) => {
    setConfig(next);
    saveConfig(next);
  }, []);

  function hide(id: ItemId) {
    updateConfig(config.map((x) => x.id === id ? { ...x, visible: false } : x));
  }

  function show(id: ItemId) {
    updateConfig(config.map((x) => x.id === id ? { ...x, visible: true } : x));
  }

  function onDragStart(id: ItemId) {
    setDragId(id);
  }

  function onDragOver(e: React.DragEvent, id: ItemId) {
    e.preventDefault();
    if (id !== dragOverId) setDragOverId(id);
  }

  function onDrop(targetId: ItemId) {
    if (!dragId || dragId === targetId) { resetDrag(); return; }
    const next = [...config];
    const fromIdx = next.findIndex((x) => x.id === dragId);
    const toIdx = next.findIndex((x) => x.id === targetId);
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    updateConfig(next);
    resetDrag();
  }

  function resetDrag() {
    setDragId(null);
    setDragOverId(null);
    dragCounter.current = 0;
  }

  if (!hydrated) return null;

  type RenderGroup =
    | { kind: "section"; item: StoredConfig[0] }
    | { kind: "tiles"; items: StoredConfig[0][] };

  const groups: RenderGroup[] = [];
  for (const item of visible) {
    const meta = META[item.id];
    if (meta.type === "section") {
      groups.push({ kind: "section", item });
    } else {
      const last = groups[groups.length - 1];
      if (last && last.kind === "tiles") {
        last.items.push(item);
      } else {
        groups.push({ kind: "tiles", items: [item] });
      }
    }
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t.dashboard.greeting(username).split(username)[0]}<span className="text-quant">{username}</span>{t.dashboard.greeting(username).split(username)[1]}
          </h1>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className={`shrink-0 flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-wider transition ${
            editing ? "border-quant text-quant bg-hull" : "border-edge text-muted hover:border-quant hover:text-quant"
          }`}
        >
          {editing ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M2 8l4 4 8-8" />
              </svg>
              Done
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M11 2l3 3-8 8H3v-3L11 2z" />
              </svg>
              {t.dashboard.customize}
            </>
          )}
        </button>
      </div>

      {/* Rendered groups */}
      <div className={`space-y-6 ${editing ? "select-none" : ""}`}>
        {groups.map((group, gi) => {
          if (group.kind === "section") {
            const item = group.item;
            const isDragOver = dragOverId === item.id;
            return (
              <div
                key={item.id}
                data-tile
                draggable={editing}
                onDragStart={() => onDragStart(item.id)}
                onDragOver={(e) => onDragOver(e, item.id)}
                onDrop={() => onDrop(item.id)}
                onDragEnd={resetDrag}
                className={`relative transition-all ${editing ? "cursor-grab rounded-lg outline-dashed outline-2 outline-offset-4 p-2 -mx-2 " + (isDragOver ? "outline-quant bg-hull/30" : "outline-edge/40") : ""} ${dragId === item.id ? "opacity-40" : ""}`}
              >
                {editing && <DragHandle />}
                {editing && (
                  <button
                    onClick={() => hide(item.id)}
                    className="absolute -top-2 -right-0 z-10 flex items-center gap-1 rounded-full border border-danger/50 bg-panel px-2 py-0.5 text-[10px] text-danger hover:bg-danger/10 transition"
                  >
                    {t.dashboard.hide}
                  </button>
                )}
                <div className={editing ? "pt-4" : ""}>
                  <ActiveJobsSection jobs={activeJobs} t={t} />
                  {activeJobs.length === 0 && editing && (
                    <div className="rounded-md border border-dashed border-edge px-4 py-3 text-sm text-muted">
                      {t.dashboard.activeJobs}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={gi} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const meta = META[item.id];
                const isDragOver = dragOverId === item.id;
                return (
                  <div
                    key={item.id}
                    data-tile
                    draggable={editing}
                    onDragStart={() => onDragStart(item.id)}
                    onDragOver={(e) => onDragOver(e, item.id)}
                    onDrop={() => onDrop(item.id)}
                    onDragEnd={resetDrag}
                    className={`relative transition-all ${editing ? "cursor-grab" : ""} ${dragId === item.id ? "opacity-40 scale-95" : ""} ${isDragOver && editing ? "scale-105 ring-2 ring-quant ring-offset-2 ring-offset-void rounded-lg" : ""}`}
                  >
                    {editing && <DragHandle />}
                    <Tile
                      meta={meta}
                      editing={editing}
                      onRemove={() => hide(item.id)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Hidden items — shown in edit mode */}
      {editing && hidden.length > 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-edge p-4 space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">{t.dashboard.hiddenSections}</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map((item) => {
              const meta = META[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => show(item.id)}
                  className="flex items-center gap-2 rounded-md border border-edge bg-hull px-3 py-2 text-sm text-muted hover:border-quant hover:text-quant transition"
                >
                  <span>{meta.icon ?? "▤"}</span>
                  <span className="font-mono text-xs">{meta.label}</span>
                  <span className="text-quant text-xs">{t.dashboard.add}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && !editing && (
        <div className="flex flex-col items-center justify-center py-24 text-muted space-y-3">
          <p className="text-sm">{t.dashboard.noTilesVisible}</p>
          <button onClick={() => setEditing(true)} className="btn-ghost text-xs">{t.dashboard.customize}</button>
        </div>
      )}
    </div>
  );
}

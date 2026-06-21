"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ItemId =
  | "tile-jobs" | "tile-history" | "tile-ores"
  | "tile-trade" | "tile-refineries" | "tile-org" | "tile-new-job";

type ConfigEntry = { id: ItemId; visible: boolean };
type Config = ConfigEntry[];

type ItemMeta = {
  id: ItemId; label: string; sub: string; href: string; icon: string; colorVar: string; dimVar: string;
};

const META: Record<ItemId, ItemMeta> = {
  "tile-jobs":       { id: "tile-jobs",       label: "My Jobs",      sub: "Manage your refinery orders",          href: "/dashboard/jobs",       icon: "⛏", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
  "tile-history":    { id: "tile-history",    label: "Job History",  sub: "Past runs with profit estimates",      href: "/dashboard/history",    icon: "▤", colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)" },
  "tile-ores":       { id: "tile-ores",       label: "Ore Prices",   sub: "Live prices for all ores",             href: "/dashboard/ores",       icon: "◇", colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-trade":      { id: "tile-trade",      label: "Trade Routes", sub: "Best buy → sell routes by profit/SCU", href: "/dashboard/trade",      icon: "⇄", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
  "tile-refineries": { id: "tile-refineries", label: "Refineries",   sub: "Live overview of all stations",        href: "/dashboard/refineries", icon: "◈", colorVar: "var(--color-amber)", dimVar: "rgba(224,120,0,0.12)" },
  "tile-org":        { id: "tile-org",        label: "Org",          sub: "Shared jobs, groups & earnings",       href: "/dashboard/org",        icon: "◉", colorVar: "var(--color-toxic)", dimVar: "rgba(90,170,48,0.12)" },
  "tile-new-job":    { id: "tile-new-job",    label: "New Job",      sub: "Log a new refinery drop-off",          href: "/dashboard/jobs/new",   icon: "+", colorVar: "var(--color-quant)", dimVar: "var(--color-quant-dim)" },
};

const DEFAULT_ORDER: ItemId[] = ["tile-jobs","tile-history","tile-ores","tile-trade","tile-refineries","tile-org","tile-new-job"];
const STORAGE_KEY = "hma-dashboard-layout-v4";

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
        <Link href={meta.href} className="panel group relative flex flex-col items-center justify-center gap-3 p-6 text-center overflow-hidden h-full transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 border-dashed">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center,var(--color-quant-dim) 0%,transparent 70%)" }} />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-edge group-hover:border-quant transition-colors">
            <span className="text-2xl text-muted group-hover:text-quant transition-colors">+</span>
          </div>
          <div className="relative">
            <div className="font-display text-lg font-semibold text-muted group-hover:text-ink transition-colors">New Job</div>
            <div className="text-xs text-muted mt-0.5">{meta.sub}</div>
          </div>
        </Link>
      ) : (
        <Link href={meta.href} className="panel group relative flex flex-col gap-5 p-6 overflow-hidden h-full transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
          <div className="absolute inset-x-0 top-0 h-0.5 group-hover:h-1 transition-all duration-300" style={{ background: meta.colorVar }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top left,${meta.dimVar} 0%,transparent 60%)` }} />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl group-hover:scale-110 transition-transform"
              style={{ background: meta.dimVar, color: meta.colorVar }}>{meta.icon}</div>
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

export default function DashboardClient({ username }: { username: string }) {
  const [config, setConfig] = useState<Config>(() => DEFAULT_ORDER.map((id) => ({ id, visible: true })));
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<ItemId | null>(null);
  const [insertBefore, setInsertBefore] = useState<ItemId | null>(null);

  useEffect(() => { setConfig(loadConfig()); setHydrated(true); }, []);

  const update = useCallback((next: Config) => { setConfig(next); saveConfig(next); }, []);
  const hide = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, visible: false } : x));
  const show = (id: ItemId) => update(config.map((x) => x.id === id ? { ...x, visible: true } : x));

  function handleDragStart(e: React.DragEvent, id: ItemId) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setTimeout(() => setDragId(id), 0);
  }

  function handleDragOver(e: React.DragEvent, targetId: ItemId) {
    e.preventDefault();
    if (targetId === dragId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX < rect.left + rect.width / 2;
    const visIds = config.filter((x) => x.visible).map((x) => x.id);
    const targetIdx = visIds.indexOf(targetId);
    setInsertBefore(isLeftHalf ? targetId : (visIds[targetIdx + 1] ?? null));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") as ItemId;
    if (!sourceId || !insertBefore || insertBefore === sourceId) { resetDrag(); return; }
    const next = [...config];
    const from = next.findIndex((x) => x.id === sourceId);
    const [item] = next.splice(from, 1);
    const to = next.findIndex((x) => x.id === insertBefore);
    next.splice(to, 0, item);
    update(next);
    resetDrag();
  }

  function resetDrag() { setDragId(null); setInsertBefore(null); }

  function getTileTransform(id: ItemId): string {
    if (!dragId || !insertBefore || id === dragId || !editing) return "none";
    const visIds = config.filter((x) => x.visible).map((x) => x.id);
    const gapIdx = visIds.indexOf(insertBefore);
    const myIdx = visIds.indexOf(id);
    if (myIdx === gapIdx - 1) return "translateX(-20px)";
    if (myIdx === gapIdx) return "translateX(20px)";
    return "none";
  }

  if (!hydrated) return null;

  const visible = config.filter((x) => x.visible);
  const hidden = config.filter((x) => !x.visible);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
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

      <div className={`${editing ? "select-none" : ""}`} onDragEnd={resetDrag}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => (
            <div
              key={entry.id}
              draggable={editing}
              onDragStart={(e) => handleDragStart(e, entry.id)}
              onDragOver={(e) => handleDragOver(e, entry.id)}
              onDrop={handleDrop}
              onDragEnd={resetDrag}
              className={[
                "relative",
                editing && insertBefore === entry.id
                  ? "before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-0.5 before:rounded-full before:bg-quant before:shadow-[0_0_8px_var(--color-quant)] before:z-10"
                  : "",
              ].join(" ")}
              style={{
                transform: getTileTransform(entry.id),
                transition: "transform 180ms ease, opacity 150ms ease",
                opacity: dragId === entry.id ? 0.25 : 1,
                cursor: editing ? "grab" : undefined,
              }}
            >
              {editing && <DragHandle />}
              <Tile meta={META[entry.id]} editing={editing} onRemove={() => hide(entry.id)} />
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted space-y-3">
            <p className="text-sm">Keine Kacheln sichtbar.</p>
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs">Dashboard anpassen</button>
          </div>
        )}

        {editing && hidden.length > 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-edge p-4 space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Ausgeblendet</p>
            <div className="flex flex-wrap gap-2">
              {hidden.map((entry) => (
                <button key={entry.id} onClick={() => show(entry.id)}
                  className="flex items-center gap-2 rounded-md border border-edge bg-hull px-3 py-2 text-muted hover:border-quant hover:text-quant transition">
                  <span>{META[entry.id].icon}</span>
                  <span className="font-mono text-xs">{META[entry.id].label}</span>
                  <span className="text-quant text-xs">+ Hinzufügen</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

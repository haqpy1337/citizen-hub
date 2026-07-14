import { useEffect, useRef, useState } from "react";
import { useAuth, usePage } from "../App";
import { api, Job } from "../lib/api";
import { formatDuration, secondsLeft } from "../lib/format";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ── Customizable stat tiles ───────────────────────────────────────────────────

type TileId = "active" | "next" | "ready" | "total";
const ALL_TILES: { id: TileId; label: string }[] = [
  { id: "active", label: "Active Jobs" },
  { id: "next",   label: "Next Finish" },
  { id: "ready",  label: "Ready to Collect" },
  { id: "total",  label: "Total Jobs" },
];

function loadTilePrefs(): TileId[] {
  try {
    const s = localStorage.getItem("ch-dash-tiles");
    if (s) {
      const parsed = JSON.parse(s) as TileId[];
      return parsed.filter(id => ALL_TILES.some(t => t.id === id));
    }
  } catch {}
  return ALL_TILES.map(t => t.id);
}

// ── This Week in Star Citizen Panel ──────────────────────────────────────────

interface TwiskItem { title: string; link: string; date: string; imageUrl: string | null; description: string }

function TwiskPanel() {
  const [item, setItem]       = useState<TwiskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  function load() {
    setLoading(true); setError(false);
    window.api.fetchTwisk()
      .then(res => { if (res.ok && res.item) setItem(res.item); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const fmtDate = (d: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); }
    catch { return d.slice(0, 10); }
  };

  return (
    <div className="panel flex flex-col">
      {loading ? (
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-4 h-4 border-2 border-quant/30 border-t-quant rounded-full animate-spin shrink-0" />
          <span className="text-xs font-mono text-muted">Loading…</span>
        </div>
      ) : error || !item ? (
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <span className="text-xs text-muted">Could not load article.</span>
          <div className="flex items-center gap-3">
            <button onClick={load} className="text-xs font-mono text-quant hover:underline">↻ Retry</button>
            <button
              onClick={() => window.open("https://robertsspaceindustries.com/en/comm-link/transmission/")}
              className="text-xs font-mono text-muted hover:text-quant transition-colors"
            >Open RSI ↗</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 p-4">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              className="shrink-0 rounded object-cover"
              style={{ width: 120, height: 80 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">{item.title}</p>
            {item.date && <p className="text-[10px] font-mono text-muted">{fmtDate(item.date)}</p>}
            {item.description && (
              <p className="text-[11px] text-muted/70 leading-relaxed line-clamp-3">{item.description}</p>
            )}
            <div className="flex items-center gap-3 mt-auto pt-1">
              <button
                onClick={() => window.open(item.link)}
                className="text-xs font-mono text-quant hover:underline"
              >Read more ↗</button>
              <button onClick={load} className="text-[10px] font-mono text-muted/40 hover:text-muted">↻</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patch Notes Panel ─────────────────────────────────────────────────────────

interface PatchItem { title: string; link: string; date: string; channel: string }
type PatchTab = "LIVE" | "PTU" | "All";

function PatchNotesPanel() {
  const [items, setItems]     = useState<PatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [idx, setIdx]         = useState(0);
  const [tab, setTab]         = useState<PatchTab>("LIVE");
  const itemsRef              = useRef(items);
  itemsRef.current            = items;

  function fetchNotes() {
    setLoading(true); setError(false); setItems([]); setIdx(0);
    window.api.fetchPatchNotes()
      .then(res => { if (res.ok && res.items.length > 0) setItems(res.items); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetchNotes(); }, []);

  const filtered = tab === "All" ? items : items.filter(i => i.channel === tab);
  const cur      = filtered[Math.min(idx, Math.max(0, filtered.length - 1))];

  const fmtDate = (d: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d.slice(0, 10); }
  };

  function changeTab(t: PatchTab) { setTab(t); setIdx(0); }
  function nav(dir: 1 | -1) { setIdx(i => Math.max(0, Math.min(filtered.length - 1, i + dir))); }

  const CHANNEL_CLS: Record<string, string> = {
    LIVE: "border-quant/60 text-quant bg-quant/10",
    PTU:  "border-amber/60 text-amber bg-amber/10",
    EPTU: "border-muted/40 text-muted",
  };

  return (
    <div className="panel flex flex-col">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2 border-b border-edge/50 shrink-0">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Patch Notes</p>
        <div className="flex gap-1 ml-auto">
          {(["LIVE", "PTU", "All"] as const).map(t => (
            <button
              key={t}
              onClick={() => changeTab(t)}
              className={[
                "text-[10px] font-mono px-2 py-0.5 border transition-all",
                tab === t ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-4 h-4 border-2 border-quant/30 border-t-quant rounded-full animate-spin shrink-0" />
          <span className="text-xs font-mono text-muted">Loading patch notes…</span>
        </div>
      ) : error || !cur ? (
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <span className="text-xs text-muted">
            {items.length > 0 && tab !== "All"
              ? `No ${tab} patches found.`
              : "Could not load patch notes."}
          </span>
          <div className="flex items-center gap-3">
            {(error || items.length === 0) && (
              <button onClick={fetchNotes} className="text-xs font-mono text-quant hover:underline">↻ Retry</button>
            )}
            <button
              onClick={() => window.open("https://robertsspaceindustries.com/comm-link/patch-notes")}
              className="text-xs font-mono text-muted hover:text-quant transition-colors"
            >
              Open RSI Patch Notes ↗
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => nav(-1)}
            disabled={idx === 0}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0"
          >←</button>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border shrink-0 ${CHANNEL_CLS[cur.channel] ?? CHANNEL_CLS.EPTU}`}>
                {cur.channel}
              </span>
              <p className="text-sm font-medium text-ink truncate">{cur.title}</p>
            </div>
            {cur.date && (
              <p className="text-[10px] font-mono text-muted">{fmtDate(cur.date)}</p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-muted/40 tabular-nums">
              {idx + 1} / {filtered.length}
            </span>
            <button
              onClick={() => window.open(cur.link || "https://robertsspaceindustries.com/comm-link/patch-notes")}
              className="text-xs font-mono text-quant hover:underline"
            >
              Full Notes ↗
            </button>
          </div>

          <button
            onClick={() => nav(1)}
            disabled={idx >= filtered.length - 1}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0"
          >→</button>
        </div>
      )}
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onMarkDone }: { job: Job; onMarkDone: () => void }) {
  const now  = useNow();
  const secs = secondsLeft(job.finishesAt, now);
  const done = secs === 0;

  const totalMs   = job.durationSec * 1000;
  const startedMs = new Date(job.startedAt).getTime();
  const elapsed   = now - startedMs;
  const pct = done ? 100 : Math.min(99, Math.round((elapsed / totalMs) * 100));

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{job.stationName}</p>
          {job.systemName && <p className="text-xs text-muted">{job.systemName}</p>}
        </div>
        {job.method && <span className="tag">{job.method}</span>}
      </div>

      {job.materials.length > 0 && (
        <ul className="flex flex-col gap-1">
          {job.materials.map(m => (
            <li key={m.id} className="flex items-center justify-between text-xs">
              <span className="text-ink">{m.name}</span>
              <span className="text-muted tabular-nums">
                {m.quantity} {m.unit}
                {m.yieldPercent != null && <span className="ml-1 text-quant">{m.yieldPercent}%</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="relative h-1 rounded-full overflow-hidden bg-edge">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${pct}%`, background: "var(--color-quant)" }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-muted/60">
          <span>{pct}%</span>
          <span>{done ? "complete" : `${formatDuration(secs)} left`}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-edge">
        <div>
          {done ? (
            <span className="text-xs font-semibold text-quant">Ready to collect</span>
          ) : (
            <span className="text-sm font-mono text-quant tabular-nums">{formatDuration(secs)}</span>
          )}
        </div>
        <button onClick={onMarkDone} className="btn btn-primary text-xs px-3 py-1">Mark Done</button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { token }  = useAuth();
  const { setPage } = usePage();
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [loading, setLoading]     = useState(true);
  const [customize, setCustomize] = useState(false);
  const [visibleTiles, setVisibleTiles] = useState<TileId[]>(loadTilePrefs);
  const now = useNow();

  async function load() {
    if (!token) return;
    try { const data = await api.jobs.list(token); setJobs(data); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);

  async function markDone(id: string) {
    if (!token) return;
    await api.jobs.update(token, id, { status: "done" });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "done" } : j));
  }

  function toggleTile(id: TileId) {
    setVisibleTiles(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id];
      localStorage.setItem("ch-dash-tiles", JSON.stringify(next));
      return next;
    });
  }

  const activeJobs = jobs.filter(j => j.status === "running");
  const doneJobs   = jobs.filter(j => j.status === "done");
  const earliest   = activeJobs.reduce<Job | null>((best, j) =>
    !best || new Date(j.finishesAt) < new Date(best.finishesAt) ? j : best, null);

  const tileContent: Record<TileId, React.ReactNode> = {
    active: <><p className="label">Active Jobs</p><p className="text-3xl font-bold text-quant mt-1">{activeJobs.length}</p></>,
    next:   <><p className="label">Next Finish</p><p className="text-sm font-mono text-ink mt-2">{earliest ? formatDuration(secondsLeft(earliest.finishesAt, now)) : "—"}</p></>,
    ready:  <><p className="label">Ready to Collect</p><p className="text-3xl font-bold text-emerald-400 mt-1">{doneJobs.length}</p></>,
    total:  <><p className="label">Total Jobs</p><p className="text-3xl font-bold text-ink mt-1">{jobs.length}</p></>,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="eyebrow">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomize(c => !c)}
            className={`text-xs font-mono px-2.5 py-1 border transition-all ${customize ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink"}`}
          >
            {customize ? "✓ Done" : "⊞ Customize"}
          </button>
          <button onClick={() => setPage("jobs")} className="btn btn-primary text-sm">+ New Job</button>
        </div>
      </div>

      {/* Stat tiles */}
      {(visibleTiles.length > 0 || customize) && (
        <div>
          {customize && (
            <div className="mb-3 flex flex-wrap gap-2">
              {ALL_TILES.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTile(t.id)}
                  className={`text-[10px] font-mono px-2 py-1 border transition-all ${
                    visibleTiles.includes(t.id)
                      ? "border-quant text-quant bg-quant/10"
                      : "border-edge text-muted/60 hover:border-quant/50"
                  }`}
                >
                  {visibleTiles.includes(t.id) ? "✓" : "+"} {t.label}
                </button>
              ))}
            </div>
          )}
          {visibleTiles.length > 0 && (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(visibleTiles.length, 4)}, minmax(0, 1fr))` }}
            >
              {visibleTiles.map(id => (
                <div key={id} className="panel p-4 relative">
                  {tileContent[id]}
                  {customize && (
                    <button
                      onClick={() => toggleTile(id)}
                      className="absolute top-2 right-2 text-muted/40 hover:text-danger text-[10px] font-mono"
                      title="Hide tile"
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active jobs */}
      <div className="flex flex-col gap-4">
        <p className="eyebrow">Active Jobs</p>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="panel p-10 text-center flex flex-col items-center gap-3">
            <p className="text-muted text-sm">No active refinery jobs</p>
            <button onClick={() => setPage("jobs")} className="btn btn-primary text-sm">Start a Job</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeJobs.map(job => (
              <JobCard key={job.id} job={job} onMarkDone={() => markDone(job.id)} />
            ))}
          </div>
        )}
      </div>

      {/* SC News row */}
      <div className="flex gap-4 pt-2 border-t border-edge/40">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <p className="eyebrow text-muted/50">This Week in Star Citizen</p>
          <TwiskPanel />
        </div>
        <div className="flex flex-col gap-3 shrink-0" style={{ width: 380 }}>
          <p className="eyebrow text-muted/50">Patch Notes</p>
          <PatchNotesPanel />
        </div>
      </div>
    </div>
  );
}

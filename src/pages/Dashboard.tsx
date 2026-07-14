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
      // Validate — keep only known tile IDs
      return parsed.filter(id => ALL_TILES.some(t => t.id === id));
    }
  } catch {}
  return ALL_TILES.map(t => t.id);
}

// ── News Panel ─────────────────────────────────────────────────────────────────

interface NewsItem { title: string; link: string; date: string }
const AUTO_ADVANCE_MS = 8000;

function NewsPanel() {
  const [items, setItems]   = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [idx, setIdx]       = useState(0);
  const [autoKey, setAutoKey] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  function fetchNews() {
    setLoading(true); setError(false); setItems([]); setIdx(0);
    window.api.fetchNews()
      .then(res => { if (res.ok && res.items.length > 0) setItems(res.items); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetchNews(); }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % itemsRef.current.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [items.length, autoKey]);

  function nav(dir: 1 | -1) {
    setIdx(i => (i + dir + items.length) % items.length);
    setAutoKey(k => k + 1);
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  const cur = items[idx] ?? null;

  return (
    <div className="panel flex flex-col">
      {loading ? (
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-4 h-4 border-2 border-quant/30 border-t-quant rounded-full animate-spin shrink-0" />
          <span className="text-xs font-mono text-muted">Loading news…</span>
        </div>
      ) : error || !cur ? (
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <span className="text-xs text-muted">Could not load RSI news.</span>
          <div className="flex items-center gap-3">
            <button onClick={fetchNews} className="text-xs font-mono text-quant hover:underline">↻ Retry</button>
            <button
              onClick={() => window.open("https://robertsspaceindustries.com/comm-link")}
              className="text-xs font-mono text-muted hover:text-quant transition-colors"
            >
              Open Comm-Link ↗
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 px-5 py-4">
          <button onClick={() => nav(-1)} disabled={items.length <= 1}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0">←</button>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p className="text-sm font-medium text-ink leading-snug truncate">{cur.title}</p>
            <div className="flex items-center gap-3">
              {cur.date && <span className="text-[10px] text-muted font-mono">{fmtDate(cur.date)}</span>}
              <button
                onClick={() => window.open(cur.link || "https://robertsspaceindustries.com/comm-link")}
                className="text-[10px] text-quant hover:underline font-mono"
              >Open ↗</button>
            </div>
          </div>

          <div className="flex gap-1 items-center shrink-0">
            {items.map((_, i) => (
              <button key={i} onClick={() => { setIdx(i); setAutoKey(k => k + 1); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-quant" : "bg-muted/30 hover:bg-muted/60"}`} />
            ))}
          </div>

          <button onClick={() => nav(1)} disabled={items.length <= 1}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0">→</button>
          <button onClick={fetchNews} className="text-xs font-mono text-muted/40 hover:text-quant transition-colors shrink-0" title="Refresh">↻</button>
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
  const { token } = useAuth();
  const { setPage } = usePage();
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
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

  const activeJobs  = jobs.filter(j => j.status === "running");
  const doneJobs    = jobs.filter(j => j.status === "done");
  const earliest    = activeJobs.reduce<Job | null>((best, j) =>
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

      {/* Stat tiles — customizable */}
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
            <div className={`grid gap-4 grid-cols-${Math.min(visibleTiles.length, 4)}`}
              style={{ gridTemplateColumns: `repeat(${Math.min(visibleTiles.length, 4)}, minmax(0, 1fr))` }}>
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

      {/* News — visually separated */}
      <div className="flex flex-col gap-3 pt-2 border-t border-edge/40">
        <p className="eyebrow text-muted/50">SC News & Comm-Link</p>
        <NewsPanel />
      </div>
    </div>
  );
}

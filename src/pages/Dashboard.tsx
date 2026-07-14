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

interface NewsItem { title: string; link: string; date: string }

const AUTO_ADVANCE_MS = 8000;

function NewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [idx, setIdx] = useState(0);
  // autoKey resets whenever the user manually navigates, restarting the auto-advance interval
  const [autoKey, setAutoKey] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  function fetchNews() {
    setLoading(true); setError(false); setItems([]); setIdx(0);
    window.api.fetchNews().then(res => {
      if (res.ok && res.items.length > 0) setItems(res.items);
      else setError(true);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }

  useEffect(() => { fetchNews(); }, []);

  // Auto-advance carousel; restarts when autoKey changes (manual navigation)
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIdx(i => (i + 1) % itemsRef.current.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [items.length, autoKey]);

  function nav(dir: 1 | -1) {
    setIdx(i => (i + dir + items.length) % items.length);
    setAutoKey(k => k + 1); // restart auto-advance timer from zero
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
            <button onClick={fetchNews} className="text-xs font-mono text-quant hover:underline">
              ↻ Retry
            </button>
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
          {/* Nav: prev */}
          <button
            onClick={() => nav(-1)}
            disabled={items.length <= 1}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0"
          >
            ←
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p className="text-sm font-medium text-ink leading-snug truncate">{cur.title}</p>
            <div className="flex items-center gap-3">
              {cur.date && <span className="text-[10px] text-muted font-mono">{fmtDate(cur.date)}</span>}
              <button
                onClick={() => window.open(cur.link || "https://robertsspaceindustries.com/comm-link")}
                className="text-[10px] text-quant hover:underline font-mono"
              >
                Open ↗
              </button>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex gap-1 items-center shrink-0">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIdx(i); setAutoKey(k => k + 1); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-quant" : "bg-muted/30 hover:bg-muted/60"}`}
              />
            ))}
          </div>

          {/* Nav: next + refresh */}
          <button
            onClick={() => nav(1)}
            disabled={items.length <= 1}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0"
          >
            →
          </button>
          <button
            onClick={fetchNews}
            className="text-xs font-mono text-muted/40 hover:text-quant transition-colors shrink-0"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onMarkDone }: { job: Job; onMarkDone: () => void }) {
  const now = useNow();
  const secs = secondsLeft(job.finishesAt, now);
  const done = secs === 0;

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
                {m.yieldPercent != null && (
                  <span className="ml-1 text-quant">{m.yieldPercent}%</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-edge">
        <div>
          {done ? (
            <span className="text-xs font-semibold text-quant">Ready to collect</span>
          ) : (
            <span className="text-sm font-mono text-quant tabular-nums">
              {formatDuration(secs)}
            </span>
          )}
        </div>
        <button onClick={onMarkDone} className="btn btn-primary text-xs px-3 py-1">
          Mark Done
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const { setPage } = usePage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  async function load() {
    if (!token) return;
    try {
      const data = await api.jobs.list(token);
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  async function markDone(id: string) {
    if (!token) return;
    await api.jobs.update(token, id, { status: "done" });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "done" } : j));
  }

  const activeJobs = jobs.filter(j => j.status === "running");
  const doneJobs   = jobs.filter(j => j.status === "done");
  const earliest = activeJobs.reduce<Job | null>((best, j) => {
    if (!best) return j;
    return new Date(j.finishesAt) < new Date(best.finishesAt) ? j : best;
  }, null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="eyebrow">Dashboard</h1>
        <button onClick={() => setPage("jobs")} className="btn btn-primary text-sm">
          + New Job
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="panel p-4">
          <p className="label">Active Jobs</p>
          <p className="text-3xl font-bold text-quant mt-1">{activeJobs.length}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Next Finish</p>
          <p className="text-sm font-mono text-ink mt-2">
            {earliest ? formatDuration(secondsLeft(earliest.finishesAt, now)) : "—"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="label">Ready to Collect</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{doneJobs.length}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Total Jobs</p>
          <p className="text-3xl font-bold text-ink mt-1">{jobs.length}</p>
        </div>
      </div>

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
            <button onClick={() => setPage("jobs")} className="btn btn-primary text-sm">
              Start a Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeJobs.map(job => (
              <JobCard key={job.id} job={job} onMarkDone={() => markDone(job.id)} />
            ))}
          </div>
        )}
      </div>

      {/* News — visually separated section */}
      <div className="flex flex-col gap-3 pt-2 border-t border-edge/40">
        <p className="eyebrow text-muted/50">SC News & Comm-Link</p>
        <NewsPanel />
      </div>
    </div>
  );
}

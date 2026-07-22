import { useEffect, useState } from "react";
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

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onMarkDone }: { job: Job; onMarkDone: () => void }) { // onMarkDone = mark collected
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
          {job.materials.map(m => {
            const output = m.yieldPercent != null
              ? (m.quality != null
                  ? m.quantity * (m.yieldPercent / 100) * (m.quality / 100)
                  : m.quantity * (m.yieldPercent / 100))
              : null;
            return (
              <li key={m.id} className="flex items-center justify-between text-xs gap-2">
                <span className="text-ink">{m.name}</span>
                <span className="text-muted tabular-nums flex items-center gap-1.5">
                  {m.quantity} {m.unit}
                  {m.yieldPercent != null && <span className="text-quant/70">{m.yieldPercent}%</span>}
                  {m.quality != null && <span className="text-muted/50">Q{m.quality}%</span>}
                  {output != null && <span className="text-quant font-semibold">→ {output.toFixed(1)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

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
        <button onClick={onMarkDone} className="btn btn-primary text-xs px-3 py-1">Mark Collected</button>
      </div>
    </div>
  );
}

// ── History Table ─────────────────────────────────────────────────────────────

type DateSort = "newest" | "oldest";
type ScuSort  = "none" | "high" | "low";

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  collected: "Collected",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<string, string> = {
  done:      "bg-quant/20 text-quant",
  collected: "bg-green-500/20 text-green-400",
  cancelled: "bg-danger/20 text-danger",
};

function HistorySection({ jobs, loading, onDelete }: {
  jobs: Job[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  const [dateSort,  setDateSort]  = useState<DateSort>("newest");
  const [scuSort,   setScuSort]   = useState<ScuSort>("none");
  const [matFilter, setMatFilter] = useState("");

  const totalScu = (job: Job) => job.materials.reduce((s, m) => s + m.quantity, 0);

  const historical = jobs.filter(j => j.status !== "running");
  const filtered = historical
    .filter(job => {
      if (!matFilter.trim()) return true;
      const q = matFilter.trim().toLowerCase();
      return job.materials.some(m => m.name.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (scuSort !== "none") {
        const diff = totalScu(a) - totalScu(b);
        return scuSort === "high" ? -diff : diff;
      }
      const diff = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      return dateSort === "newest" ? -diff : diff;
    });

  function toggleDate() { setDateSort(d => d === "newest" ? "oldest" : "newest"); }
  function toggleScu()  { setScuSort(s => s === "none" ? "high" : s === "high" ? "low" : "none"); }
  const scuLabel = scuSort === "high" ? "SCU ↓" : scuSort === "low" ? "SCU ↑" : "SCU";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="eyebrow">History</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={toggleDate}
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-all border-quant text-quant bg-quant/10">
            {dateSort === "newest" ? "Date ↓" : "Date ↑"}
          </button>
          <button onClick={toggleScu}
            className={["px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-all",
              scuSort !== "none" ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink"].join(" ")}>
            {scuLabel}
          </button>
          <input
            type="text"
            value={matFilter}
            onChange={e => setMatFilter(e.target.value)}
            placeholder="Filter material…"
            className="px-3 py-1.5 text-xs font-mono bg-transparent border border-edge text-ink placeholder:text-muted/40 outline-none focus:border-quant/60 transition-colors min-w-[140px]"
          />
          {matFilter && (
            <button onClick={() => setMatFilter("")} className="text-xs font-mono text-muted/50 hover:text-ink transition-colors">✕</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-muted text-sm">No jobs found.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Date</th>
                <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Station</th>
                <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Method</th>
                <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Materials</th>
                <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Duration</th>
                <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(job => (
                <tr key={job.id} className="border-b border-edge/50 hover:bg-hull/30 transition-colors">
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {new Date(job.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink font-medium">{job.stationName}</p>
                    {job.systemName && <p className="text-muted text-xs">{job.systemName}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{job.method ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {job.materials.length === 0 ? (
                        <span className="text-muted text-xs">—</span>
                      ) : job.materials.map(m => (
                        <span key={m.id} className="tag">{m.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted tabular-nums whitespace-nowrap">
                    {formatDuration(job.durationSec)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={["tag", STATUS_CLASS[job.status] ?? "bg-hull text-muted"].join(" ")}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDelete(job.id)}
                      className="btn btn-ghost btn-danger text-xs px-2 py-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Stat Tiles ────────────────────────────────────────────────────────────────

type TileId = "active" | "next" | "ready" | "total";
const TILES: { id: TileId; label: string }[] = [
  { id: "active", label: "Active Jobs" },
  { id: "next",   label: "Next Finish" },
  { id: "ready",  label: "Ready to Collect" },
  { id: "total",  label: "Total Jobs" },
];

// ── Refinery Jobs Page ────────────────────────────────────────────────────────

export default function RefineryJobs() {
  const { token }    = useAuth();
  const { setPage }  = usePage();
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  async function load() {
    if (!token) return;
    try { const data = await api.jobs.list(token); setJobs(data); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);

  async function markDone(id: string) {
    if (!token) return;
    await api.jobs.update(token, id, { status: "collected" });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "collected" } : j));
  }

  async function deleteJob(id: string) {
    if (!token) return;
    await api.jobs.delete(token, id);
    setJobs(prev => prev.filter(j => j.id !== id));
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
        <h1 className="eyebrow">Refinery Jobs</h1>
        <button onClick={() => setPage("jobs")} className="btn btn-primary text-sm">+ Create Job</button>
      </div>

      {/* Stat tiles */}
      <div className="flex flex-wrap gap-4">
        {TILES.map(t => (
          <div key={t.id} className="panel p-4" style={{ width: 200 }}>
            {tileContent[t.id]}
          </div>
        ))}
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

      {/* History */}
      <div className="border-t border-edge/40 pt-6">
        <HistorySection jobs={jobs} loading={loading} onDelete={deleteJob} />
      </div>
    </div>
  );
}

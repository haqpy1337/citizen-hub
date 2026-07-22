import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { api, Job } from "../lib/api";
import { formatDuration } from "../lib/format";

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

export default function History() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateSort,  setDateSort]  = useState<DateSort>("newest");
  const [scuSort,   setScuSort]   = useState<ScuSort>("none");
  const [matFilter, setMatFilter] = useState("");

  async function load() {
    if (!token) return;
    const data = await api.jobs.list(token);
    setJobs(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function deleteJob(id: string) {
    if (!token) return;
    await api.jobs.delete(token, id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }

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
    <div className="flex flex-col gap-6">
      <h1 className="eyebrow">History</h1>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={toggleDate}
          className={[
            "px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-all",
            "border-quant text-quant bg-quant/10",
          ].join(" ")}
        >
          {dateSort === "newest" ? "Date ↓" : "Date ↑"}
        </button>
        <button
          onClick={toggleScu}
          className={[
            "px-3 py-1.5 text-xs font-mono uppercase tracking-wider border transition-all",
            scuSort !== "none"
              ? "border-quant text-quant bg-quant/10"
              : "border-edge text-muted hover:text-ink",
          ].join(" ")}
        >
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
                  <td className="px-4 py-3 text-muted text-xs">
                    {job.method ?? "—"}
                  </td>
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
                    <span className={[
                      "tag",
                      STATUS_CLASS[job.status] ?? "bg-hull text-muted",
                    ].join(" ")}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="btn btn-ghost btn-danger text-xs px-2 py-1"
                      title="Delete job"
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

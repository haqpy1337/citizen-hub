import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { api, Job } from "../lib/api";
import { formatDuration } from "../lib/format";

type Filter = "all" | "done" | "collected" | "cancelled";

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
  const [filter, setFilter] = useState<Filter>("all");

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

  const historical = jobs.filter(j => j.status !== "running");
  const filtered = filter === "all"
    ? historical
    : historical.filter(j => j.status === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "done",      label: "Done" },
    { key: "collected", label: "Collected" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="eyebrow">History</h1>

      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={[
              "px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-md border transition-all",
              filter === f.key
                ? "border-quant text-quant bg-quant/10"
                : "border-edge text-muted hover:text-ink",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
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
                <th className="label text-left px-4 py-3">Date</th>
                <th className="label text-left px-4 py-3">Station</th>
                <th className="label text-left px-4 py-3">Method</th>
                <th className="label text-left px-4 py-3">Materials</th>
                <th className="label text-left px-4 py-3">Duration</th>
                <th className="label text-left px-4 py-3">Status</th>
                <th className="label px-4 py-3" />
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

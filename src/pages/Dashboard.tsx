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
        <button
          onClick={onMarkDone}
          className="btn btn-primary text-xs px-3 py-1"
        >
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

      <div className="grid grid-cols-3 gap-4">
        <div className="panel p-4">
          <p className="label">Active Jobs</p>
          <p className="text-3xl font-bold text-quant mt-1">{activeJobs.length}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Next Finish</p>
          <p className="text-sm font-mono text-ink mt-1">
            {earliest
              ? formatDuration(secondsLeft(earliest.finishesAt, now))
              : "—"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="label">Total Jobs</p>
          <p className="text-3xl font-bold text-ink mt-1">{jobs.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : activeJobs.length === 0 ? (
        <div className="panel p-12 text-center flex flex-col items-center gap-3">
          <p className="text-muted text-sm">No active jobs</p>
          <button onClick={() => setPage("jobs")} className="btn btn-primary text-sm">
            Start a Job
          </button>
        </div>
      ) : (
        <div>
          <p className="eyebrow mb-3">Active Jobs</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeJobs.map(job => (
              <JobCard key={job.id} job={job} onMarkDone={() => markDone(job.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

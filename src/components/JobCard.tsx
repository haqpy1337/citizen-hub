"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import JobTimer from "./JobTimer";
import type { Job } from "@/lib/clientTypes";

interface Props {
  job: Job;
  onChange: () => void;
}

export default function JobCard({ job, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function patch(status: Job["status"], navigate?: string) {
    setBusy(true);
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (navigate) {
      router.push(navigate);
    } else {
      onChange();
    }
  }

  async function remove() {
    if (!confirm("Delete this job?")) return;
    setBusy(true);
    await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    setBusy(false);
    onChange();
  }


  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold tracking-tight">
            {job.stationName}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            {job.systemName && <span className="tag">{job.systemName}</span>}
            {job.method && <span className="tag">{job.method}</span>}
          </div>
        </div>
        <button
          onClick={remove}
          disabled={busy}
          className="text-muted transition hover:text-danger"
          aria-label="Delete job"
          title="Delete"
        >
          ✕
        </button>
      </div>

      <ul className="mt-4 space-y-1.5">
        {job.materials.map((m) => (
          <li
            key={m.id}
            className="flex items-baseline justify-between border-b border-edge/50 pb-1.5 text-sm"
          >
            <span className="text-ink">{m.name}</span>
            <span className="font-mono text-muted">
              {m.quantity} {m.unit}
              {m.yieldPercent != null && (
                <span className="ml-2 text-quant">{m.yieldPercent}%</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {job.note && <p className="mt-3 text-sm text-muted">{job.note}</p>}

      <div className="mt-4">
        <JobTimer
          startedAt={job.startedAt}
          finishesAt={job.finishesAt}
          durationSec={job.durationSec}
          status={job.status}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {job.status === "running" && (
          <button
            onClick={() => patch("collected", "/dashboard/history")}
            disabled={busy}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            ✓ Mark as collected
          </button>
        )}
        {job.status === "collected" && (
          <span className="tag border-toxic/40 text-toxic">✓ Collected</span>
        )}
        {job.status === "running" && (
          <button
            onClick={() => patch("cancelled")}
            disabled={busy}
            className="btn-danger px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}

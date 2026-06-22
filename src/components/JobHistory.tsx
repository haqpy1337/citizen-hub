"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/lib/clientTypes";
import { useT } from "@/components/LanguageProvider";

type StatusFilter = "all" | "collected" | "cancelled";
type SortKey = "finishesAt" | "stationName" | "durationSec";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function JobHistory() {
  const { t } = useT();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("finishesAt");
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    fetch("/api/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setError(t.history.failedToLoad));
  }, [t]);

  const past = useMemo(() => {
    return (jobs ?? []).filter(
      (j) => j.status === "collected" || j.status === "cancelled"
    );
  }, [jobs]);

  const rows = useMemo(() => {
    let r = past;
    if (statusFilter !== "all") r = r.filter((j) => j.status === statusFilter);
    if (q.trim()) {
      const n = q.toLowerCase();
      r = r.filter(
        (j) =>
          j.stationName.toLowerCase().includes(n) ||
          j.materials.some((m) => m.name.toLowerCase().includes(n))
      );
    }
    const dir = asc ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sortKey === "finishesAt")
        return (new Date(a.finishesAt).getTime() - new Date(b.finishesAt).getTime()) * dir;
      if (sortKey === "stationName") return a.stationName.localeCompare(b.stationName) * dir;
      return (a.durationSec - b.durationSec) * dir;
    });
  }, [past, statusFilter, q, sortKey, asc]);

  if (error) return <div className="panel p-6 text-sm text-danger">{error}</div>;
  if (jobs === null) return <div className="panel p-6 text-sm text-muted">{t.history.loading}</div>;

  const collected = rows.filter((j) => j.status === "collected").length;
  const cancelled = rows.filter((j) => j.status === "cancelled").length;

  return (
    <div>
      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="panel mb-5 grid grid-cols-3 divide-x divide-edge p-0 overflow-hidden">
          <Stat label={t.history.jobsShown} value={String(rows.length)} />
          <Stat label={t.history.collected} value={String(collected)} />
          <Stat label={t.history.cancelled} value={String(cancelled)} />
        </div>
      )}

      {/* Filters */}
      <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="label">{t.history.search}</label>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.history.searchPlaceholder}
          />
        </div>
        <div>
          <label className="label">{t.history.status}</label>
          <select className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">{t.history.all}</option>
            <option value="collected">{t.history.collected}</option>
            <option value="cancelled">{t.history.cancelled}</option>
          </select>
        </div>
        <div>
          <label className="label">{t.history.sort}</label>
          <select className="field" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="finishesAt">{t.history.dateNewest}</option>
            <option value="stationName">{t.history.station}</option>
            <option value="durationSec">{t.history.duration}</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="panel p-10 text-center text-muted">
          {t.history.noJobs}
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-3">
        {rows.map((job) => {
          const isCollected = job.status === "collected";
          return (
            <div key={job.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {job.stationName}
                    </h3>
                    {isCollected && (
                      <span className="tag border-toxic/40 text-toxic">{t.jobs.collected}</span>
                    )}
                    {job.status === "cancelled" && (
                      <span className="tag border-steel text-muted">{t.history.cancelled}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted">
                    {job.systemName && <span className="tag">{job.systemName}</span>}
                    {job.method && <span className="tag">{job.method}</span>}
                    <span className="font-mono">{formatDate(job.finishesAt)}</span>
                    <span className="font-mono">{t.history.durationPrefix}{formatDuration(job.durationSec)}</span>
                  </div>
                </div>

              </div>

              {/* Materials */}
              <div className="mt-4 grid gap-1">
                {job.materials.map((m) => {
                  const mod = m.yieldPercent;
                  const modStr = mod != null ? (mod >= 0 ? `+${mod}%` : `${mod}%`) : null;
                  return (
                    <div
                      key={m.id}
                      className="flex items-baseline gap-2 border-b border-edge/40 pb-1 last:border-0 text-sm"
                    >
                      <span className="text-ink">{m.name}</span>
                      <span className="font-mono text-xs text-muted">
                        {m.quantity} {m.unit}
                        {modStr && (
                          <> · <span className={mod! >= 0 ? "text-quant" : "text-danger"}>{modStr}</span></>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {job.note && <p className="mt-3 text-sm text-muted italic">{job.note}</p>}
            </div>
          );
        })}
      </div>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

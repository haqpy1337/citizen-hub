"use client";

import { useEffect, useMemo, useState } from "react";
import type { RefineryStation } from "@/lib/clientTypes";
import { getClientRefineryStations, isUexConfigured } from "@/lib/clientUex";

type SortKey = "name" | "queueSec" | "bestYield";

function formatQueueTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function RefineriesView() {
  const [stations, setStations] = useState<RefineryStation[] | null>(null);
  const configured = isUexConfigured();
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [system, setSystem] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  useEffect(() => {
    getClientRefineryStations()
      .then(setStations)
      .catch(() => setError("Failed to load live data."));
  }, []);

  const systems = useMemo(() => {
    const set = new Set<string>();
    (stations ?? []).forEach((s) => s.system && set.add(s.system));
    return [...set].sort();
  }, [stations]);

  const rows = useMemo(() => {
    let r = stations ?? [];
    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter(
        (s) =>
          s.name.toLowerCase().includes(needle) ||
          s.yields.some((y) => y.name.toLowerCase().includes(needle))
      );
    }
    if (system) r = r.filter((s) => s.system === system);

    const dir = asc ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      const av = (a[sortKey] as number | null) ?? -1;
      const bv = (b[sortKey] as number | null) ?? -1;
      return (av - bv) * dir;
    });
  }, [stations, q, system, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  }

  if (error) return <div className="panel p-6 text-sm text-danger">{error}</div>;
  if (stations === null)
    return <div className="panel p-6 text-sm text-muted">Loading live data…</div>;

  return (
    <div>
      {!configured && (
        <p className="mb-4 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
          No UEX API key set – only publicly available data is loaded. Add your key to{" "}
          <code>.env</code> (see README).
        </p>
      )}

      {/* Filter bar */}
      <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search (station or ore)</label>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Quantanium or ARC-L1"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="label">System</label>
          <select className="field" value={system} onChange={(e) => setSystem(e.target.value)}>
            <option value="">All</option>
            {systems.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="font-mono text-xs text-muted">{rows.length} refineries</div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-left">
              <Th label="Station" active={sortKey === "name"} asc={asc} onClick={() => toggleSort("name")} />
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">
                System
              </th>
              <Th label="Queue" active={sortKey === "queueSec"} asc={asc} onClick={() => toggleSort("queueSec")} align="right" />
              <Th label="Best Yield" active={sortKey === "bestYield"} asc={asc} onClick={() => toggleSort("bestYield")} align="right" />
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">
                Ores
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-edge/40 last:border-0 hover:bg-hull/50">
                <td className="px-4 py-3 font-display text-base font-semibold text-ink">{s.name}</td>
                <td className="px-4 py-3 text-muted">{s.system ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {s.queueSec != null ? (
                    <QueueDisplay sec={s.queueSec} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-quant">
                  {s.bestYield != null ? `${s.bestYield > 0 ? "+" : ""}${s.bestYield}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.yields.slice(0, 6).map((y) => (
                      <span key={`${s.id}-${y.name}`} className="tag">
                        {y.name}
                      </span>
                    ))}
                    {s.yields.length > 6 && (
                      <span className="tag border-transparent">+{s.yields.length - 6}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No refineries match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  active,
  asc,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={onClick}
        className={`font-mono text-[11px] uppercase tracking-widest transition ${
          active ? "text-quant" : "text-muted hover:text-ink"
        }`}
      >
        {label} {active ? (asc ? "▲" : "▼") : ""}
      </button>
    </th>
  );
}

function QueueDisplay({ sec }: { sec: number }) {
  const h = sec / 3600;
  const color = h >= 12 ? "text-danger" : h >= 4 ? "text-amber" : "text-toxic";
  return (
    <span className={`font-mono tabular-nums ${color}`}>{formatQueueTime(sec)}</span>
  );
}

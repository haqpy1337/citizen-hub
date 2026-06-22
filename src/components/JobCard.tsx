"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JobTimer from "./JobTimer";
import type { Job } from "@/lib/clientTypes";
import type { FullOre } from "@/app/api/ores/route";
import { useT } from "@/components/LanguageProvider";

interface Props {
  job: Job;
  groups?: { id: string; name: string }[];
  ores?: FullOre[];
  onChange: () => void;
}

function calcJobValue(job: Job, ores: FullOre[]): number | null {
  if (ores.length === 0) return null;
  const refinedPriceMap = new Map<number, number>();
  for (const o of ores) {
    if (o.isRefined && o.parentId && o.priceSell) {
      const ex = refinedPriceMap.get(o.parentId);
      if (!ex || o.priceSell > ex) refinedPriceMap.set(o.parentId, o.priceSell);
    }
  }
  let total = 0;
  let anyPrice = false;
  for (const mat of job.materials) {
    const yieldMod = mat.yieldPercent ?? 0;
    const refined = mat.quantity * (100 + yieldMod) / 100;
    let price: number | null = refinedPriceMap.get(mat.commodityId ?? -1) ?? null;
    if (price == null) {
      const needle = mat.name.toLowerCase().replace("(raw)", "(refined)").trim();
      price = ores.find((o) => o.name.toLowerCase() === needle)?.priceSell ?? null;
    }
    if (price != null) { total += refined * price; anyPrice = true; }
  }
  return anyPrice ? Math.round(total) : null;
}

export default function JobCard({ job, groups = [], ores = [], onChange }: Props) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [assigningGroup, setAssigningGroup] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function patch(body: Record<string, unknown>, navigate?: string) {
    setBusy(true);
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (navigate) router.push(navigate);
    else onChange();
  }

  async function assignGroup(groupId: string | null) {
    setAssigningGroup(true);
    setGroupPickerOpen(false);
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    setAssigningGroup(false);
    onChange();
  }

  async function remove() {
    if (!confirm(t.jobs.deleteConfirm)) return;
    setBusy(true);
    await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    setBusy(false);
    onChange();
  }


  const estimatedValue = calcJobValue(job, ores);

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
            {job.group && (
              <a href={`/dashboard/groups/${job.group.id}`} className="tag border-quant/40 text-quant hover:bg-quant/10 transition">
                ◉ {job.group.name}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {estimatedValue != null && (
            <div className="text-right">
              <div className="font-mono font-bold text-quant tabular-nums text-sm">
                ~{estimatedValue.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider">aUEC</div>
            </div>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="text-muted transition hover:text-danger"
            aria-label={t.jobs.delete}
            title={t.jobs.delete}
          >
            ✕
          </button>
        </div>
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
            onClick={() => patch({ status: "collected" }, "/dashboard/history")}
            disabled={busy}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            {t.jobs.markCollected}
          </button>
        )}
        {job.status === "collected" && (
          <span className="tag border-toxic/40 text-toxic">{t.jobs.collected}</span>
        )}
        {job.status === "running" && (
          <button
            onClick={() => patch({ status: "cancelled" })}
            disabled={busy}
            className="btn-danger px-3 py-1.5 text-xs"
          >
            {t.jobs.cancel}
          </button>
        )}

        {/* Group assignment */}
        {groups.length > 0 && (
          <div className="relative ml-auto" ref={pickerRef}>
            <button
              onClick={() => setGroupPickerOpen((v) => !v)}
              disabled={assigningGroup}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
              title={job.group ? "Change group" : "Assign to group"}
            >
              {assigningGroup ? (
                <span className="text-muted">…</span>
              ) : job.group ? (
                <>◉ <span className="text-quant">{job.group.name}</span></>
              ) : (
                <span className="text-muted">+ {t.jobForm.groupOptional.replace(" (optional)", "")}</span>
              )}
            </button>

            {groupPickerOpen && (
              <div className="absolute bottom-full right-0 mb-1 z-30 min-w-[180px] rounded-md border border-edge bg-panel shadow-lg overflow-hidden">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => assignGroup(g.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-hull transition flex items-center gap-2 ${job.group?.id === g.id ? "text-quant" : "text-ink"}`}
                  >
                    <span>◉</span> {g.name}
                    {job.group?.id === g.id && <span className="ml-auto text-quant text-xs">✓</span>}
                  </button>
                ))}
                {job.group && (
                  <button
                    onClick={() => assignGroup(null)}
                    className="w-full px-3 py-2 text-left text-xs text-muted hover:bg-hull border-t border-edge transition"
                  >
                    {t.jobForm.noGroup}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

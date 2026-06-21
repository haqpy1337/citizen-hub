import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ActiveJobsSidebar({ userId }: { userId: string }) {
  const jobs = await prisma.refineryJob.findMany({
    where: { userId, status: "running" },
    include: { materials: { select: { name: true } } },
    orderBy: { finishesAt: "asc" },
  });

  return (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-edge bg-void sticky top-0 h-screen overflow-y-auto">
      <div className="px-5 py-5 border-b border-edge">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink flex items-center gap-2">
            {jobs.length > 0 && (
              <span className="inline-block w-2 h-2 rounded-full bg-toxic animate-pulse shrink-0" />
            )}
            Currently Running
          </h2>
          <Link href="/dashboard/jobs" className="font-mono text-[10px] text-quant hover:underline uppercase tracking-wider">
            All jobs →
          </Link>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <span className="text-4xl opacity-20">⛏</span>
            <div>
              <p className="text-sm text-muted">No active jobs.</p>
              <p className="text-xs text-muted/60 mt-1">Drop off ore at a refinery to start one.</p>
            </div>
            <Link href="/dashboard/jobs/new" className="btn-ghost text-xs py-1.5 px-3">+ New Job</Link>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </aside>
  );
}

function JobCard({ job }: {
  job: {
    id: string;
    stationName: string;
    durationSec: number;
    finishesAt: Date;
    materials: { name: string }[];
  };
}) {
  const now = Date.now();
  const finishes = new Date(job.finishesAt).getTime();
  const leftSec = Math.max(0, Math.floor((finishes - now) / 1000));
  const pct = Math.min(100, ((job.durationSec - leftSec) / job.durationSec) * 100);
  const ready = leftSec === 0;

  const h = Math.floor(leftSec / 3600);
  const m = Math.floor((leftSec % 3600) / 60);
  const timeLeft = h > 0 ? `${h}h ${m}m` : `${m}m`;

  const finishTime = new Date(job.finishesAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="panel p-4 relative overflow-hidden"
      style={ready ? { borderColor: "rgba(90,170,48,0.45)" } : undefined}
    >
      {ready && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(90,170,48,0.08) 0%, transparent 65%)" }} />
      )}

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-bold text-ink text-base leading-snug truncate">{job.stationName}</p>
            <p className="text-xs text-muted mt-0.5 truncate">{job.materials.map((m) => m.name).join(", ")}</p>
          </div>
          <span className={`font-mono font-bold text-sm tabular-nums shrink-0 ${ready ? "text-toxic" : "text-quant"}`}>
            {ready ? "✓" : timeLeft}
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-hull border border-edge">
            <div
              className={`h-full rounded-full ${ready ? "bg-toxic" : "bg-quant"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-muted">{Math.round(pct)}% complete</span>
            {ready
              ? <span className="font-mono text-[10px] text-toxic">bereit zum Abholen</span>
              : <span className="font-mono text-[10px] text-muted">fertig {finishTime}</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TILES = [
  {
    href: "/dashboard/jobs",
    title: "My Jobs",
    sub: "Manage your refinery orders",
    icon: "⛏",
    colorVar: "var(--color-quant)",
    dimVar: "var(--color-quant-dim)",
  },
  {
    href: "/dashboard/history",
    title: "Job History",
    sub: "Past runs with profit estimates",
    icon: "▤",
    colorVar: "var(--color-amber)",
    dimVar: "rgba(224,120,0,0.12)",
  },
  {
    href: "/dashboard/ores",
    title: "Ore Prices",
    sub: "Live prices for all ores",
    icon: "◇",
    colorVar: "var(--color-toxic)",
    dimVar: "rgba(90,170,48,0.12)",
  },
  {
    href: "/dashboard/trade",
    title: "Trade Routes",
    sub: "Best buy → sell routes by profit/SCU",
    icon: "⇄",
    colorVar: "var(--color-quant)",
    dimVar: "var(--color-quant-dim)",
  },
  {
    href: "/dashboard/refineries",
    title: "Refineries",
    sub: "Live overview of all stations",
    icon: "◈",
    colorVar: "var(--color-amber)",
    dimVar: "rgba(224,120,0,0.12)",
  },
  {
    href: "/dashboard/org",
    title: "Org",
    sub: "Shared jobs, groups & earnings",
    icon: "◉",
    colorVar: "var(--color-toxic)",
    dimVar: "rgba(90,170,48,0.12)",
  },
];

export default async function DashboardOverview() {
  const session = await getSession();

  const [activeJobs, totalJobs] = await Promise.all([
    prisma.refineryJob.count({ where: { userId: session!.userId, status: "running" } }),
    prisma.refineryJob.count({ where: { userId: session!.userId } }),
  ]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="eyebrow">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
          Welcome back, <span className="text-quant">{session?.username}</span>.
        </h1>
        <p className="mt-2 text-muted">
          {activeJobs > 0
            ? `You have ${activeJobs} refinery job${activeJobs !== 1 ? "s" : ""} currently running.`
            : "No active jobs. Start a new one when you drop off ore at a refinery."}
        </p>
      </div>

      {/* Active jobs — prominent at the top */}
      {activeJobs > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-toxic animate-pulse" />
              Currently Running
            </h2>
            <Link href="/dashboard/jobs" className="font-mono text-xs text-quant hover:underline">
              View all →
            </Link>
          </div>
          <ActiveJobsPreview userId={session!.userId} />
        </section>
      )}

      {/* Navigation tiles */}
      <section>
        <p className="eyebrow mb-4">Navigation</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="panel group relative flex flex-col gap-5 p-6 overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
              style={{
                // @ts-expect-error css var
                "--tile-color": t.colorVar,
                "--tile-dim": t.dimVar,
              }}
            >
              {/* Subtle colored top accent */}
              <div
                className="absolute inset-x-0 top-0 h-0.5 transition-all duration-300 group-hover:h-1"
                style={{ background: t.colorVar }}
              />
              {/* Glow bg on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top left, ${t.dimVar} 0%, transparent 60%)` }}
              />

              <div className="relative flex items-center justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-transform duration-200 group-hover:scale-110"
                  style={{ background: t.dimVar, color: t.colorVar }}
                >
                  {t.icon}
                </div>
              </div>

              <div className="relative">
                <div
                  className="font-display text-xl font-semibold text-ink transition-colors duration-200 group-hover:text-[var(--tile-color)]"
                >
                  {t.title}
                </div>
                <div className="mt-1 text-sm text-muted">{t.sub}</div>
              </div>
            </Link>
          ))}

          {/* New Job CTA */}
          <Link
            href="/dashboard/jobs/new"
            className="panel group relative flex flex-col items-center justify-center gap-3 p-6 text-center overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 border-dashed"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, var(--color-quant-dim) 0%, transparent 70%)" }}
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-edge group-hover:border-quant transition-colors duration-200">
              <span className="text-2xl text-muted group-hover:text-quant transition-colors duration-200">+</span>
            </div>
            <div className="relative">
              <div className="font-display text-lg font-semibold text-muted group-hover:text-ink transition-colors duration-200">
                New Job
              </div>
              <div className="text-xs text-muted mt-0.5">Log a new refinery drop-off</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

async function ActiveJobsPreview({ userId }: { userId: string }) {
  const jobs = await prisma.refineryJob.findMany({
    where: { userId, status: "running" },
    include: { materials: true },
    orderBy: { finishesAt: "asc" },
    take: 4,
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {jobs.map((job) => {
        const now = Date.now();
        const finishes = new Date(job.finishesAt).getTime();
        const leftSec = Math.max(0, Math.floor((finishes - now) / 1000));
        const pct = Math.min(100, ((job.durationSec - leftSec) / job.durationSec) * 100);
        const ready = leftSec === 0;

        const h = Math.floor(leftSec / 3600);
        const m = Math.floor((leftSec % 3600) / 60);
        const s = leftSec % 60;
        const timeLeft = leftSec < 60 ? `${s}s` : h > 0 ? `${h}h ${m}m` : `${m}m`;

        return (
          <div
            key={job.id}
            className="panel p-4 relative overflow-hidden"
            style={ready ? { borderColor: "rgba(90,170,48,0.4)" } : undefined}
          >
            {ready && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top right, rgba(90,170,48,0.07) 0%, transparent 60%)" }}
              />
            )}
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display font-semibold text-ink truncate">{job.stationName}</div>
                <div className="mt-0.5 text-xs text-muted truncate">
                  {job.materials.map((m) => m.name).join(", ")}
                </div>
              </div>
              <span className={`font-mono text-sm tabular-nums shrink-0 ${ready ? "text-toxic" : "text-quant"}`}>
                {ready ? "✓ Ready" : timeLeft}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-edge bg-hull">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ${ready ? "bg-toxic" : "bg-quant"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-[10px] text-muted font-mono">{Math.round(pct)}% complete</span>
              {!ready && (
                <span className="text-[10px] text-muted font-mono">
                  {new Date(job.finishesAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

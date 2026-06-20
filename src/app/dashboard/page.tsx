import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardOverview() {
  const session = await getSession();

  const [activeJobs, totalJobs] = await Promise.all([
    prisma.refineryJob.count({
      where: { userId: session!.userId, status: "running" },
    }),
    prisma.refineryJob.count({ where: { userId: session!.userId } }),
  ]);

  const tiles = [
    {
      href: "/dashboard/jobs",
      title: "My Jobs",
      sub: "Manage your refinery orders",
      stat: activeJobs > 0 ? `${activeJobs} running` : totalJobs === 0 ? "No jobs yet" : "All done",
      accent: activeJobs > 0 ? "text-quant" : "text-muted",
      icon: "⛏",
    },
    {
      href: "/dashboard/history",
      title: "Job History",
      sub: "Past runs with profit estimates",
      stat: `${totalJobs - activeJobs} completed`,
      accent: "text-muted",
      icon: "▤",
    },
    {
      href: "/dashboard/ores",
      title: "Ore Prices",
      sub: "Live prices for all ores",
      stat: "Live data",
      accent: "text-toxic",
      icon: "◇",
    },
    {
      href: "/dashboard/trade",
      title: "Trade Routes",
      sub: "Best buy → sell routes by profit/SCU",
      stat: "Live data",
      accent: "text-toxic",
      icon: "⇄",
    },
    {
      href: "/dashboard/refineries",
      title: "Refineries",
      sub: "Live overview of all stations",
      stat: "Live data",
      accent: "text-toxic",
      icon: "◈",
    },
  ];

  return (
    <div>
      <p className="eyebrow">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        Welcome back, <span className="text-quant">{session?.username}</span>.
      </h1>
      <p className="mt-2 text-muted">
        {activeJobs > 0
          ? `You have ${activeJobs} refinery job${activeJobs !== 1 ? "s" : ""} currently running.`
          : "No active jobs. Start a new one when you drop off ore at a refinery."}
      </p>

      {/* Tiles */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="panel group flex flex-col gap-4 p-6 transition hover:border-quant/40"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{t.icon}</span>
              <span className={`font-mono text-xs uppercase tracking-widest ${t.accent}`}>
                {t.stat}
              </span>
            </div>
            <div>
              <div className="font-display text-xl font-semibold text-ink group-hover:text-quant transition">
                {t.title}
              </div>
              <div className="mt-1 text-sm text-muted">{t.sub}</div>
            </div>
          </Link>
        ))}

        {/* Quick-action tile */}
        <Link
          href="/dashboard/jobs/new"
          className="panel group flex flex-col items-center justify-center gap-3 border-dashed p-6 text-center transition hover:border-quant/40"
        >
          <span className="text-3xl text-muted group-hover:text-quant transition">+</span>
          <div className="font-display text-lg font-semibold text-muted group-hover:text-ink transition">
            New Job
          </div>
          <div className="text-xs text-muted">Log a new refinery drop-off</div>
        </Link>
      </div>

      {/* Active jobs preview */}
      {activeJobs > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Currently Running</h2>
            <Link href="/dashboard/jobs" className="font-mono text-xs text-quant hover:underline">
              View all →
            </Link>
          </div>
          <ActiveJobsPreview userId={session!.userId} />
        </div>
      )}
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
        const timeLeft = leftSec < 60
          ? `${s}s`
          : h > 0
            ? `${h}h ${m}m`
            : `${m}m`;

        return (
          <div key={job.id} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display font-semibold text-ink">{job.stationName}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {job.materials.map((m) => m.name).join(", ")}
                </div>
              </div>
              <span className={`font-mono text-sm tabular-nums ${ready ? "text-toxic" : "text-ink"}`}>
                {ready ? "Ready!" : timeLeft}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-edge bg-hull">
              <div
                className={`h-full transition-[width] ${ready ? "bg-toxic" : "bg-quant"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardOverview() {
  const session = await getSession();

  const activeJobs = await prisma.refineryJob.findMany({
    where: { userId: session!.userId, status: "running" },
    include: { materials: { select: { name: true } } },
    orderBy: { finishesAt: "asc" },
    take: 6,
  });

  return (
    <DashboardClient
      username={session!.username}
      activeJobs={activeJobs.map((j) => ({
        id: j.id,
        stationName: j.stationName,
        durationSec: j.durationSec,
        finishesAt: j.finishesAt.toISOString(),
        materials: j.materials,
      }))}
    />
  );
}

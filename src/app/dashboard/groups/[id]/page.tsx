import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import GroupDetailClient from "./GroupDetailClient";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session!.userId } },
  });
  if (!membership) redirect("/dashboard/groups");

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, username: true } },
      members: {
        include: { user: { select: { id: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!group) notFound();

  const memberIds = group.members.map((m) => m.userId);
  const jobs = await prisma.refineryJob.findMany({
    where: { userId: { in: memberIds } },
    include: {
      materials: { select: { name: true, quantity: true, commodityId: true, yieldPercent: true, unit: true } },
      user: { select: { id: true, username: true } },
      earningsSplits: true,
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <GroupDetailClient
      group={{
        ...group,
        myRole: membership.role,
        members: group.members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
        createdAt: group.createdAt.toISOString(),
      }}
      initialJobs={jobs.map((j) => ({
        ...j,
        startedAt: j.startedAt.toISOString(),
        finishesAt: j.finishesAt.toISOString(),
        createdAt: j.createdAt.toISOString(),
      }))}
      currentUserId={session!.userId}
    />
  );
}

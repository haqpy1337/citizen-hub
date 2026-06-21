import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const memberIds = await prisma.groupMembership
    .findMany({ where: { groupId: params.id }, select: { userId: true } })
    .then((ms) => ms.map((m) => m.userId));

  const jobs = await prisma.refineryJob.findMany({
    where: { userId: { in: memberIds } },
    include: {
      materials: true,
      user: { select: { id: true, username: true } },
      earningsSplits: { include: { job: { select: { userId: true } } } },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}

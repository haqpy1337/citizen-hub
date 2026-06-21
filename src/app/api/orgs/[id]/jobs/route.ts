import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  const memberIds = await prisma.orgMembership
    .findMany({ where: { orgId: params.id }, select: { userId: true } })
    .then((ms: { userId: string }[]) => ms.map((m) => m.userId));

  const jobs = await prisma.refineryJob.findMany({
    where: {
      userId: { in: memberIds },
      ...(groupId ? { groupId } : {}),
    },
    include: {
      materials: true,
      user: { select: { id: true, username: true } },
      earningsSplits: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}

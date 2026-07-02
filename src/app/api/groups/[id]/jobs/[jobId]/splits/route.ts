import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  splits: z.array(z.object({
    userId: z.string(),
    sharePercent: z.number().min(0).max(100),
  })),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string; jobId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const memberIds = await prisma.groupMembership
    .findMany({ where: { groupId: params.id }, select: { userId: true } })
    .then((ms) => ms.map((m) => m.userId));

  const job = await prisma.refineryJob.findFirst({
    where: { id: params.jobId, groupId: params.id },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const total = body.data.splits.reduce((s, x) => s + x.sharePercent, 0);
  if (Math.round(total) !== 100)
    return NextResponse.json({ error: "Splits müssen 100% ergeben" }, { status: 400 });

  // Validate that all userIds in the splits belong to actual group members
  const memberUserIds = new Set(
    await prisma.groupMembership
      .findMany({ where: { groupId: params.id }, select: { userId: true } })
      .then((ms) => ms.map((m) => m.userId))
  );

  const validSplits = body.data.splits.filter((s) => s.sharePercent > 0 && memberUserIds.has(s.userId));

  await prisma.$transaction([
    prisma.earningsSplit.deleteMany({ where: { jobId: params.jobId } }),
    ...validSplits.map((s) =>
      prisma.earningsSplit.create({
        data: { jobId: params.jobId, userId: s.userId, sharePercent: s.sharePercent },
      })
    ),
  ]);

  // Return splits enriched with username for display
  const splits = await prisma.earningsSplit.findMany({ where: { jobId: params.jobId } });
  const users = await prisma.user.findMany({
    where: { id: { in: splits.map((s) => s.userId) } },
    select: { id: true, username: true },
  });
  const usernameMap = new Map(users.map((u) => [u.id, u.username]));
  return NextResponse.json(splits.map((s) => ({ ...s, username: usernameMap.get(s.userId) ?? s.userId })));
}

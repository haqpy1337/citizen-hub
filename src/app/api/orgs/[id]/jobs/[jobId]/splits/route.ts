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

// Set/replace all splits for a job
export async function POST(
  req: Request,
  { params }: { params: { id: string; jobId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Verify job belongs to org
  const orgMemberIds = await prisma.orgMembership
    .findMany({ where: { orgId: params.id }, select: { userId: true } })
    .then((ms: { userId: string }[]) => ms.map((m) => m.userId));

  const job = await prisma.refineryJob.findFirst({
    where: { id: params.jobId, userId: { in: orgMemberIds } },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const total = body.data.splits.reduce((s, x) => s + x.sharePercent, 0);
  if (Math.round(total) !== 100)
    return NextResponse.json({ error: "Splits müssen 100% ergeben" }, { status: 400 });

  // Upsert all splits
  await prisma.$transaction([
    prisma.earningsSplit.deleteMany({ where: { jobId: params.jobId } }),
    ...body.data.splits
      .filter((s) => s.sharePercent > 0)
      .map((s) =>
        prisma.earningsSplit.create({
          data: { jobId: params.jobId, userId: s.userId, sharePercent: s.sharePercent },
        })
      ),
  ]);

  const splits = await prisma.earningsSplit.findMany({
    where: { jobId: params.jobId },
    include: { job: { select: { userId: true } } },
  });
  return NextResponse.json(splits);
}

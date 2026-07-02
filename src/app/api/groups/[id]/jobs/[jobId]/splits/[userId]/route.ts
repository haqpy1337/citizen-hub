import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string; jobId: string; userId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session.userId } },
  });
  if (!membership || membership.role !== "creator")
    return NextResponse.json({ error: "Only the creator can mark splits as paid" }, { status: 403 });

  const split = await prisma.earningsSplit.findUnique({
    where: { jobId_userId: { jobId: params.jobId, userId: params.userId } },
  });
  if (!split) return NextResponse.json({ error: "Split not found" }, { status: 404 });

  const updated = await prisma.earningsSplit.update({
    where: { jobId_userId: { jobId: params.jobId, userId: params.userId } },
    data: { paidOut: !split.paidOut },
  });

  return NextResponse.json(updated);
}

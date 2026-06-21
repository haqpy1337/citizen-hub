import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const myMembership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session.userId } },
  });
  if (!myMembership || myMembership.role !== "creator")
    return NextResponse.json({ error: "Only the creator can remove members" }, { status: 403 });

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (group?.creatorId === params.userId)
    return NextResponse.json({ error: "Cannot remove the group creator" }, { status: 400 });

  await prisma.groupMembership.delete({
    where: { groupId_userId: { groupId: params.id, userId: params.userId } },
  });

  return NextResponse.json({ ok: true });
}

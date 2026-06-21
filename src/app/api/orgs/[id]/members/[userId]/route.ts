import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });

  const isSelf = params.userId === session.userId;
  const isOwnerOrAdmin = me && ["owner", "admin"].includes(me.role);

  if (!isSelf && !isOwnerOrAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: params.userId } },
  });
  if (target?.role === "owner")
    return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });

  await prisma.orgMembership.delete({
    where: { orgId_userId: { orgId: params.id, userId: params.userId } },
  });

  return NextResponse.json({ ok: true });
}

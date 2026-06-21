import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const org = await prisma.org.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { id: true, username: true } } }, orderBy: { joinedAt: "asc" } },
      groups: { include: { _count: { select: { members: true, jobs: true } } } },
    },
  });

  return NextResponse.json({ ...org, myRole: membership.role });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.org.findUnique({ where: { id: params.id } });
  if (!org || org.ownerId !== session.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.org.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

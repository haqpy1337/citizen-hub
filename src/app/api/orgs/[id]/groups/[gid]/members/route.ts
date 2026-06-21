import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addSchema = z.object({ userId: z.string() });

export async function POST(
  req: Request,
  { params }: { params: { id: string; gid: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!me)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = addSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const isMember = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: body.data.userId } },
  });
  if (!isMember) return NextResponse.json({ error: "User not in org" }, { status: 400 });

  const gm = await prisma.groupMembership.upsert({
    where: { groupId_userId: { groupId: params.gid, userId: body.data.userId } },
    create: { groupId: params.gid, userId: body.data.userId },
    update: {},
  });

  return NextResponse.json(gm, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; gid: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json();

  const me = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  const isSelf = userId === session.userId;
  if (!isSelf && (!me || !["owner", "admin"].includes(me.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.groupMembership.delete({
    where: { groupId_userId: { groupId: params.gid, userId } },
  });

  return NextResponse.json({ ok: true });
}

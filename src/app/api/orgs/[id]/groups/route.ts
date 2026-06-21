import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1).max(40) });

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const groups = await prisma.group.findMany({
    where: { orgId: params.id },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { jobs: true } },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership || !["owner", "admin"].includes(membership.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const group = await prisma.group.create({
    data: { orgId: params.id, name: body.data.name },
    include: { _count: { select: { jobs: true } }, members: true },
  });

  return NextResponse.json(group, { status: 201 });
}

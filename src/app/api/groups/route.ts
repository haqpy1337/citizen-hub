import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(1).max(64) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.groupMembership.findMany({
    where: { userId: session.userId },
    include: {
      group: {
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { group: { createdAt: "desc" } },
  });

  return NextResponse.json(memberships.map((m) => ({ ...m.group, role: m.role })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name: body.data.name,
      creatorId: session.userId,
      members: { create: { userId: session.userId, role: "creator" } },
    },
    include: {
      creator: { select: { id: true, username: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ ...group, role: "creator" }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({ name: z.string().min(2).max(40) });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.orgMembership.findMany({
    where: { userId: session.userId },
    include: { org: { include: { _count: { select: { members: true, groups: true } } } } },
  });

  return NextResponse.json(memberships.map((m: typeof memberships[number]) => ({ ...m.org, role: m.role })));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const existing = await prisma.orgMembership.findFirst({ where: { userId: session.userId } });
  if (existing) return NextResponse.json({ error: "Already in an org" }, { status: 400 });

  const org = await prisma.org.create({
    data: {
      name: body.data.name,
      ownerId: session.userId,
      members: { create: { userId: session.userId, role: "owner" } },
    },
    include: { _count: { select: { members: true, groups: true } } },
  });

  return NextResponse.json({ ...org, role: "owner" }, { status: 201 });
}

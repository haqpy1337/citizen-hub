import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addSchema = z.object({ userId: z.string() });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session.userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const members = await prisma.groupMembership.findMany({
    where: { groupId: params.id },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const myMembership = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: session.userId } },
  });
  if (!myMembership || myMembership.role !== "creator")
    return NextResponse.json({ error: "Only the creator can add members" }, { status: 403 });

  const body = addSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: body.data.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: params.id, userId: body.data.userId } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const membership = await prisma.groupMembership.create({
    data: { groupId: params.id, userId: body.data.userId, role: "member" },
    include: { user: { select: { id: true, username: true } } },
  });

  return NextResponse.json(membership, { status: 201 });
}

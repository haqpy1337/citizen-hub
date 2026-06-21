import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ token: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const invite = await prisma.orgInvite.findUnique({ where: { token: body.data.token } });
  if (!invite || invite.usedBy || invite.expiresAt < new Date())
    return NextResponse.json({ error: "Invite invalid or expired" }, { status: 400 });

  const alreadyMember = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId: session.userId } },
  });
  if (alreadyMember)
    return NextResponse.json({ error: "Already a member" }, { status: 400 });

  await prisma.$transaction([
    prisma.orgMembership.create({
      data: { orgId: invite.orgId, userId: session.userId, role: "member" },
    }),
    prisma.orgInvite.update({
      where: { id: invite.id },
      data: { usedBy: session.userId },
    }),
  ]);

  return NextResponse.json({ orgId: invite.orgId });
}

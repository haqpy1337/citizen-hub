import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership || !["owner", "admin"].includes(membership.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invite = await prisma.orgInvite.create({
    data: { orgId: params.id, expiresAt },
  });

  return NextResponse.json({ token: invite.token, expiresAt: invite.expiresAt });
}

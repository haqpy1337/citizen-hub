import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.$queryRaw<{ id: string; username: string }[]>`
    SELECT id, username FROM "User"
    WHERE LOWER(username) LIKE LOWER(${"%" + q + "%"})
    AND id != ${session.userId}
    LIMIT 10
  `;

  return NextResponse.json(users);
}

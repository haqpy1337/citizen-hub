import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // fallback: try raw query first, then findMany
  try {
    const pattern = `%${q}%`;
    const users = await prisma.$queryRawUnsafe<{ id: string; username: string }[]>(
      `SELECT id, username FROM "User" WHERE LOWER(username) LIKE LOWER(?) AND id != ? LIMIT 10`,
      pattern,
      session.userId
    );
    if (Array.isArray(users)) return NextResponse.json(users);
  } catch (e) {
    console.error("[search] raw query failed, falling back to findMany", e);
  }

  // fallback to Prisma ORM
  try {
    const users = await prisma.user.findMany({
      where: { username: { contains: q }, NOT: { id: session.userId } },
      select: { id: true, username: true },
      take: 10,
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error("[search] findMany failed", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

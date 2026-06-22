import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  // Prevent path traversal
  const safe = params.userId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) return new NextResponse("Not found", { status: 404 });

  const filePath = path.join(process.cwd(), "public", "avatars", `${safe}.jpg`);
  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

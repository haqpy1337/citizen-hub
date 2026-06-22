import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max 5 MB)" }, { status: 400 });
  }

  const sharpLib = (await import("sharp")).default;
  const input = Buffer.from(arrayBuffer);
  const output = await sharpLib(input)
    .resize(128, 128, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const filename = `${session.userId}.jpg`;
  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  await mkdir(avatarsDir, { recursive: true });
  const dest = path.join(avatarsDir, filename);
  await writeFile(dest, output);

  const avatarUrl = `/api/avatars/${session.userId}`;
  await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl });
}

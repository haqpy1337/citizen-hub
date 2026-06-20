import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { jobUpdateSchema } from "@/lib/validation";

// Hilfsfunktion: stellt sicher, dass der Auftrag dem Nutzer gehoert.
async function ownsJob(userId: string, jobId: string): Promise<boolean> {
  const job = await prisma.refineryJob.findUnique({
    where: { id: jobId },
    select: { userId: true },
  });
  return job?.userId === userId;
}

// PATCH /api/jobs/[id]  -> Status oder Notiz aendern (z.B. "abgeholt")
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!(await ownsJob(session.userId, params.id))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = jobUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." },
      { status: 400 }
    );
  }

  const job = await prisma.refineryJob.update({
    where: { id: params.id },
    data: parsed.data,
    include: { materials: true },
  });
  return NextResponse.json({ job });
}

// DELETE /api/jobs/[id]  -> Auftrag entfernen
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!(await ownsJob(session.userId, params.id))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await prisma.refineryJob.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

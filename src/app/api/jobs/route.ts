import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { jobCreateSchema } from "@/lib/validation";

// GET /api/jobs  -> alle Auftraege des angemeldeten Nutzers
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const jobs = await prisma.refineryJob.findMany({
    where: { userId: session.userId },
    include: { materials: true },
    orderBy: { finishesAt: "asc" },
  });
  return NextResponse.json({ jobs });
}

// POST /api/jobs  -> neuen Auftrag anlegen
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = jobCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const startedAt = new Date();
  const finishesAt = new Date(startedAt.getTime() + d.durationSec * 1000);

  const job = await prisma.refineryJob.create({
    data: {
      userId: session.userId,
      stationId: d.stationId,
      stationName: d.stationName,
      systemName: d.systemName,
      method: d.method,
      startedAt,
      durationSec: d.durationSec,
      finishesAt,
      note: d.note,
      status: "running",
      materials: {
        create: d.materials.map((m) => ({
          commodityId: m.commodityId,
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          yieldPercent: m.yieldPercent,
        })),
      },
    },
    include: { materials: true },
  });

  return NextResponse.json({ job }, { status: 201 });
}

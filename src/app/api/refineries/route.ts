import { NextResponse } from "next/server";
import { getRefineryStations, getRefineryMethods } from "@/lib/uex/endpoints";
import { isUexConfigured } from "@/lib/uex/client";

// GET /api/refineries -> Live-Raffineriedaten (Stationen + Methoden)
export async function GET() {
  const [stations, methods] = await Promise.all([
    getRefineryStations(),
    getRefineryMethods(),
  ]);
  return NextResponse.json({
    configured: isUexConfigured(),
    stations,
    methods,
  });
}

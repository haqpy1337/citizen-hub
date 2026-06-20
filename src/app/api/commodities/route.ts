import { NextResponse } from "next/server";
import { getOreCommodities } from "@/lib/uex/endpoints";

// GET /api/commodities -> alle (Roh-)Erze fuer die Auswahl im Job-Formular
export async function GET() {
  const ores = await getOreCommodities();
  return NextResponse.json({ ores });
}

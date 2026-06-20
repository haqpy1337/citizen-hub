import { NextResponse } from "next/server";
import { uexFetch } from "@/lib/uex/client";

export interface SellLocation {
  terminalId: number;
  terminalName: string;
  system: string;
  planet: string | null;
  city: string | null;
  priceSell: number;
  priceSellMin: number;
  priceSellMax: number;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const raw = await uexFetch<any>("commodities_prices", {
    query: { id_commodity: id },
    ttlMs: 3 * 60 * 1000,
  });

  const locations: SellLocation[] = raw
    .filter((r: any) => r.price_sell > 0)
    .map((r: any) => ({
      terminalId: r.id_terminal,
      terminalName: r.terminal_name ?? `Terminal ${r.id_terminal}`,
      system: r.star_system_name ?? "—",
      planet: r.planet_name ?? null,
      city: r.city_name ?? null,
      priceSell: r.price_sell,
      priceSellMin: r.price_sell_min,
      priceSellMax: r.price_sell_max,
    }))
    .sort((a: SellLocation, b: SellLocation) => b.priceSell - a.priceSell);

  return NextResponse.json({ locations });
}

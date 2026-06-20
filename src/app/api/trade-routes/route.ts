import { NextResponse } from "next/server";
import { uexFetch } from "@/lib/uex/client";

export interface TradeRoute {
  commodityId: number;
  commodityName: string;
  commodityCode: string;
  buyTerminalId: number;
  buyTerminal: string;
  buySystem: string;
  buyLocation: string;
  buyPrice: number;
  buyStockScu: number;        // SCU available to buy
  sellTerminalId: number;
  sellTerminal: string;
  sellSystem: string;
  sellLocation: string;
  sellPrice: number;
  sellStockScu: number;       // SCU capacity at sell terminal
  profitPerScu: number;
  profitMarginPct: number;
  isSameSystem: boolean;
}

interface RawEntry {
  id_commodity: number;
  id_terminal: number;
  commodity_name: string;
  commodity_code: string;
  terminal_name: string;
  star_system_name: string;
  planet_name: string | null;
  moon_name: string | null;
  city_name: string | null;
  space_station_name: string | null;
  price_buy: number;
  price_sell: number;
  scu_buy: number | null;
  scu_sell_stock: number | null;
}

function locationLabel(r: RawEntry): string {
  return (
    r.space_station_name ||
    r.moon_name ||
    r.planet_name ||
    r.city_name ||
    "—"
  );
}

export async function GET() {
  const all = await uexFetch<RawEntry>("commodities_prices_all", {
    ttlMs: 5 * 60 * 1000,
  });

  const byComm = new Map<number, RawEntry[]>();
  for (const e of all) {
    if (!e.id_commodity || !e.commodity_name) continue;
    if (!byComm.has(e.id_commodity)) byComm.set(e.id_commodity, []);
    byComm.get(e.id_commodity)!.push(e);
  }

  const routes: TradeRoute[] = [];

  for (const [, entries] of byComm) {
    // Only terminals that actually have stock to buy
    const buyers = entries.filter((e) => e.price_buy > 0 && (e.scu_buy ?? 0) > 0);
    const sellers = entries.filter((e) => e.price_sell > 0);
    if (buyers.length === 0 || sellers.length === 0) continue;

    // Best buy = lowest price among terminals with stock
    const bestBuy = buyers.reduce((a, b) => (a.price_buy < b.price_buy ? a : b));
    // Best sell = highest price
    const bestSell = sellers.reduce((a, b) => (a.price_sell > b.price_sell ? a : b));

    if (bestBuy.id_terminal === bestSell.id_terminal) continue;

    const profit = bestSell.price_sell - bestBuy.price_buy;
    if (profit <= 0) continue;

    const first = entries[0];
    routes.push({
      commodityId: first.id_commodity,
      commodityName: first.commodity_name,
      commodityCode: first.commodity_code ?? "",
      buyTerminalId: bestBuy.id_terminal,
      buyTerminal: bestBuy.terminal_name,
      buySystem: bestBuy.star_system_name ?? "—",
      buyLocation: locationLabel(bestBuy),
      buyPrice: bestBuy.price_buy,
      buyStockScu: bestBuy.scu_buy ?? 0,
      sellTerminalId: bestSell.id_terminal,
      sellTerminal: bestSell.terminal_name,
      sellSystem: bestSell.star_system_name ?? "—",
      sellLocation: locationLabel(bestSell),
      sellPrice: bestSell.price_sell,
      sellStockScu: bestSell.scu_sell_stock ?? 0,
      profitPerScu: profit,
      profitMarginPct: Math.round((profit / bestBuy.price_buy) * 100),
      isSameSystem: bestBuy.star_system_name === bestSell.star_system_name,
    });
  }

  routes.sort((a, b) => b.profitPerScu - a.profitPerScu);

  return NextResponse.json({ routes, updatedAt: new Date().toISOString() });
}

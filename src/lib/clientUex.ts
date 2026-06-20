// Browser-side UEX fetching — bypasses Cloudflare server-side IP blocking
import type { RefineryStation, RefineryMethod, OreCommodity } from "./uex/types";
import type { FullOre } from "@/app/api/ores/route";
import type { SellLocation } from "@/app/api/ore-prices/[id]/route";
import type { TradeRoute } from "@/app/api/trade-routes/route";

const BASE = "https://api.uexcorp.space/2.0";
const TOKEN = process.env.NEXT_PUBLIC_UEX_API_TOKEN ?? "";

export function isUexConfigured(): boolean {
  return Boolean(TOKEN);
}

async function uexGet<T>(endpoint: string, query: Record<string, string | number> = {}): Promise<T[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  if (TOKEN) params.set("secret_key", TOKEN);
  try {
    const res = await fetch(`${BASE}/${endpoint}?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function getClientRefineryStations(): Promise<RefineryStation[]> {
  const [terminals, capacities, yields_] = await Promise.all([
    uexGet<any>("terminals", { type: "refinery" }),
    uexGet<any>("refineries_capacities"),
    uexGet<any>("refineries_yields"),
  ]);

  const queueByTerminal = new Map<number, number>();
  for (const c of capacities) {
    if (c.id_terminal != null && c.value != null) queueByTerminal.set(c.id_terminal, c.value);
  }

  const yieldByTerminal = new Map<number, { commodityId: number | null; name: string; yieldPercent: number | null }[]>();
  for (const y of yields_) {
    if (y.id_terminal == null) continue;
    const list = yieldByTerminal.get(y.id_terminal) ?? [];
    list.push({ commodityId: y.id_commodity ?? null, name: y.commodity_name ?? "Unknown", yieldPercent: y.value ?? null });
    yieldByTerminal.set(y.id_terminal, list);
  }

  const source = terminals.length > 0
    ? terminals.map((t: any) => ({ id: t.id, name: t.name ?? t.nickname ?? `Terminal ${t.id}`, system: t.star_system_name ?? t.space_station_name ?? null }))
    : capacities.filter((c: any) => c.id_terminal != null).map((c: any) => ({ id: c.id_terminal, name: c.terminal_name ?? `Terminal ${c.id_terminal}`, system: null }));

  const seen = new Map<number, RefineryStation>();
  for (const s of source) {
    if (seen.has(s.id)) continue;
    const stationYields = yieldByTerminal.get(s.id) ?? [];
    const yieldValues = stationYields.map((y: any) => y.yieldPercent).filter((v: any): v is number => v != null);
    seen.set(s.id, {
      id: s.id,
      name: s.name,
      system: s.system,
      queueSec: queueByTerminal.get(s.id) ?? null,
      bestYield: yieldValues.length ? Math.max(...yieldValues) : null,
      yields: stationYields,
    });
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClientRefineryMethods(): Promise<RefineryMethod[]> {
  const methods = await uexGet<any>("refineries_methods");
  return methods.map((m: any) => ({
    id: m.id ?? null,
    name: m.name ?? "Unknown",
    yield: m.rating_yield ?? null,
    speed: m.rating_speed ?? null,
    cost: m.rating_cost ?? null,
  }));
}

export async function getClientOreCommodities(): Promise<OreCommodity[]> {
  const commodities = await uexGet<any>("commodities");
  const ores = commodities.filter((c: any) => c.is_refinable === 1);
  const list = ores.length > 0 ? ores : commodities;
  return list
    .map((c: any) => ({ id: c.id, name: c.name, pricePerScu: c.price_sell ?? null }))
    .sort((a: OreCommodity, b: OreCommodity) => a.name.localeCompare(b.name));
}

export async function getClientOres(): Promise<FullOre[]> {
  const all = await uexGet<any>("commodities");
  return all
    .filter((c: any) => c.price_sell > 0)
    .map((c: any): FullOre => ({
      id: c.id,
      name: c.name,
      code: c.code ?? "",
      kind: c.kind ?? "—",
      weightScu: c.weight_scu ?? null,
      priceBuy: c.price_buy || null,
      priceSell: c.price_sell || null,
      isRaw: c.is_raw === 1,
      isRefined: c.is_refined === 1,
      isRefinable: c.is_refinable === 1,
      isVolatileQt: c.is_volatile_qt === 1,
      isIllegal: c.is_illegal === 1,
      parentId: c.id_parent ?? null,
      wiki: c.wiki ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClientSellLocations(commodityId: number): Promise<SellLocation[]> {
  const raw = await uexGet<any>("commodities_prices", { id_commodity: commodityId });
  return raw
    .filter((r: any) => r.price_sell > 0)
    .map((r: any): SellLocation => ({
      terminalId: r.id_terminal,
      terminalName: r.terminal_name ?? `Terminal ${r.id_terminal}`,
      system: r.star_system_name ?? "—",
      planet: r.planet_name ?? null,
      city: r.city_name ?? null,
      priceSell: r.price_sell,
      priceSellMin: r.price_sell_min,
      priceSellMax: r.price_sell_max,
    }))
    .sort((a, b) => b.priceSell - a.priceSell);
}

export async function getClientTradeRoutes(): Promise<{ routes: TradeRoute[]; updatedAt: string }> {
  const all = await uexGet<any>("commodities_prices_all");

  function locationLabel(r: any): string {
    return r.space_station_name || r.moon_name || r.planet_name || r.city_name || "—";
  }

  const byComm = new Map<number, any[]>();
  for (const e of all) {
    if (!e.id_commodity || !e.commodity_name) continue;
    if (!byComm.has(e.id_commodity)) byComm.set(e.id_commodity, []);
    byComm.get(e.id_commodity)!.push(e);
  }

  const routes: TradeRoute[] = [];
  for (const [, entries] of byComm) {
    const buyers = entries.filter((e: any) => e.price_buy > 0 && (e.scu_buy ?? 0) > 0);
    const sellers = entries.filter((e: any) => e.price_sell > 0);
    if (buyers.length === 0 || sellers.length === 0) continue;

    const bestBuy = buyers.reduce((a: any, b: any) => (a.price_buy < b.price_buy ? a : b));
    const bestSell = sellers.reduce((a: any, b: any) => (a.price_sell > b.price_sell ? a : b));

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
  return { routes, updatedAt: new Date().toISOString() };
}

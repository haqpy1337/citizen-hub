import { uexFetch } from "./client";
import {
  CommodityLocation,
  CommodityWithPrices,
  OreCommodity,
  RefineryMethod,
  RefineryStation,
  UexCommodity,
  UexCommodityPrice,
  UexRefineryCapacity,
  UexRefineryMethod,
  UexRefineryYield,
  UexTerminal,
} from "./types";

/**
 * All refinery stations with current queue time and yields.
 * Combines three UEX endpoints into a clean, frontend-ready shape.
 */
export async function getRefineryStations(): Promise<RefineryStation[]> {
  const [terminals, capacities, yields] = await Promise.all([
    uexFetch<UexTerminal>("terminals", { query: { type: "refinery" } }),
    uexFetch<UexRefineryCapacity>("refineries_capacities"),
    uexFetch<UexRefineryYield>("refineries_yields"),
  ]);

  // Index: queue time (seconds) per terminal ID
  const queueByTerminal = new Map<number, number>();
  for (const c of capacities) {
    if (c.id_terminal != null && c.value != null) {
      queueByTerminal.set(c.id_terminal, c.value);
    }
  }

  // Index: yields per terminal ID
  const yieldByTerminal = new Map<
    number,
    { commodityId: number | null; name: string; yieldPercent: number | null }[]
  >();
  for (const y of yields) {
    if (y.id_terminal == null) continue;
    const list = yieldByTerminal.get(y.id_terminal) ?? [];
    list.push({
      commodityId: y.id_commodity ?? null,
      name: y.commodity_name ?? "Unknown",
      yieldPercent: y.value ?? null,
    });
    yieldByTerminal.set(y.id_terminal, list);
  }

  // If terminals endpoint returns no results, fall back to capacity data.
  const source: { id: number; name: string; system: string | null }[] =
    terminals.length > 0
      ? terminals.map((t) => ({
          id: t.id,
          name: t.name ?? t.nickname ?? `Terminal ${t.id}`,
          system: t.star_system_name ?? t.space_station_name ?? null,
        }))
      : capacities
          .filter((c) => c.id_terminal != null)
          .map((c) => ({
            id: c.id_terminal as number,
            name: c.terminal_name ?? `Terminal ${c.id_terminal}`,
            system: null,
          }));

  const seen = new Map<number, RefineryStation>();
  for (const s of source) {
    if (seen.has(s.id)) continue;
    const stationYields = yieldByTerminal.get(s.id) ?? [];
    const yieldValues = stationYields
      .map((y) => y.yieldPercent)
      .filter((v): v is number => v != null);
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

/** All refinery methods (yield, speed, cost ratings). */
export async function getRefineryMethods(): Promise<RefineryMethod[]> {
  const methods = await uexFetch<UexRefineryMethod>("refineries_methods");
  return methods.map((m) => ({
    id: m.id ?? null,
    name: m.name ?? "Unknown",
    yield: m.rating_yield ?? null,
    speed: m.rating_speed ?? null,
    cost: m.rating_cost ?? null,
  }));
}

/** All tradeable commodities (no prices — use getCommodityPrices for on-demand price data).
 *  Excludes raw ores (is_refinable=1) — those go into refineries, not trade terminals. */
export async function getCommodities(): Promise<CommodityWithPrices[]> {
  const commodities = await uexFetch<UexCommodity>("commodities");
  return commodities
    .filter(c => c.is_refinable !== 1)
    .map(c => ({
      id: c.id,
      name: c.name,
      code: c.code ?? null,
      isRefinable: false,
      locations: [],
      bestSell: null,
      bestBuy: null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function pricesToLocations(prices: UexCommodityPrice[]): CommodityLocation[] {
  return prices
    .map(p => ({
      terminalId:  p.id_terminal ?? 0,
      terminalName: p.terminal_name ?? `Terminal ${p.id_terminal}`,
      system:  p.star_system_name ?? null,
      station: p.space_station_name ?? p.planet_name ?? null,
      orbit:   p.orbit_name ?? null,
      faction: p.faction_name ?? null,
      priceSell:   (p.price_sell_avg ?? p.price_sell) || null,
      priceBuy:    (p.price_buy_avg  ?? p.price_buy)  || null,
      scuSellAvg: p.scu_sell_avg ?? null,
      scuSellMin: p.scu_sell_min ?? null,
      scuSellMax: p.scu_sell_max ?? null,
      scuBuyAvg:  p.scu_buy_avg  ?? null,
      scuBuyMin:  p.scu_buy_min  ?? null,
      scuBuyMax:  p.scu_buy_max  ?? null,
    }))
    .filter(l => l.priceSell != null || l.priceBuy != null);
}

/** Prices for a single commodity, fetched on-demand. */
export async function getCommodityPrices(id: number): Promise<{
  locations: CommodityLocation[];
  bestSell: number | null;
  bestBuy: number | null;
}> {
  const prices = await uexFetch<UexCommodityPrice>("commodities_prices", {
    query: { id_commodity: id },
  });
  const locations = pricesToLocations(prices);
  const sells = locations.map(l => l.priceSell).filter((v): v is number => v != null);
  const buys  = locations.map(l => l.priceBuy ).filter((v): v is number => v != null);
  return {
    locations,
    bestSell: sells.length ? Math.max(...sells) : null,
    bestBuy:  buys.length  ? Math.min(...buys)  : null,
  };
}

/** @deprecated use getCommodities + getCommodityPrices */
export async function getCommoditiesWithPrices(): Promise<CommodityWithPrices[]> {
  return getCommodities();
}

/**
 * All commodities that have at least one sell price in the UEX price feed.
 * Used for the ticker — includes Bexalite and anything else UEX prices.
 * On every call we also check formerly price-less entries so new prices appear.
 */
export async function getOreCommodities(): Promise<OreCommodity[]> {
  const [commodities, prices] = await Promise.all([
    uexFetch<UexCommodity>("commodities"),
    uexFetch<UexCommodityPrice>("commodities_prices").catch(() => [] as UexCommodityPrice[]),
  ]);

  // Build best sell price per commodity id from terminal price feed
  const sellMap = new Map<number, number[]>();
  for (const p of prices) {
    if (p.id_commodity == null) continue;
    const price = p.price_sell_avg ?? p.price_sell ?? p.scu_sell_avg;
    if (price && price > 0) {
      const arr = sellMap.get(p.id_commodity) ?? [];
      arr.push(price);
      sellMap.set(p.id_commodity, arr);
    }
  }

  // Build commodity lookup by id
  const byId = new Map(commodities.map(c => [c.id, c]));

  // Take every commodity that appears in the price feed (regardless of is_raw flags)
  // and fall back to the commodity's own price_sell/price_buy if not in the feed.
  const result: OreCommodity[] = [];

  // First: price-feed entries
  for (const [id, arr] of sellMap) {
    const c = byId.get(id);
    if (!c) continue;
    result.push({
      id: c.id,
      name: c.name,
      code: c.code ?? null,
      pricePerScu: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    });
  }

  // Second: commodities with built-in price but not yet in feed (catches newly added)
  const inFeed = new Set(sellMap.keys());
  for (const c of commodities) {
    if (inFeed.has(c.id)) continue;
    const p = (c.price_sell && c.price_sell > 0 ? c.price_sell : null)
           ?? (c.price_buy  && c.price_buy  > 0 ? c.price_buy  : null);
    if (p == null) continue;
    result.push({ id: c.id, name: c.name, code: c.code ?? null, pricePerScu: p });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

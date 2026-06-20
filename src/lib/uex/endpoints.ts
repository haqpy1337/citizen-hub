import { uexFetch } from "./client";
import {
  OreCommodity,
  RefineryMethod,
  RefineryStation,
  UexCommodity,
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

/** All mineable raw ores with average sell price per SCU. */
export async function getOreCommodities(): Promise<OreCommodity[]> {
  const commodities = await uexFetch<UexCommodity>("commodities");

  // is_refinable === 1: raw ores that go INTO a refinery (no refined/processed duplicates)
  const ores = commodities.filter((c) => c.is_refinable === 1);
  const list = ores.length > 0 ? ores : commodities;

  return list
    .map((c) => ({
      id: c.id,
      name: c.name,
      pricePerScu: c.price_sell ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

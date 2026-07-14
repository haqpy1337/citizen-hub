/**
 * Central location for UEX API field names.
 * If the API changes field names, update only here.
 * Docs: https://uexcorp.space/api/documentation
 *
 * All UEX responses: { status, http_code, data: [...] }
 */

export interface UexEnvelope<T> {
  status: string;
  http_code: number;
  data: T;
}

export interface UexTerminal {
  id: number;
  name?: string;
  nickname?: string;
  type?: string;
  id_star_system?: number;
  star_system_name?: string;
  space_station_name?: string;
  planet_name?: string;
  is_available?: number;
  is_refinery?: number;
}

export interface UexRefineryCapacity {
  id_terminal?: number;
  terminal_name?: string;
  /** Queue time in seconds. */
  value?: number;
  star_system_name?: string;
}

export interface UexRefineryMethod {
  id?: number;
  name?: string;
  rating_yield?: number;
  rating_capacity?: number;
  rating_cost?: number;
  /** Speed rating (1=slow, 3=fast). */
  rating_speed?: number;
}

export interface UexRefineryYield {
  id_terminal?: number;
  id_commodity?: number;
  commodity_name?: string;
  /** Yield modifier in %. Can be negative. */
  value?: number;
}

export interface UexCommodity {
  id: number;
  name: string;
  code?: string;
  is_raw?: number;
  is_refined?: number;
  is_refinable?: number;
  is_extractable?: number;
  price_sell?: number;
  price_buy?: number;
}

export interface UexCommodityPrice {
  id_commodity?: number;
  id_terminal?: number;
  terminal_name?: string;
  star_system_name?: string;
  space_station_name?: string;
  planet_name?: string;
  orbit_name?: string;
  faction_name?: string;
  /** Price the NPC pays the player (player sells → player receives this). */
  price_sell?: number;
  /** Price the NPC charges the player (player buys). */
  price_buy?: number;
  price_sell_avg?: number;
  price_buy_avg?: number;
  scu_sell_avg?: number;
  scu_sell_min?: number;
  scu_sell_max?: number;
  scu_buy_avg?: number;
  scu_buy_min?: number;
  scu_buy_max?: number;
  /** 1 = currently stocked/available at this terminal */
  is_available?: number;
}

// --- Normalized commodity types -------------------------------------------

export interface CommodityLocation {
  terminalId: number;
  terminalName: string;
  system: string | null;
  station: string | null;
  orbit: string | null;
  faction: string | null;
  /** What the NPC pays the player (sell here). */
  priceSell: number | null;
  /** What the player pays the NPC (buy here). */
  priceBuy: number | null;
  scuSellAvg: number | null;
  scuSellMin: number | null;
  scuSellMax: number | null;
  scuBuyAvg: number | null;
  scuBuyMin: number | null;
  scuBuyMax: number | null;
}

export interface CommodityWithPrices {
  id: number;
  name: string;
  code: string | null;
  isRefinable: boolean;
  locations: CommodityLocation[];
  /** Best (highest) sell price across all terminals. */
  bestSell: number | null;
  /** Best (lowest) buy price across all terminals. */
  bestBuy: number | null;
}

// --- Normalized types used by the frontend --------------------------------

export interface RefineryStation {
  id: number;
  name: string;
  system: string | null;
  /** Current queue time in seconds. Null if unknown. */
  queueSec: number | null;
  /** Best yield modifier across all materials at this station. */
  bestYield: number | null;
  yields: { commodityId: number | null; name: string; yieldPercent: number | null }[];
}

export interface RefineryMethod {
  id: number | null;
  name: string;
  yield: number | null;
  speed: number | null;
  cost: number | null;
}

export interface OreCommodity {
  id: number;
  name: string;
  /** Average sell price per SCU in UEC, if known. */
  pricePerScu: number | null;
}

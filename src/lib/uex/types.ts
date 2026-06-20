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

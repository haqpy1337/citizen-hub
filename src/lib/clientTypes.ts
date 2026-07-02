// Types returned to the frontend from our own API routes.

export interface JobMaterial {
  id: string;
  commodityId: number | null;
  name: string;
  quantity: number;
  unit: string;
  yieldPercent: number | null;
}

export interface Job {
  id: string;
  stationId: number | null;
  stationName: string;
  systemName: string | null;
  method: string | null;
  startedAt: string;
  durationSec: number;
  finishesAt: string;
  status: "running" | "done" | "collected" | "cancelled";
  note: string | null;
  materials: JobMaterial[];
}

export interface RefineryStation {
  id: number;
  name: string;
  system: string | null;
  /** Current queue time in seconds. Null if unknown. */
  queueSec: number | null;
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
  pricePerScu: number | null;
}

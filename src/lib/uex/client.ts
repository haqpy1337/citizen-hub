import { UexEnvelope } from "./types";

const BASE = "https://api.uexcorp.space/2.0";

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000;

export interface FetchOpts {
  ttlMs?: number;
  query?: Record<string, string | number | undefined>;
}

export async function uexFetch<T>(endpoint: string, opts: FetchOpts = {}): Promise<T[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  const url = `${BASE}/${endpoint}${qs ? `?${qs}` : ""}`;
  const ttl = opts.ttlMs ?? TTL;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < ttl) return cached.data as T[];

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return (cached?.data as T[]) ?? [];
    const json = (await res.json()) as UexEnvelope<T[]>;
    const data = Array.isArray(json.data) ? json.data : [];
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch {
    return (cached?.data as T[]) ?? [];
  }
}

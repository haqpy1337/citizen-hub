import { UexEnvelope } from "./types";

const BASE = process.env.UEX_API_BASE || "https://api.uexcorp.space/2.0";
const TOKEN = process.env.UEX_API_TOKEN || "";

// Einfacher serverseitiger In-Memory-Cache. Live-Daten aendern sich nicht im
// Sekundentakt, daher reduziert das die Last auf die UEX-API deutlich.
type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 Minuten

export interface FetchOpts {
  ttlMs?: number;
  query?: Record<string, string | number | undefined>;
}

/**
 * Ruft einen UEX-Endpunkt ab und gibt das entpackte `data`-Array zurueck.
 * Fehler werfen keine Exception nach oben durch, sondern liefern [] – so
 * bleibt die App bedienbar, auch wenn die API gerade nicht erreichbar ist.
 */
export async function uexFetch<T>(
  endpoint: string,
  opts: FetchOpts = {}
): Promise<T[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  if (TOKEN) params.set("secret_key", TOKEN);
  const qs = params.toString();
  const url = `${BASE}/${endpoint}${qs ? `?${qs}` : ""}`;
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < ttl) {
    return cached.data as T[];
  }

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      // Next.js eigenes Caching deaktivieren, wir cachen selbst.
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[UEX] ${endpoint} -> HTTP ${res.status}`);
      return (cached?.data as T[]) ?? [];
    }

    const json = (await res.json()) as UexEnvelope<T[]>;
    const data = Array.isArray(json.data) ? json.data : [];
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.error(`[UEX] ${endpoint} -> Fehler`, err);
    return (cached?.data as T[]) ?? [];
  }
}

export function isUexConfigured(): boolean {
  return Boolean(TOKEN);
}

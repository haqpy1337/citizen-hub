"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LanguageProvider";
import { getClientOres } from "@/lib/clientUex";
import type { FullOre } from "@/app/api/ores/route";
import {
  MINING_LOCATIONS,
  BODIES,
  ORE_NAMES,
  CONCENTRATION_ORDER,
  type MiningLocation,
  type Concentration,
} from "@/lib/miningData";

type Tab = "byOre" | "byLocation" | "bestSpots";

// Map ore name prefix to price (e.g. "Quantanium" → priceSell of "Quantanium (Raw)")
function buildPriceMap(ores: FullOre[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const ore of ores) {
    if (!ore.priceSell) continue;
    // Try exact match first, then prefix match (e.g. "Quantanium" matches "Quantanium (Raw)")
    const baseName = ore.name.replace(/\s*\(.*?\)$/, "").trim();
    if (!map.has(baseName) || ore.priceSell > map.get(baseName)!) {
      map.set(baseName, ore.priceSell);
    }
  }
  return map;
}

function concentrationBadge(c: Concentration, label: string) {
  const colors: Record<Concentration, string> = {
    high: "bg-toxic/20 text-toxic border-toxic/30",
    medium: "bg-amber/20 text-amber border-amber/30",
    low: "bg-hull text-muted border-edge",
  };
  return (
    <span className={`inline-block border rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${colors[c]}`}>
      {label}
    </span>
  );
}

function locationTypeLabel(type: MiningLocation["type"], t: any) {
  const map: Record<MiningLocation["type"], string> = {
    moon: t.mining.moon,
    planet: t.mining.planet,
    asteroid_belt: t.mining.asteroidBelt,
    lagrange: t.mining.lagrange,
  };
  return map[type] ?? type;
}

function fmtPrice(p: number | undefined) {
  if (!p) return null;
  return p.toLocaleString("en-US") + " aUEC/SCU";
}

function locationScore(loc: MiningLocation, priceMap: Map<string, number>): number {
  return loc.ores.reduce((acc, ore) => {
    const price = priceMap.get(ore.name) ?? 0;
    return acc + price * CONCENTRATION_ORDER[ore.concentration];
  }, 0);
}

export default function MiningClient() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("bestSpots");
  const [ores, setOres] = useState<FullOre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOre, setFilterOre] = useState("");
  const [filterBody, setFilterBody] = useState("");

  useEffect(() => {
    getClientOres()
      .then(setOres)
      .catch(() => setError(t.mining.failedToLoad))
      .finally(() => setLoading(false));
  }, []);

  const priceMap = useMemo(() => buildPriceMap(ores), [ores]);

  // ── By Ore tab ──────────────────────────────────────────────────────────────
  const byOreData = useMemo(() => {
    return ORE_NAMES.map((oreName) => {
      const locations = MINING_LOCATIONS.filter((loc) =>
        loc.ores.some((o) => o.name === oreName) &&
        (filterBody ? loc.body === filterBody : true)
      ).sort((a, b) => {
        const ca = a.ores.find((o) => o.name === oreName)!.concentration;
        const cb = b.ores.find((o) => o.name === oreName)!.concentration;
        return CONCENTRATION_ORDER[cb] - CONCENTRATION_ORDER[ca];
      });
      return { oreName, price: priceMap.get(oreName), locations };
    }).filter((row) =>
      (filterOre ? row.oreName.toLowerCase().includes(filterOre.toLowerCase()) : true) &&
      row.locations.length > 0
    ).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [priceMap, filterOre, filterBody]);

  // ── By Location tab ─────────────────────────────────────────────────────────
  const byLocationData = useMemo(() => {
    return MINING_LOCATIONS.filter((loc) => {
      const bodyOk = filterBody ? loc.body === filterBody : true;
      const oreOk = filterOre
        ? loc.ores.some((o) => o.name.toLowerCase().includes(filterOre.toLowerCase()))
        : true;
      return bodyOk && oreOk;
    });
  }, [filterOre, filterBody]);

  // ── Best Spots tab ──────────────────────────────────────────────────────────
  const bestSpotsData = useMemo(() => {
    return [...MINING_LOCATIONS]
      .map((loc) => ({ loc, score: locationScore(loc, priceMap) }))
      .filter(({ loc }) => filterBody ? loc.body === filterBody : true)
      .sort((a, b) => b.score - a.score);
  }, [priceMap, filterBody]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "bestSpots", label: t.mining.tabBestSpots },
    { id: "byOre", label: t.mining.tabByOre },
    { id: "byLocation", label: t.mining.tabByLocation },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="eyebrow">Exploration // Hotspots</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{t.mining.heading}</h1>
        <p className="mt-2 text-muted">{t.mining.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-edge">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
              tab === id
                ? "border-quant text-quant"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {tab !== "bestSpots" && (
          <input
            type="text"
            placeholder={t.mining.filterOre}
            value={filterOre}
            onChange={(e) => setFilterOre(e.target.value)}
            className="flex-1 min-w-[160px] rounded border border-edge bg-hull px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-quant"
          />
        )}
        <select
          value={filterBody}
          onChange={(e) => setFilterBody(e.target.value)}
          className="rounded border border-edge bg-hull px-3 py-2 text-sm text-ink focus:outline-none focus:border-quant"
        >
          <option value="">{t.mining.allBodies}</option>
          {BODIES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {loading && (
        <p className="text-muted text-sm">{t.mining.loading}</p>
      )}
      {error && (
        <p className="text-danger text-sm">{error}</p>
      )}

      {/* ── Best Spots tab ─────────────────────────────────────────────────── */}
      {!loading && tab === "bestSpots" && (
        <div className="space-y-3">
          {bestSpotsData.map(({ loc, score }, rank) => (
            <div key={loc.id} className="rounded-lg border border-edge bg-panel p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm"
                  style={{ background: rank === 0 ? "var(--color-quant)" : "var(--color-hull)", color: rank === 0 ? "var(--color-void)" : "var(--color-muted)" }}>
                  {rank + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-display font-bold text-ink">{loc.name}</span>
                    <span className="text-xs text-muted">{loc.body} · {locationTypeLabel(loc.type, t)}</span>
                    {loc.notes && (
                      <span className="text-xs text-amber italic">{loc.notes}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {loc.ores.map((ore) => {
                      const price = priceMap.get(ore.name);
                      return (
                        <span key={ore.name} className="flex items-center gap-1 rounded border border-edge bg-hull px-2 py-0.5 text-xs">
                          <span className="text-ink">{ore.name}</span>
                          {concentrationBadge(ore.concentration, ore.concentration === "high" ? t.mining.high : ore.concentration === "medium" ? t.mining.medium : t.mining.low)}
                          {price && <span className="text-quant font-mono">{price.toLocaleString()}</span>}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                    <span>{t.mining.nearestRefinery}: <span className="text-ink">{loc.nearestRefineries[0]}</span></span>
                    <Link
                      href={`/dashboard/jobs/new?station=${encodeURIComponent(loc.nearestRefineries[0])}`}
                      className="text-quant hover:underline"
                    >
                      {t.mining.startJob}
                    </Link>
                  </div>
                </div>
                {score > 0 && (
                  <div className="flex-shrink-0 text-right">
                    <div className="font-mono text-quant font-bold text-sm">{Math.round(score / 1000)}k</div>
                    <div className="text-[10px] text-muted uppercase tracking-wider">score</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {bestSpotsData.length === 0 && (
            <p className="text-muted text-sm">{t.mining.noMatch}</p>
          )}
        </div>
      )}

      {/* ── By Ore tab ──────────────────────────────────────────────────────── */}
      {!loading && tab === "byOre" && (
        <div className="space-y-3">
          {byOreData.map(({ oreName, price, locations }) => (
            <div key={oreName} className="rounded-lg border border-edge bg-panel overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-edge">
                <span className="font-display font-bold text-ink flex-1">{oreName}</span>
                {price
                  ? <span className="font-mono text-quant text-sm">{price.toLocaleString()} aUEC/SCU</span>
                  : <span className="text-muted text-sm">{t.mining.noPrice}</span>
                }
              </div>
              <div className="divide-y divide-edge">
                {locations.map((loc) => {
                  const oreEntry = loc.ores.find((o) => o.name === oreName)!;
                  return (
                    <div key={loc.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-ink">{loc.name}</span>
                        <span className="text-xs text-muted ml-2">{loc.body}</span>
                      </div>
                      {concentrationBadge(oreEntry.concentration, oreEntry.concentration === "high" ? t.mining.high : oreEntry.concentration === "medium" ? t.mining.medium : t.mining.low)}
                      <span className="text-xs text-muted hidden sm:block">{loc.nearestRefineries[0]}</span>
                      <Link
                        href={`/dashboard/jobs/new?station=${encodeURIComponent(loc.nearestRefineries[0])}`}
                        className="text-xs text-quant hover:underline shrink-0"
                      >
                        {t.mining.startJob}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {byOreData.length === 0 && (
            <p className="text-muted text-sm">{t.mining.noMatch}</p>
          )}
        </div>
      )}

      {/* ── By Location tab ─────────────────────────────────────────────────── */}
      {!loading && tab === "byLocation" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {byLocationData.map((loc) => (
            <div key={loc.id} className="rounded-lg border border-edge bg-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-bold text-ink">{loc.name}</span>
                <span className="text-xs text-muted">{locationTypeLabel(loc.type, t)}</span>
              </div>
              <div className="text-xs text-muted mb-3">{loc.body} · {loc.system}</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {loc.ores
                  .filter((o) => !filterOre || o.name.toLowerCase().includes(filterOre.toLowerCase()))
                  .sort((a, b) => CONCENTRATION_ORDER[b.concentration] - CONCENTRATION_ORDER[a.concentration])
                  .map((ore) => {
                    const price = priceMap.get(ore.name);
                    return (
                      <span key={ore.name} className="flex items-center gap-1 rounded border border-edge bg-hull px-2 py-0.5 text-xs">
                        <span className="text-ink">{ore.name}</span>
                        {concentrationBadge(ore.concentration, ore.concentration === "high" ? t.mining.high : ore.concentration === "medium" ? t.mining.medium : t.mining.low)}
                        {price && <span className="text-quant font-mono">{price.toLocaleString()}</span>}
                      </span>
                    );
                  })}
              </div>
              {loc.notes && (
                <p className="text-xs text-amber italic mb-2">{loc.notes}</p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">{loc.nearestRefineries[0]}</span>
                <Link
                  href={`/dashboard/jobs/new?station=${encodeURIComponent(loc.nearestRefineries[0])}`}
                  className="text-quant hover:underline"
                >
                  {t.mining.startJob}
                </Link>
              </div>
            </div>
          ))}
          {byLocationData.length === 0 && (
            <p className="text-muted text-sm col-span-2">{t.mining.noMatch}</p>
          )}
        </div>
      )}

      <p className="mt-8 text-[11px] text-muted/60 text-center">
        Mining data: Stanton system · Patch 3.23+ · Prices via UEX Corp API
      </p>
    </div>
  );
}

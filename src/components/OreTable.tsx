"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { FullOre } from "@/app/api/ores/route";
import type { SellLocation } from "@/app/api/ore-prices/[id]/route";
import { getClientOres, getClientSellLocations, getClientBestPrices } from "@/lib/clientUex";
import { useT } from "@/components/LanguageProvider";

type SortKey = "name" | "code" | "kind" | "type" | "priceSell" | "priceBuy" | "weightScu" | "flags";

export default function OreTable() {
  const { t } = useT();
  const [ores, setOres] = useState<FullOre[] | null>(null);
  const [bestPrices, setBestPrices] = useState<Map<number, { bestSell: number; bestBuy: number | null }>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [minSell, setMinSell] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sellLocations, setSellLocations] = useState<SellLocation[] | null>(null);
  const [sellLoading, setSellLoading] = useState(false);

  useEffect(() => {
    Promise.all([getClientOres(), getClientBestPrices()])
      .then(([o, p]) => { setOres(o); setBestPrices(p); })
      .catch(() => setError(t.ores.failedToLoad));
  }, [t]);

  const rows = useMemo(() => {
    let r = ores ?? [];
    if (q.trim()) {
      const n = q.toLowerCase();
      r = r.filter((o) =>
        o.name.toLowerCase().includes(n) ||
        o.code.toLowerCase().includes(n) ||
        o.kind.toLowerCase().includes(n)
      );
    }
    const minSellNum = parseFloat(minSell);
    if (!isNaN(minSellNum) && minSellNum > 0) {
      r = r.filter((o) => (bestPrices.get(o.id)?.bestSell ?? o.priceSell ?? 0) >= minSellNum);
    }

    const flagScore = (o: FullOre) => (o.isIllegal ? 2 : 0) + (o.isVolatileQt ? 1 : 0);
    const effectiveSell = (o: FullOre) => bestPrices.get(o.id)?.bestSell || o.priceSell || 0;
    const effectiveBuy  = (o: FullOre) => bestPrices.get(o.id)?.bestBuy  ?? o.priceBuy  ?? null;
    const dir = asc ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "code") return (a.code ?? "").localeCompare(b.code ?? "") * dir;
      if (sortKey === "kind") return (a.kind ?? "").localeCompare(b.kind ?? "") * dir;
      if (sortKey === "type") return (a.isRefined ? 1 : 0) - (b.isRefined ? 1 : 0) * dir;
      if (sortKey === "flags") return (flagScore(a) - flagScore(b)) * dir;
      if (sortKey === "priceSell") return (effectiveSell(a) - effectiveSell(b)) * dir;
      if (sortKey === "priceBuy")  return ((effectiveBuy(a) ?? -1) - (effectiveBuy(b) ?? -1)) * dir;
      const av = (a[sortKey as "weightScu"] as number | null) ?? -1;
      const bv = (b[sortKey as "weightScu"] as number | null) ?? -1;
      return (av - bv) * dir;
    });
  }, [ores, bestPrices, q, minSell, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc(!asc);
    else { setSortKey(key); setAsc(key === "name"); }
  }

  async function toggleExpand(ore: FullOre) {
    if (expandedId === ore.id) {
      setExpandedId(null);
      setSellLocations(null);
      return;
    }
    setExpandedId(ore.id);
    setSellLocations(null);
    setSellLoading(true);
    try {
      const locations = await getClientSellLocations(ore.id);
      setSellLocations(locations);
    } catch {
      setSellLocations([]);
    } finally {
      setSellLoading(false);
    }
  }

  if (error) return <div className="panel p-6 text-sm text-danger">{error}</div>;
  if (ores === null) return <div className="panel p-6 text-sm text-muted">{t.ores.loading}</div>;

  return (
    <div>
      {/* Filters */}
      <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">{t.ores.search}</label>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.ores.searchPlaceholder}
          />
        </div>
        <div className="w-36">
          <label className="label">{t.ores.minSell}</label>
          <input
            className="field"
            type="number"
            min="0"
            step="100"
            value={minSell}
            onChange={(e) => setMinSell(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="font-mono text-xs text-muted self-center whitespace-nowrap">
          {t.ores.oresCount(rows.length)}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-left">
              <Th label={t.ores.name} sortKey="name" active={sortKey} asc={asc} onSort={toggleSort} />
              <Th label={t.ores.code} sortKey="code" active={sortKey} asc={asc} onSort={toggleSort} className="hidden sm:table-cell" />
              <Th label={t.ores.kind} sortKey="kind" active={sortKey} asc={asc} onSort={toggleSort} className="hidden md:table-cell" />
              <Th label={t.ores.type} sortKey="type" active={sortKey} asc={asc} onSort={toggleSort} />
              <Th label={t.ores.sell} sortKey="priceSell" active={sortKey} asc={asc} onSort={toggleSort} align="right" />
              <Th label={t.ores.buy} sortKey="priceBuy" active={sortKey} asc={asc} onSort={toggleSort} align="right" className="hidden sm:table-cell" />
              <Th label={t.ores.density} sortKey="weightScu" active={sortKey} asc={asc} onSort={toggleSort} align="right" className="hidden md:table-cell" />
              <Th label={t.ores.flags} sortKey="flags" active={sortKey} asc={asc} onSort={toggleSort} align="center" className="hidden sm:table-cell" />
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">{t.ores.whereToSell}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const isExpanded = expandedId === o.id;
              const bestSell = bestPrices.get(o.id)?.bestSell || o.priceSell || null;
              const bestBuy  = bestPrices.get(o.id)?.bestBuy  ?? o.priceBuy  ?? null;
              return (
                <React.Fragment key={o.id}>
                  <tr
                    className={`border-b border-edge/40 last:border-0 transition ${isExpanded ? "bg-quant/5 border-quant/20" : "hover:bg-hull/50"}`}
                  >
                    <td className="px-4 py-3 font-display font-semibold text-ink">
                      {o.wiki ? (
                        <a href={o.wiki} target="_blank" rel="noopener noreferrer" className="hover:text-quant transition">
                          {o.name}
                        </a>
                      ) : o.name}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 font-mono text-xs text-muted">{o.code || "—"}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-muted">{o.kind}</td>
                    <td className="px-4 py-3">
                      {o.isRefinable && <span className="tag border-quant/30 text-quant">{t.ores.raw}</span>}
                      {o.isRefined && <span className="tag border-toxic/30 text-toxic">{t.ores.refined}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {bestSell ? (
                        <span className="text-toxic font-semibold">{bestSell.toLocaleString()}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {bestBuy ? bestBuy.toLocaleString() : "—"}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {o.weightScu ? o.weightScu.toFixed(2) : "—"}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {o.isVolatileQt && (
                          <span className="tag border-amber/40 text-amber" title="Volatile during quantum travel">{t.ores.volatile}</span>
                        )}
                        {o.isIllegal && (
                          <span className="tag border-danger/40 text-danger" title="Illegal commodity">{t.ores.illegal}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleExpand(o)}
                        className={`font-mono text-xs transition px-2 py-1 rounded border ${
                          isExpanded
                            ? "border-quant/40 text-quant"
                            : "border-edge text-muted hover:border-quant/40 hover:text-quant"
                        }`}
                      >
                        {isExpanded ? t.ores.hide : t.ores.sellAt}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded sell locations */}
                  {isExpanded && (
                    <tr className="border-b border-quant/20">
                      <td colSpan={9} className="px-0 py-0" style={{ display: "table-cell" }}>
                        <div className="bg-quant/5 px-6 py-4">
                          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-quant">
                            {t.ores.sellLocations(o.name)}
                          </p>

                          {sellLoading && (
                            <p className="font-mono text-xs text-muted">{t.ores.loadingLocations}</p>
                          )}

                          {!sellLoading && sellLocations && sellLocations.length === 0 && (
                            <p className="font-mono text-xs text-muted">
                              {t.ores.noLocations}
                            </p>
                          )}

                          {!sellLoading && sellLocations && sellLocations.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-edge/50 text-left">
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted w-6">{t.ores.rank}</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{t.ores.terminal}</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{t.ores.system}</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{t.ores.location}</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted text-right">{t.ores.sellPrice}</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted text-right">{t.ores.min}</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted text-right">{t.ores.max}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sellLocations.map((loc, i) => {
                                    const isBest = i === 0;
                                    return (
                                      <tr
                                        key={loc.terminalId}
                                        className="border-b border-edge/30 last:border-0"
                                      >
                                        <td className="py-2 pr-3 font-mono text-xs text-muted">
                                          {isBest ? <span className="text-toxic font-bold">★</span> : i + 1}
                                        </td>
                                        <td className="py-2 pr-4 text-ink">{loc.terminalName}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-muted">{loc.system}</td>
                                        <td className="py-2 pr-4 font-mono text-xs text-muted">
                                          {[loc.planet, loc.city].filter(Boolean).join(" · ") || "—"}
                                        </td>
                                        <td className={`py-2 text-right font-mono tabular-nums font-semibold ${isBest ? "text-toxic" : "text-ink"}`}>
                                          {loc.priceSell.toLocaleString()}
                                        </td>
                                        <td className="py-2 text-right font-mono tabular-nums text-muted text-xs">
                                          {loc.priceSellMin.toLocaleString()}
                                        </td>
                                        <td className="py-2 text-right font-mono tabular-nums text-muted text-xs">
                                          {loc.priceSellMax.toLocaleString()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  {t.ores.noMatch}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted px-1">
        {t.ores.footer}
      </p>
    </div>
  );
}

function Th({
  label, sortKey, active, asc, onSort, align = "left", className = "",
}: {
  label: string; sortKey: SortKey; active: SortKey; asc: boolean;
  onSort: (k: SortKey) => void; align?: "left" | "right" | "center"; className?: string;
}) {
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`font-mono text-[11px] uppercase tracking-widest transition ${
          active === sortKey ? "text-quant" : "text-muted hover:text-ink"
        }`}
      >
        {label} {active === sortKey ? (asc ? "▲" : "▼") : ""}
      </button>
    </th>
  );
}

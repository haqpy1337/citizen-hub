"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { FullOre } from "@/app/api/ores/route";
import type { SellLocation } from "@/app/api/ore-prices/[id]/route";
import { getClientOres, getClientSellLocations } from "@/lib/clientUex";

type SortKey = "name" | "code" | "kind" | "type" | "priceSell" | "priceBuy" | "weightScu" | "flags";

export default function OreTable() {
  const [ores, setOres] = useState<FullOre[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [minSell, setMinSell] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  // Which ore row is expanded (by ore id)
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sellLocations, setSellLocations] = useState<SellLocation[] | null>(null);
  const [sellLoading, setSellLoading] = useState(false);

  useEffect(() => {
    getClientOres()
      .then(setOres)
      .catch(() => setError("Failed to load ore data."));
  }, []);

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
    if (!isNaN(minSellNum) && minSellNum > 0) r = r.filter((o) => (o.priceSell ?? 0) >= minSellNum);

    const flagScore = (o: FullOre) => (o.isIllegal ? 2 : 0) + (o.isVolatileQt ? 1 : 0);
    const dir = asc ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "code") return (a.code ?? "").localeCompare(b.code ?? "") * dir;
      if (sortKey === "kind") return (a.kind ?? "").localeCompare(b.kind ?? "") * dir;
      if (sortKey === "type") return (a.isRefined ? 1 : 0) - (b.isRefined ? 1 : 0) * dir;
      if (sortKey === "flags") return (flagScore(a) - flagScore(b)) * dir;
      const av = (a[sortKey as "priceSell" | "priceBuy" | "weightScu"] as number | null) ?? -1;
      const bv = (b[sortKey as "priceSell" | "priceBuy" | "weightScu"] as number | null) ?? -1;
      return (av - bv) * dir;
    });
  }, [ores, q, minSell, sortKey, asc]);

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
  if (ores === null) return <div className="panel p-6 text-sm text-muted">Loading ore data…</div>;

  return (
    <div>
      {/* Filters */}
      <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, code or kind…"
          />
        </div>
        <div className="w-36">
          <label className="label">Min sell (UEC/SCU)</label>
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
          {rows.length} ores
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-left">
              <Th label="Name" sortKey="name" active={sortKey} asc={asc} onSort={toggleSort} />
              <Th label="Code" sortKey="code" active={sortKey} asc={asc} onSort={toggleSort} />
              <Th label="Kind" sortKey="kind" active={sortKey} asc={asc} onSort={toggleSort} />
              <Th label="Type" sortKey="type" active={sortKey} asc={asc} onSort={toggleSort} />
              <Th label="Sell (UEC/SCU)" sortKey="priceSell" active={sortKey} asc={asc} onSort={toggleSort} align="right" />
              <Th label="Buy (UEC/SCU)" sortKey="priceBuy" active={sortKey} asc={asc} onSort={toggleSort} align="right" />
              <Th label="kg/SCU" sortKey="weightScu" active={sortKey} asc={asc} onSort={toggleSort} align="right" />
              <Th label="Flags" sortKey="flags" active={sortKey} asc={asc} onSort={toggleSort} align="center" />
              <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">Where to sell</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const isExpanded = expandedId === o.id;
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
                    <td className="px-4 py-3 font-mono text-xs text-muted">{o.code || "—"}</td>
                    <td className="px-4 py-3 text-muted">{o.kind}</td>
                    <td className="px-4 py-3">
                      {o.isRefinable && <span className="tag border-quant/30 text-quant">Raw</span>}
                      {o.isRefined && <span className="tag border-toxic/30 text-toxic">Refined</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {o.priceSell ? (
                        <span className="text-toxic font-semibold">{o.priceSell.toLocaleString()}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {o.priceBuy ? o.priceBuy.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {o.weightScu ? o.weightScu.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {o.isVolatileQt && (
                          <span className="tag border-amber/40 text-amber" title="Volatile during quantum travel">QT</span>
                        )}
                        {o.isIllegal && (
                          <span className="tag border-danger/40 text-danger" title="Illegal commodity">Illegal</span>
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
                        {isExpanded ? "▲ Hide" : "▼ Sell at"}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded sell locations */}
                  {isExpanded && (
                    <tr className="border-b border-quant/20">
                      <td colSpan={9} className="px-0 py-0">
                        <div className="bg-quant/5 px-6 py-4">
                          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-quant">
                            Sell locations for {o.name} — sorted by price
                          </p>

                          {sellLoading && (
                            <p className="font-mono text-xs text-muted">Loading…</p>
                          )}

                          {!sellLoading && sellLocations && sellLocations.length === 0 && (
                            <p className="font-mono text-xs text-muted">
                              No sell locations found. May require a UEX API token for full data.
                            </p>
                          )}

                          {!sellLoading && sellLocations && sellLocations.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-edge/50 text-left">
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted w-6">#</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Terminal</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">System</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Location</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted text-right">Sell price</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted text-right">Min</th>
                                    <th className="pb-2 font-mono text-[10px] uppercase tracking-widest text-muted text-right">Max</th>
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
                  No ores match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted px-1">
        Prices via UEX Corp API · Click "Sell at" to load sell locations · ★ = best price
      </p>
    </div>
  );
}

function Th({
  label, sortKey, active, asc, onSort, align = "left",
}: {
  label: string; sortKey: SortKey; active: SortKey; asc: boolean;
  onSort: (k: SortKey) => void; align?: "left" | "right" | "center";
}) {
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}>
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

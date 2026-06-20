"use client";

import { useEffect, useMemo, useState } from "react";
import type { TradeRoute } from "@/app/api/trade-routes/route";
import { getClientTradeRoutes } from "@/lib/clientUex";

export default function TradeRoutes() {
  const [routes, setRoutes] = useState<TradeRoute[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [systemFilter, setSystemFilter] = useState<"all" | "same" | "cross">("all");
  const [investment, setInvestment] = useState("");
  const [scu, setScu] = useState("");

  useEffect(() => {
    setLoading(true);
    getClientTradeRoutes()
      .then((d) => {
        setRoutes(d.routes);
        setUpdatedAt(d.updatedAt);
      })
      .catch(() => setError("Failed to load trade routes."))
      .finally(() => setLoading(false));
  }, []);

  const systems = useMemo(() => {
    const s = new Set<string>();
    (routes ?? []).forEach((r) => { s.add(r.buySystem); s.add(r.sellSystem); });
    return [...s].sort();
  }, [routes]);

  const rows = useMemo(() => {
    let r = routes ?? [];
    if (q.trim()) {
      const n = q.toLowerCase();
      r = r.filter(
        (x) =>
          x.commodityName.toLowerCase().includes(n) ||
          x.buyTerminal.toLowerCase().includes(n) ||
          x.sellTerminal.toLowerCase().includes(n) ||
          x.buySystem.toLowerCase().includes(n) ||
          x.sellSystem.toLowerCase().includes(n)
      );
    }
    if (systemFilter === "same") r = r.filter((x) => x.isSameSystem);
    if (systemFilter === "cross") r = r.filter((x) => !x.isSameSystem);
    return r;
  }, [routes, q, systemFilter]);

  const scuNum = parseFloat(scu) || 0;
  const investNum = parseFloat(investment) || 0;

  if (error) return <div className="panel p-6 text-sm text-danger">{error}</div>;

  return (
    <div>
      {/* Filters */}
      <div className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ore, terminal or system…"
          />
        </div>
        <div>
          <label className="label">Route type</label>
          <select className="field" value={systemFilter} onChange={(e) => setSystemFilter(e.target.value as typeof systemFilter)}>
            <option value="all">All routes</option>
            <option value="same">Same system</option>
            <option value="cross">Cross system</option>
          </select>
        </div>
        <div>
          <label className="label">Cargo (SCU)</label>
          <input
            className="field w-28"
            type="number"
            min="0"
            value={scu}
            onChange={(e) => setScu(e.target.value)}
            placeholder="e.g. 96"
          />
        </div>
        <div>
          <label className="label">Investment (UEC)</label>
          <input
            className="field w-36"
            type="number"
            min="0"
            value={investment}
            onChange={(e) => setInvestment(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="font-mono text-xs text-muted self-center">
          {loading ? "Loading…" : `${rows.length} routes`}
        </div>
      </div>

      {/* Table */}
      {!loading && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted w-6">#</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Commodity</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Buy at</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">Buy price</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted">Sell at</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">Sell price</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">Profit/SCU</th>
                <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">Margin</th>
                {scuNum > 0 && (
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted text-right">
                    Profit (max {scuNum} SCU)
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((route, i) => {
                // Cap by available stock at buy terminal
                const effectiveScu = scuNum > 0
                  ? (route.buyStockScu > 0 ? Math.min(scuNum, route.buyStockScu) : scuNum)
                  : 0;
                const totalProfit = scuNum > 0 ? Math.round(route.profitPerScu * effectiveScu) : null;
                const stockCapped = scuNum > 0 && route.buyStockScu > 0 && effectiveScu < scuNum;

                const affordableScu = investNum > 0
                  ? Math.min(Math.floor(investNum / route.buyPrice), route.buyStockScu || Infinity)
                  : null;
                const affordableProfit = affordableScu && affordableScu > 0
                  ? Math.round(route.profitPerScu * affordableScu)
                  : null;
                const isTop = i < 3;

                return (
                  <tr
                    key={`${route.commodityId}-${route.buyTerminalId}-${route.sellTerminalId}`}
                    className={`border-b border-edge/40 last:border-0 ${isTop ? "bg-quant/3" : "hover:bg-hull/50"} transition`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {i === 0 ? <span className="text-toxic font-bold">★</span> : i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-display font-semibold text-ink">{route.commodityName}</div>
                      <div className="flex gap-1 mt-0.5">
                        {route.commodityCode && (
                          <span className="font-mono text-[10px] text-muted">{route.commodityCode}</span>
                        )}
                        {!route.isSameSystem && (
                          <span className="tag border-amber/30 text-amber text-[10px]">Cross-system</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{route.buyTerminal}</div>
                      <div className="font-mono text-xs text-muted">{route.buySystem}{route.buyLocation !== "—" ? ` · ${route.buyLocation}` : ""}</div>
                      {route.buyStockScu > 0 && (
                        <div className={`font-mono text-[10px] mt-0.5 ${route.buyStockScu < 10 ? "text-danger" : route.buyStockScu < 50 ? "text-amber" : "text-quant"}`}>
                          {route.buyStockScu} SCU in stock
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {route.buyPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{route.sellTerminal}</div>
                      <div className="font-mono text-xs text-muted">{route.sellSystem}{route.sellLocation !== "—" ? ` · ${route.sellLocation}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
                      {route.sellPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-toxic">
                      +{route.profitPerScu.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-quant">
                      {route.profitMarginPct}%
                    </td>
                    {scuNum > 0 && (
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono tabular-nums font-semibold text-toxic">
                          {totalProfit !== null ? `+${totalProfit.toLocaleString()} UEC` : "—"}
                        </div>
                        {stockCapped && (
                          <div className="font-mono text-[10px] text-amber">
                            limited to {effectiveScu} SCU (stock)
                          </div>
                        )}
                        {affordableProfit !== null && investNum > 0 && (
                          <div className="font-mono text-[10px] text-muted">
                            {affordableScu} SCU affordable → +{affordableProfit.toLocaleString()}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted">
                    No routes match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p className="px-4 py-3 font-mono text-xs text-muted border-t border-edge">
              Showing top 100 of {rows.length} routes — use the search to filter further.
            </p>
          )}
        </div>
      )}

      <p className="mt-2 font-mono text-[10px] text-muted px-1">
        Live prices via UEX Corp API · ★ = best route · Cross-system routes require quantum travel
        {updatedAt && ` · Updated ${new Date(updatedAt).toLocaleTimeString()}`}
      </p>
    </div>
  );
}

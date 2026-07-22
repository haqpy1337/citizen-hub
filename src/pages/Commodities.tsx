import { useEffect, useMemo, useRef, useState } from "react";
import { getCommodities, getCommodityPrices } from "../lib/uex/endpoints";
import type { CommodityLocation, CommodityWithPrices } from "../lib/uex/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null, suffix = ""): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M" + suffix;
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K" + suffix;
  return n.toLocaleString() + suffix;
}

function calcRoi(sell: number | null, buy: number | null): number | null {
  if (sell == null || buy == null || buy === 0) return null;
  return ((sell - buy) / buy) * 100;
}

// ── Best price card ───────────────────────────────────────────────────────────

type PriceMode = "sell" | "buy";

function BestCard({
  mode,
  loc,
  price,
  active,
  onClick,
}: {
  mode: PriceMode;
  loc: CommodityLocation | null;
  price: number | null;
  active: boolean;
  onClick: () => void;
}) {
  const isSell = mode === "sell";
  const label  = isSell ? "Best Sell" : "Best Buy";
  const verb   = isSell ? "Sell here" : "Buy here";
  const accent = isSell ? "text-quant border-quant/40 bg-quant/[0.06]" : "text-amber border-amber/40 bg-amber/[0.06]";
  const accentLight = isSell ? "text-quant" : "text-amber";

  return (
    <button
      onClick={onClick}
      className={[
        "panel flex-1 p-4 text-left transition-all",
        active ? (isSell ? "ring-1 ring-quant/60 bg-quant/[0.06]" : "ring-1 ring-amber/60 bg-amber/[0.06]") : "hover:bg-hull/60",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-mono uppercase tracking-widest ${active ? accentLight : "text-muted/70"}`}>
          {label}
        </span>
        {active && <span className={`text-[9px] font-mono ${accentLight} border ${accent} px-1.5 py-0.5`}>Active filter</span>}
      </div>

      {loc ? (
        <>
          <p className={`text-xl font-bold font-mono tabular-nums mb-1 ${isSell ? "text-quant" : "text-amber"}`}>
            {fmt(price)} <span className="text-[11px] font-normal text-muted">aUEC / SCU</span>
          </p>
          <p className="text-sm font-semibold text-ink leading-tight mb-0.5">{loc.terminalName}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {loc.system  && <span className="text-[10px] font-mono text-muted">{loc.system}</span>}
            {loc.station && <span className="text-[10px] font-mono text-muted/60">{loc.station}</span>}
            {loc.orbit   && <span className="text-[10px] font-mono text-muted/50">{loc.orbit}</span>}
            {loc.faction && <span className="text-[10px] font-mono text-muted/50">{loc.faction}</span>}
          </div>
          {isSell ? (
            loc.scuSellAvg != null && (
              <p className="text-[10px] font-mono text-muted/50 mt-1.5">
                Avg stock {fmt(loc.scuSellAvg)} SCU
                {loc.scuSellMin != null && loc.scuSellMax != null && ` · ${fmt(loc.scuSellMin)}–${fmt(loc.scuSellMax)}`}
              </p>
            )
          ) : (
            loc.scuBuyAvg != null && (
              <p className="text-[10px] font-mono text-muted/50 mt-1.5">
                Demand {fmt(loc.scuBuyAvg)} SCU
                {loc.scuBuyMin != null && loc.scuBuyMax != null && ` · ${fmt(loc.scuBuyMin)}–${fmt(loc.scuBuyMax)}`}
              </p>
            )
          )}
          <p className={`text-[10px] font-mono mt-2 ${accentLight} opacity-70`}>{verb} · click to filter ↓</p>
        </>
      ) : (
        <p className="text-sm text-muted/40 mt-2">No data</p>
      )}
    </button>
  );
}

// ── Location table ────────────────────────────────────────────────────────────

const TH = "px-3 py-2.5 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap select-none text-muted";

function LocationTable({
  locations,
  mode,
  bestSell,
  bestBuy,
}: {
  locations: CommodityLocation[];
  mode: "all" | "sell" | "buy";
  bestSell: number | null;
  bestBuy: number | null;
}) {
  const filtered = useMemo(() => {
    const locs = mode === "sell"
      ? locations.filter(l => l.priceSell != null)
      : mode === "buy"
        ? locations.filter(l => l.priceBuy != null)
        : locations;
    return [...locs].sort((a, b) =>
      mode === "buy"
        ? (a.priceBuy ?? Infinity) - (b.priceBuy ?? Infinity)
        : (b.priceSell ?? -1) - (a.priceSell ?? -1)
    );
  }, [locations, mode]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-muted text-sm">
          {mode === "sell" ? "No sell locations." : mode === "buy" ? "No buy locations." : "No price data."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 [scrollbar-width:thin]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-edge sticky top-0 bg-panel z-10">
            <th className={`${TH} text-left`}>Terminal</th>
            <th className={`${TH} text-left`}>System</th>
            <th className={`${TH} text-left`}>Location</th>
            <th className={`${TH} text-left`}>Orbit</th>
            <th className={`${TH} text-left`}>Faction</th>
            <th className={`${TH} text-right text-quant`}>Sell / SCU</th>
            <th className={`${TH} text-right`}>Sell Stock ø</th>
            <th className={`${TH} text-right text-amber`}>Buy / SCU</th>
            <th className={`${TH} text-right`}>Buy Demand ø</th>
            <th className={`${TH} text-right`}>ROI</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((loc, i) => {
            const topSell = loc.priceSell != null && loc.priceSell === bestSell;
            const topBuy  = loc.priceBuy  != null && loc.priceBuy  === bestBuy;
            const roi     = calcRoi(loc.priceSell, loc.priceBuy);
            return (
              <tr key={i} className={[
                "border-b border-edge/20 transition-colors",
                topSell || topBuy ? "bg-quant/[0.04]" : "hover:bg-hull/40",
              ].join(" ")}>
                <td className="px-3 py-2 font-medium text-ink">{loc.terminalName}</td>
                <td className="px-3 py-2 text-ink/70">{loc.system ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{loc.station ?? "—"}</td>
                <td className="px-3 py-2 text-muted/60">{loc.orbit ?? "—"}</td>
                <td className="px-3 py-2 text-muted/60">{loc.faction ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums font-mono">
                  {loc.priceSell != null
                    ? <span className={topSell ? "text-quant font-bold" : "text-ink"}>
                        {loc.priceSell.toLocaleString()}
                        {topSell && <span className="ml-1 text-[8px] opacity-50">★</span>}
                      </span>
                    : <span className="text-muted/30">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono text-muted/60 text-[10px]">
                  {loc.scuSellAvg != null
                    ? <span title={`${fmt(loc.scuSellMin)}–${fmt(loc.scuSellMax)} SCU`}>{fmt(loc.scuSellAvg)} SCU</span>
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono">
                  {loc.priceBuy != null
                    ? <span className={topBuy ? "text-amber font-bold" : "text-ink"}>
                        {loc.priceBuy.toLocaleString()}
                      </span>
                    : <span className="text-muted/30">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono text-muted/60 text-[10px]">
                  {loc.scuBuyAvg != null
                    ? <span title={`${fmt(loc.scuBuyMin)}–${fmt(loc.scuBuyMax)} SCU`}>{fmt(loc.scuBuyAvg)} SCU</span>
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-mono">
                  {roi != null
                    ? <span className={roi >= 0 ? "text-quant" : "text-danger"}>{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</span>
                    : <span className="text-muted/25">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Commodities() {
  const [allComm, setAllComm]     = useState<CommodityWithPrices[]>([]);
  const [search, setSearch]       = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected]   = useState<CommodityWithPrices | null>(null);
  const [priceData, setPriceData] = useState<{
    locations: CommodityLocation[];
    bestSell: number | null;
    bestBuy: number | null;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [tableMode, setTableMode] = useState<"all" | "sell" | "buy">("all");
  const fetchingRef = useRef<number>(0);

  // Load commodity list once
  useEffect(() => {
    getCommodities()
      .then(data => { setAllComm(data); if (data.length) setSelected(data[0]); })
      .finally(() => setListLoading(false));
  }, []);

  // Load prices when selected commodity changes
  useEffect(() => {
    if (!selected) return;
    const seq = ++fetchingRef.current;
    setPriceData(null);
    setPriceLoading(true);
    setTableMode("all");
    getCommodityPrices(selected.id).then(data => {
      if (seq !== fetchingRef.current) return; // stale
      setPriceData(data);
    }).finally(() => {
      if (seq === fetchingRef.current) setPriceLoading(false);
    });
  }, [selected]);

  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allComm;
    return allComm.filter(c =>
      c.name.toLowerCase().includes(q) || (c.code?.toLowerCase() ?? "").includes(q)
    );
  }, [allComm, search]);

  // Best buy/sell locations
  const bestSellLoc = priceData?.locations.reduce<CommodityLocation | null>((best, l) =>
    l.priceSell != null && (best == null || l.priceSell > (best.priceSell ?? 0)) ? l : best
  , null) ?? null;
  const bestBuyLoc = priceData?.locations.reduce<CommodityLocation | null>((best, l) =>
    l.priceBuy != null && (best == null || l.priceBuy < (best.priceBuy ?? Infinity)) ? l : best
  , null) ?? null;

  function toggleMode(m: "sell" | "buy") {
    setTableMode(prev => prev === m ? "all" : m);
  }

  return (
    <div className="flex gap-3" style={{ height: "100%" }}>

      {/* ── Left: commodity list ── */}
      <div className="panel flex flex-col min-h-0 shrink-0" style={{ width: 220 }}>
        {/* Search */}
        <div className="px-3 pt-3 pb-2 border-b border-edge shrink-0">
          <input
            className="field text-xs w-full"
            placeholder="Search commodity…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {!listLoading && (
            <p className="text-[9px] font-mono text-muted/40 mt-1.5 px-0.5">
              {filteredList.length} of {allComm.length} commodities
            </p>
          )}
        </div>

        {listLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 [scrollbar-width:thin]">
            {filteredList.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={[
                  "w-full text-left px-3 py-2 border-b border-edge/20 transition-colors",
                  selected?.id === c.id ? "bg-quant/10" : "hover:bg-hull/50",
                ].join(" ")}
              >
                <p className={`text-[11px] font-medium leading-tight ${selected?.id === c.id ? "text-quant" : "text-ink"}`}>
                  {c.name}
                </p>
                {c.code && <p className="text-[9px] font-mono text-muted/50">{c.code}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: detail ── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-2">
        {!selected ? (
          <div className="panel flex-1 flex items-center justify-center">
            <p className="text-muted text-sm">Select a commodity.</p>
          </div>
        ) : (
          <>
            {/* Commodity header */}
            <div className="flex items-center gap-3 shrink-0">
              <div>
                <h1 className="text-lg font-bold text-ink leading-tight">{selected.name}</h1>
                {selected.code && (
                  <span className="text-[10px] font-mono text-muted">{selected.code}</span>
                )}
              </div>
              {priceData && (
                <div className="flex items-center gap-3 ml-auto text-[10px] font-mono text-muted/50">
                  {priceData.locations.length > 0 && (
                    <>
                      <span>{priceData.locations.length} locations</span>
                      {calcRoi(priceData.bestSell, priceData.bestBuy) != null && (
                        <span>
                          ROI{" "}
                          <span className={calcRoi(priceData.bestSell, priceData.bestBuy)! >= 0 ? "text-quant" : "text-danger"}>
                            {calcRoi(priceData.bestSell, priceData.bestBuy)! >= 0 ? "+" : ""}
                            {calcRoi(priceData.bestSell, priceData.bestBuy)!.toFixed(1)}%
                          </span>
                        </span>
                      )}
                    </>
                  )}
                  <span className="text-muted/30">UEX Corp</span>
                </div>
              )}
            </div>

            {priceLoading ? (
              <div className="flex items-center gap-3 justify-center flex-1">
                <div className="w-6 h-6 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
                <span className="text-sm font-mono text-muted">Loading prices…</span>
              </div>
            ) : !priceData || priceData.locations.length === 0 ? (
              <div className="panel flex-1 flex items-center justify-center">
                <p className="text-muted text-sm">No price data for {selected.name}.</p>
              </div>
            ) : (
              <>
                {/* Best cards — Buy left, Sell right */}
                <div className="flex gap-2 shrink-0">
                  <BestCard
                    mode="buy"
                    loc={bestBuyLoc}
                    price={priceData.bestBuy}
                    active={tableMode === "buy"}
                    onClick={() => toggleMode("buy")}
                  />
                  <BestCard
                    mode="sell"
                    loc={bestSellLoc}
                    price={priceData.bestSell}
                    active={tableMode === "sell"}
                    onClick={() => toggleMode("sell")}
                  />
                </div>

                {/* Table header with mode filter */}
                <div className="flex items-center gap-2 shrink-0">
                  <p className="eyebrow">
                    {tableMode === "sell" ? "Sell Locations" : tableMode === "buy" ? "Buy Locations" : "All Locations"}
                  </p>
                  <div className="flex gap-1 ml-auto">
                    {(["all", "buy", "sell"] as const).map(m => (
                      <button key={m} onClick={() => setTableMode(m)}
                        className={["text-[10px] font-mono px-2.5 py-1 border transition-all font-semibold",
                          tableMode === m
                            ? m === "buy"  ? "border-amber  text-amber  bg-amber/10"
                            : m === "sell" ? "border-quant  text-quant  bg-quant/10"
                            :                "border-muted  text-ink    bg-hull/60"
                            : "border-edge/60 text-muted/60 hover:border-edge hover:text-muted"
                        ].join(" ")}>
                        {m === "all" ? "All" : m === "sell" ? "Sell" : "Buy"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location table */}
                <div className="panel flex-1 min-h-0 flex flex-col overflow-hidden">
                  <LocationTable
                    locations={priceData.locations}
                    mode={tableMode}
                    bestSell={priceData.bestSell}
                    bestBuy={priceData.bestBuy}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

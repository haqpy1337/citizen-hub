import { useEffect, useMemo, useState } from "react";
import { getCommoditiesWithPrices } from "../lib/uex/endpoints";
import type { CommodityWithPrices } from "../lib/uex/types";

type ListSort = "name" | "sell" | "roi";
type LocSort  = "sell" | "buy";

// ── helpers ───────────────────────────────────────────────────────────────────

function calcRoi(bestSell: number | null, bestBuy: number | null): number | null {
  if (bestSell == null || bestBuy == null || bestBuy === 0) return null;
  return ((bestSell - bestBuy) / bestBuy) * 100;
}

function fmtPrice(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function RoiBadge({ value, className = "" }: { value: number | null; className?: string }) {
  if (value == null) return <span className={`text-muted/30 ${className}`}>—</span>;
  const pos = value >= 0;
  return (
    <span className={`${pos ? "text-quant" : "text-danger"} ${className}`}>
      {pos ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

const TH = "px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest whitespace-nowrap select-none";

function SortTh({ label, col, sort, dir, onSort, right }: {
  label: string; col: string; sort: string; dir: 1 | -1;
  onSort: (c: string) => void; right?: boolean;
}) {
  const active = sort === col;
  return (
    <th onClick={() => onSort(col)} className={[
      TH, right ? "text-right" : "text-left",
      "cursor-pointer transition-colors",
      active ? "text-quant" : "text-muted hover:text-ink",
    ].join(" ")}>
      {label}
      <span className="ml-0.5 opacity-50 text-[8px]">
        {active ? (dir === -1 ? "▾" : "▴") : "⇅"}
      </span>
    </th>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Commodities() {
  const [all, setAll]             = useState<CommodityWithPrices[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<CommodityWithPrices | null>(null);
  const [listSort, setListSort]   = useState<ListSort>("sell");
  const [listDir, setListDir]     = useState<1 | -1>(-1);
  const [sysFilter, setSysFilter] = useState("all");
  const [locSort, setLocSort]     = useState<LocSort>("sell");
  const [scu, setScu]             = useState("100");

  useEffect(() => {
    getCommoditiesWithPrices()
      .then(data => {
        setAll(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const systems = useMemo(() => {
    if (!selected) return [];
    const s = new Set<string>();
    selected.locations.forEach(l => { if (l.system) s.add(l.system); });
    return ["all", ...Array.from(s).sort()];
  }, [selected]);

  function toggleSort(k: ListSort) {
    if (listSort === k) setListDir(d => (d === 1 ? -1 : 1));
    else { setListSort(k); setListDir(-1); }
  }

  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return all
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.code?.toLowerCase() ?? "").includes(q))
      .sort((a, b) => {
        const diff =
          listSort === "name" ? a.name.localeCompare(b.name) :
          listSort === "sell" ? (a.bestSell ?? -1) - (b.bestSell ?? -1) :
          (calcRoi(a.bestSell, a.bestBuy) ?? -Infinity) - (calcRoi(b.bestSell, b.bestBuy) ?? -Infinity);
        return diff * listDir;
      });
  }, [all, search, listSort, listDir]);

  const locations = useMemo(() => {
    if (!selected) return [];
    const locs = sysFilter === "all"
      ? selected.locations
      : selected.locations.filter(l => l.system === sysFilter);
    return [...locs].sort((a, b) =>
      locSort === "sell"
        ? (b.priceSell ?? -1) - (a.priceSell ?? -1)
        : (a.priceBuy ?? Infinity) - (b.priceBuy ?? Infinity)
    );
  }, [selected, sysFilter, locSort]);

  // Calculator
  const qty        = Math.max(0, parseFloat(scu) || 0);
  const selRoi     = selected ? calcRoi(selected.bestSell, selected.bestBuy) : null;
  const profit     = selected?.bestSell != null && selected?.bestBuy != null
    ? (selected.bestSell - selected.bestBuy) * qty
    : selected?.bestSell != null ? selected.bestSell * qty : null;

  return (
    <div className="flex flex-col gap-3" style={{ height: "100%" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="eyebrow">Commodities</h1>
        <input
          className="field text-xs w-44"
          placeholder="Search name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!loading && !error && (
          <span className="text-[10px] font-mono text-muted/50 ml-auto">
            {filteredList.length} commodities · UEX Corp
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-16 justify-center">
          <div className="w-6 h-6 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
          <span className="text-sm font-mono text-muted">Loading commodities…</span>
        </div>
      ) : error ? (
        <div className="panel p-10 text-center">
          <p className="text-muted text-sm">Could not load commodity data.</p>
        </div>
      ) : (
        <div className="flex gap-3 flex-1 min-h-0">

          {/* ── Left: list ── */}
          <div className="panel flex flex-col min-h-0 shrink-0" style={{ width: 210 }}>
            <div className="overflow-y-auto flex-1 [scrollbar-width:thin]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-edge sticky top-0 bg-panel z-10">
                    <SortTh label="Commodity" col="name" sort={listSort} dir={listDir} onSort={k => toggleSort(k as ListSort)} />
                    <SortTh label="Sell"      col="sell" sort={listSort} dir={listDir} onSort={k => toggleSort(k as ListSort)} right />
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => { setSelected(c); setSysFilter("all"); }}
                      className={[
                        "border-b border-edge/20 cursor-pointer transition-colors",
                        selected?.id === c.id ? "bg-quant/10" : "hover:bg-hull/50",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2">
                        <p className={selected?.id === c.id ? "text-quant font-semibold text-[11px]" : "text-ink text-[11px] font-medium"}>
                          {c.name}
                        </p>
                        {c.code && <p className="text-[9px] text-muted font-mono">{c.code}</p>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] tabular-nums">
                        {c.bestSell != null
                          ? <span className="text-quant">{fmtPrice(c.bestSell)}</span>
                          : <span className="text-muted/25">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right: detail ── */}
          {selected ? (
            <div className="flex flex-col gap-2 flex-1 min-w-0 min-h-0">

              {/* Header + Calculator — single panel */}
              <div className="panel px-4 py-3 shrink-0 flex items-center gap-5 flex-wrap">

                {/* Commodity identity */}
                <div className="shrink-0">
                  <p className="text-base font-bold text-ink leading-tight">{selected.name}</p>
                  {selected.code && <p className="text-[10px] font-mono text-muted">{selected.code}</p>}
                </div>

                <div className="w-px h-8 bg-edge/60 shrink-0" />

                {/* Key stats */}
                <div className="flex gap-5">
                  {[
                    { label: "Best Sell",  val: selected.bestSell  != null ? fmtPrice(selected.bestSell)  + " aUEC" : "—", cls: "text-quant" },
                    { label: "Best Buy",   val: selected.bestBuy   != null ? fmtPrice(selected.bestBuy)   + " aUEC" : "—", cls: "text-ink"   },
                    { label: "Locations",  val: String(selected.locations.length),                                          cls: "text-ink"   },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-[9px] font-mono uppercase tracking-widest text-muted/60">{s.label}</p>
                      <p className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${s.cls}`}>{s.val}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted/60">ROI</p>
                    <p className="text-sm font-bold font-mono mt-0.5">
                      <RoiBadge value={selRoi} />
                    </p>
                  </div>
                </div>

                <div className="w-px h-8 bg-edge/60 shrink-0 ml-auto" />

                {/* Inline calculator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-mono text-muted/60 uppercase tracking-widest">SCU</span>
                  <input
                    type="number" min="0" step="1" value={scu}
                    onChange={e => setScu(e.target.value)}
                    className="field text-xs text-right tabular-nums py-1 w-20"
                  />
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-muted/60 uppercase tracking-widest">
                      {selected.bestBuy != null ? "Profit" : "Sell Value"}
                    </p>
                    <p className={`text-sm font-bold font-mono tabular-nums ${
                      profit == null ? "text-muted" : profit >= 0 ? "text-quant" : "text-danger"
                    }`}>
                      {profit != null
                        ? (selected.bestBuy != null && profit >= 0 ? "+" : "") + fmtPrice(profit) + " aUEC"
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <div className="flex gap-1 flex-wrap">
                  {systems.map(s => (
                    <button key={s} onClick={() => setSysFilter(s)}
                      className={["text-[10px] font-mono px-2 py-0.5 border transition-all",
                        sysFilter === s ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink"
                      ].join(" ")}>
                      {s === "all" ? "All" : s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 ml-auto">
                  {(["sell", "buy"] as const).map(k => (
                    <button key={k} onClick={() => setLocSort(k)}
                      className={["text-[10px] font-mono px-2 py-0.5 border transition-all",
                        locSort === k ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink"
                      ].join(" ")}>
                      Sort: {k === "sell" ? "Best Sell" : "Best Buy"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location table */}
              <div className="panel overflow-hidden flex-1 min-h-0">
                {locations.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted text-sm">
                      No price data{sysFilter !== "all" ? ` in ${sysFilter}` : ""}.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-y-auto h-full [scrollbar-width:thin]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-edge sticky top-0 bg-panel z-10">
                          <th className={`${TH} text-left text-muted`}>Terminal</th>
                          <th className={`${TH} text-left text-muted`}>System</th>
                          <th className={`${TH} text-left text-muted`}>Location</th>
                          <th className={`${TH} text-right text-quant`}>Sell / SCU</th>
                          <th className={`${TH} text-right text-muted`}>Buy / SCU</th>
                          <th className={`${TH} text-right text-muted`}>ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((loc, i) => {
                          const topSell = loc.priceSell != null && loc.priceSell === selected.bestSell;
                          const topBuy  = loc.priceBuy  != null && loc.priceBuy  === selected.bestBuy;
                          const lRoi    = calcRoi(loc.priceSell, loc.priceBuy);
                          return (
                            <tr key={i} className={[
                              "border-b border-edge/20 transition-colors",
                              topSell || topBuy ? "bg-quant/[0.05]" : "hover:bg-hull/40",
                            ].join(" ")}>
                              <td className="px-3 py-2 text-ink font-medium">{loc.terminalName}</td>
                              <td className="px-3 py-2 text-muted">{loc.system ?? "—"}</td>
                              <td className="px-3 py-2 text-muted">{loc.station ?? "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-mono">
                                {loc.priceSell != null ? (
                                  <span className={topSell ? "text-quant font-bold" : "text-ink"}>
                                    {loc.priceSell.toLocaleString()}
                                    {topSell && <span className="ml-1 opacity-50 text-[9px]">★</span>}
                                  </span>
                                ) : <span className="text-muted/25">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-mono">
                                {loc.priceBuy != null ? (
                                  <span className={topBuy ? "text-amber font-bold" : "text-muted"}>
                                    {loc.priceBuy.toLocaleString()}
                                  </span>
                                ) : <span className="text-muted/25">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-mono">
                                <RoiBadge value={lRoi} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="panel flex-1 flex items-center justify-center">
              <p className="text-muted text-sm">Select a commodity.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

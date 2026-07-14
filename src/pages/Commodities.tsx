import { useEffect, useMemo, useState } from "react";
import { getCommoditiesWithPrices } from "../lib/uex/endpoints";
import type { CommodityWithPrices } from "../lib/uex/types";

type ListSort = "name" | "sell" | "roi";
type LocSort  = "sell" | "buy";

const TH_CLS = "px-4 py-3 font-mono text-[11px] uppercase tracking-widest whitespace-nowrap select-none";

function ColHead({
  label, onClick, active, dir, right,
}: {
  label: string; onClick?: () => void; active?: boolean; dir?: 1 | -1; right?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={[
        TH_CLS,
        right ? "text-right" : "text-left",
        onClick ? "cursor-pointer hover:text-ink" : "",
        active ? "text-quant" : "text-muted",
      ].join(" ")}
    >
      {label}
      {active && <span className="ml-1 opacity-60 text-[9px]">{dir === -1 ? "▾" : "▴"}</span>}
      {!active && onClick && <span className="ml-1 opacity-25 text-[9px]">⇅</span>}
    </th>
  );
}

function roi(c: { bestSell: number | null; bestBuy: number | null }): number | null {
  if (c.bestSell == null || c.bestBuy == null || c.bestBuy === 0) return null;
  return ((c.bestSell - c.bestBuy) / c.bestBuy) * 100;
}

function RoiBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted/30">—</span>;
  const cls = value >= 0 ? "text-quant" : "text-danger";
  return <span className={cls}>{value >= 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

// ── Profit Calculator ─────────────────────────────────────────────────────────

function ProfitCalc({ commodity }: { commodity: CommodityWithPrices }) {
  const [scu, setScu] = useState("1");
  const qty  = Math.max(0, parseFloat(scu) || 0);
  const r    = roi(commodity);

  const canTrade = commodity.bestBuy != null && commodity.bestSell != null;
  const buyCost  = canTrade ? (commodity.bestBuy! * qty) : null;
  const sellRev  = commodity.bestSell != null ? commodity.bestSell * qty : null;
  const profit   = (buyCost != null && sellRev != null) ? sellRev - buyCost : null;

  const fmt = (n: number) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(2) + "M"
    : n >= 1_000 ? (n / 1_000).toFixed(1) + "K"
    : n.toLocaleString();

  return (
    <div className="panel px-5 py-3 flex flex-col gap-3 shrink-0">
      <div className="flex items-center gap-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted shrink-0">ROI Calculator</p>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-mono text-muted">SCU</span>
          <input
            type="number"
            min="0"
            step="1"
            value={scu}
            onChange={e => setScu(e.target.value)}
            className="field text-xs text-right tabular-nums w-20 py-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 border-t border-edge/40 pt-3">
        <div>
          <p className="text-[10px] font-mono text-muted/60 uppercase tracking-widest mb-1">Buy / SCU</p>
          <p className="text-sm font-mono font-bold text-ink tabular-nums">
            {commodity.bestBuy != null ? commodity.bestBuy.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-muted/60 uppercase tracking-widest mb-1">Sell / SCU</p>
          <p className="text-sm font-mono font-bold text-quant tabular-nums">
            {commodity.bestSell != null ? commodity.bestSell.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-muted/60 uppercase tracking-widest mb-1">ROI</p>
          <p className="text-sm font-mono font-bold tabular-nums">
            <RoiBadge value={r} />
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-muted/60 uppercase tracking-widest mb-1">
            {canTrade ? `Profit (${qty} SCU)` : `Value (${qty} SCU)`}
          </p>
          <p className={["text-sm font-mono font-bold tabular-nums",
            profit == null ? "text-ink"
            : profit >= 0 ? "text-quant" : "text-danger"
          ].join(" ")}>
            {profit != null
              ? (profit >= 0 ? "+" : "") + fmt(profit) + " aUEC"
              : sellRev != null
                ? fmt(sellRev) + " aUEC"
                : "—"
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Commodities() {
  const [all, setAll]           = useState<CommodityWithPrices[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<CommodityWithPrices | null>(null);
  const [listSort, setListSort] = useState<ListSort>("sell");
  const [listDir, setListDir]   = useState<1 | -1>(-1);
  const [sysFilter, setSysFilter] = useState("all");
  const [locSort, setLocSort]   = useState<LocSort>("sell");

  useEffect(() => {
    getCommoditiesWithPrices()
      .then(data => { setAll(data); if (data.length > 0) setSelected(data[0]); })
      .finally(() => setLoading(false));
  }, []);

  const systems = useMemo(() => {
    const s = new Set<string>();
    all.forEach(c => c.locations.forEach(l => { if (l.system) s.add(l.system); }));
    return ["all", ...Array.from(s).sort()];
  }, [all]);

  function toggleListSort(k: ListSort) {
    if (listSort === k) setListDir(d => (d === 1 ? -1 : 1) as 1 | -1);
    else { setListSort(k); setListDir(-1); }
  }

  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return all
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.code?.toLowerCase().includes(q) ?? false))
      .sort((a, b) => {
        const roiA = roi(a) ?? -Infinity;
        const roiB = roi(b) ?? -Infinity;
        const diff =
          listSort === "name" ? a.name.localeCompare(b.name) :
          listSort === "sell" ? (a.bestSell ?? -1) - (b.bestSell ?? -1) :
                                roiA - roiB;
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
        : (a.priceBuy  ?? Infinity) - (b.priceBuy ?? Infinity)
    );
  }, [selected, sysFilter, locSort]);

  const selectedRoi = selected ? roi(selected) : null;

  return (
    <div className="flex flex-col gap-4" style={{ height: "100%" }}>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <h1 className="eyebrow">Commodities</h1>
        <input
          className="field text-xs w-48 ml-2"
          placeholder="Search commodity or code…"
          value={search}
          onChange={e => { setSearch(e.target.value); }}
        />
        <span className="ml-auto text-[11px] font-mono text-muted">
          {filteredList.length} of {all.length} · UEX Corp data
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Left: commodity list ──────────────────────────────────── */}
          <div className="panel flex flex-col overflow-hidden" style={{ width: 270, flexShrink: 0 }}>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-edge sticky top-0 bg-panel z-10">
                    <ColHead label="Commodity" onClick={() => toggleListSort("name")} active={listSort === "name"} dir={listDir} />
                    <ColHead label="Sell"  onClick={() => toggleListSort("sell")} active={listSort === "sell"} dir={listDir} right />
                    <ColHead label="ROI"   onClick={() => toggleListSort("roi")}  active={listSort === "roi"}  dir={listDir} right />
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">No results.</td></tr>
                  ) : filteredList.map(c => {
                    const r = roi(c);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => { setSelected(c); setSysFilter("all"); }}
                        className={[
                          "border-b border-edge/25 cursor-pointer transition-colors",
                          selected?.id === c.id ? "bg-quant/10" : "hover:bg-hull/40",
                        ].join(" ")}
                      >
                        <td className="px-4 py-2.5">
                          <p className={selected?.id === c.id ? "text-quant font-semibold" : "text-ink font-medium"}>
                            {c.name}
                          </p>
                          {c.code && <p className="text-[10px] text-muted font-mono">{c.code}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-mono">
                          {c.bestSell != null
                            ? <span className="text-quant">{c.bestSell.toLocaleString()}</span>
                            : <span className="text-muted/30">—</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-mono">
                          <RoiBadge value={r} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right: price details ──────────────────────────────────── */}
          {selected ? (
            <div className="flex flex-col gap-3 flex-1 min-w-0 min-h-0">

              {/* Commodity summary bar */}
              <div className="panel px-5 py-3 flex items-center gap-6 shrink-0">
                <div>
                  <p className="text-sm font-bold text-ink leading-tight">{selected.name}</p>
                  {selected.code && <p className="text-[11px] font-mono text-muted mt-0.5">{selected.code}</p>}
                </div>
                <div className="flex gap-5 ml-auto text-right">
                  {[
                    { label: "Best Sell",  value: selected.bestSell,         cls: "text-quant", suffix: " aUEC" },
                    { label: "Best Buy",   value: selected.bestBuy,          cls: "text-ink",   suffix: " aUEC" },
                    { label: "ROI",        value: selectedRoi,               cls: selectedRoi == null ? "text-muted" : selectedRoi >= 0 ? "text-quant" : "text-danger", suffix: selectedRoi != null ? "%" : "" },
                    { label: "Locations",  value: selected.locations.length, cls: "text-ink",   suffix: "" },
                  ].map(({ label, value, cls, suffix }) => (
                    <div key={label}>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</p>
                      <p className={`text-sm font-bold font-mono mt-0.5 ${cls}`}>
                        {value != null
                          ? label === "ROI"
                            ? (selectedRoi! >= 0 ? "+" : "") + selectedRoi!.toFixed(1) + suffix
                            : typeof value === "number"
                              ? value.toLocaleString() + suffix
                              : String(value)
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ROI Profit Calculator */}
              <ProfitCalc commodity={selected} />

              {/* System filter + sort */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="flex gap-1 flex-wrap">
                  {systems.map(s => (
                    <button
                      key={s}
                      onClick={() => setSysFilter(s)}
                      className={[
                        "text-[10px] font-mono px-2 py-1 border transition-all",
                        sysFilter === s
                          ? "border-quant text-quant bg-quant/10"
                          : "border-edge text-muted hover:text-ink",
                      ].join(" ")}
                    >
                      {s === "all" ? "All Systems" : s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 ml-auto">
                  {(["sell", "buy"] as const).map(k => (
                    <button
                      key={k}
                      onClick={() => setLocSort(k)}
                      className={[
                        "text-[10px] font-mono px-2 py-1 border transition-all",
                        locSort === k
                          ? "border-quant text-quant bg-quant/10"
                          : "border-edge text-muted hover:text-ink",
                      ].join(" ")}
                    >
                      {k === "sell" ? "Best Sell ▾" : "Best Buy ▴"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location table */}
              {locations.length === 0 ? (
                <div className="panel flex-1 flex items-center justify-center">
                  <p className="text-muted text-sm">
                    No price data for {selected.name}
                    {sysFilter !== "all" ? ` in ${sysFilter}` : ""}.
                  </p>
                </div>
              ) : (
                <div className="panel overflow-hidden flex-1">
                  <div className="overflow-y-auto h-full">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-edge sticky top-0 bg-panel z-10">
                          <ColHead label="Terminal" />
                          <ColHead label="System" />
                          <ColHead label="Station / Planet" />
                          <th className={`${TH_CLS} text-right text-quant`}>Sell / SCU</th>
                          <th className={`${TH_CLS} text-right text-muted`}>Buy / SCU</th>
                          <th className={`${TH_CLS} text-right text-muted`}>Loc. ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((loc, i) => {
                          const topSell = loc.priceSell != null && loc.priceSell === selected.bestSell;
                          const topBuy  = loc.priceBuy  != null && loc.priceBuy  === selected.bestBuy;
                          const locRoi  = (loc.priceSell != null && loc.priceBuy != null && loc.priceBuy > 0)
                            ? ((loc.priceSell - loc.priceBuy) / loc.priceBuy) * 100
                            : null;
                          return (
                            <tr
                              key={i}
                              className={[
                                "border-b border-edge/25 transition-colors",
                                topSell || topBuy ? "bg-quant/[0.04]" : "hover:bg-hull/30",
                              ].join(" ")}
                            >
                              <td className="px-4 py-2.5 text-ink font-medium">{loc.terminalName}</td>
                              <td className="px-4 py-2.5 text-muted">{loc.system ?? "—"}</td>
                              <td className="px-4 py-2.5 text-muted">{loc.station ?? "—"}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                                {loc.priceSell != null ? (
                                  <span className={topSell ? "text-quant font-bold" : "text-ink"}>
                                    {loc.priceSell.toLocaleString()}
                                    {topSell && <span className="ml-1 text-[9px] opacity-60">★</span>}
                                  </span>
                                ) : <span className="text-muted/30">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                                {loc.priceBuy != null ? (
                                  <span className={topBuy ? "text-amber font-bold" : "text-muted"}>
                                    {loc.priceBuy.toLocaleString()}
                                  </span>
                                ) : <span className="text-muted/30">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-mono">
                                <RoiBadge value={locRoi} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel flex-1 flex items-center justify-center">
              <p className="text-muted text-sm">Select a commodity from the list.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

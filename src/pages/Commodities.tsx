import { useEffect, useState } from "react";
import { getCommoditiesWithPrices } from "../lib/uex/endpoints";
import type { CommodityWithPrices } from "../lib/uex/types";

type SortKey = "name" | "sell" | "buy" | "locs";

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString() + " aUEC";
}

export default function Commodities() {
  const [commodities, setCommodities] = useState<CommodityWithPrices[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<CommodityWithPrices | null>(null);
  const [sort, setSort]               = useState<SortKey>("sell");
  const [sortDir, setSortDir]         = useState<1 | -1>(-1);

  useEffect(() => {
    getCommoditiesWithPrices()
      .then(data => {
        setCommodities(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir(d => (d === 1 ? -1 : 1) as 1 | -1);
    else { setSort(key); setSortDir(-1); }
  }

  function sortedFiltered(): CommodityWithPrices[] {
    const q = search.toLowerCase();
    const filtered = commodities.filter(c =>
      c.name.toLowerCase().includes(q) || (c.code?.toLowerCase().includes(q) ?? false)
    );
    return filtered.sort((a, b) => {
      let diff = 0;
      if (sort === "name") diff = a.name.localeCompare(b.name);
      else if (sort === "sell") diff = (a.bestSell ?? -1) - (b.bestSell ?? -1);
      else if (sort === "buy")  diff = (a.bestBuy  ?? -1) - (b.bestBuy  ?? -1);
      else if (sort === "locs") diff = a.locations.length - b.locations.length;
      return diff * sortDir;
    });
  }

  const list = sortedFiltered();

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sort === k;
    return (
      <th
        onClick={() => toggleSort(k)}
        className={[
          "label text-left px-4 py-3 cursor-pointer select-none whitespace-nowrap",
          active ? "text-quant" : "hover:text-ink",
        ].join(" ")}
      >
        {label}
        <span className="ml-1 text-[10px] opacity-60">
          {active ? (sortDir === -1 ? "▾" : "▴") : "⇅"}
        </span>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="eyebrow">Commodities</h1>
        <span className="text-xs text-muted font-mono">
          {list.length} commodities · UEX Corp data
        </span>
      </div>

      <input
        className="field max-w-sm"
        placeholder="Search commodity or code…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 min-h-0 flex-1">

          {/* Left: commodity list */}
          <div className="panel overflow-hidden flex flex-col w-72 shrink-0">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-panel z-10">
                  <tr className="border-b border-edge">
                    <SortTh label="Commodity" k="name" />
                    <SortTh label="Best Sell" k="sell" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">No results.</td></tr>
                  ) : list.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={[
                        "border-b border-edge/40 cursor-pointer transition-colors",
                        selected?.id === c.id ? "bg-quant/10" : "hover:bg-hull/40",
                      ].join(" ")}
                    >
                      <td className="px-4 py-2.5">
                        <p className={["text-xs font-medium", selected?.id === c.id ? "text-quant" : "text-ink"].join(" ")}>
                          {c.name}
                        </p>
                        {c.code && <p className="text-[10px] text-muted font-mono">{c.code}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                        {c.bestSell != null
                          ? <span className="text-quant font-mono">{c.bestSell.toLocaleString()}</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: locations for selected commodity */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {selected ? (
              <>
                <div className="panel p-4 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">{selected.name}</p>
                    {selected.code && <p className="text-xs text-muted font-mono">{selected.code}</p>}
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="label mb-0.5">Best Sell</p>
                      <p className="text-sm font-mono font-bold text-quant">{fmt(selected.bestSell)}</p>
                    </div>
                    <div>
                      <p className="label mb-0.5">Best Buy</p>
                      <p className="text-sm font-mono font-bold text-ink">{fmt(selected.bestBuy)}</p>
                    </div>
                    <div>
                      <p className="label mb-0.5">Locations</p>
                      <p className="text-sm font-mono text-ink">{selected.locations.length}</p>
                    </div>
                  </div>
                </div>

                {selected.locations.length === 0 ? (
                  <div className="panel p-8 flex items-center justify-center">
                    <p className="text-muted text-sm">No price data available for {selected.name}.</p>
                  </div>
                ) : (
                  <div className="panel overflow-hidden flex-1">
                    <div className="overflow-y-auto h-full">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-panel z-10">
                          <tr className="border-b border-edge">
                            <th className="label text-left px-4 py-3">Terminal</th>
                            <th className="label text-left px-4 py-3">System</th>
                            <th className="label text-left px-4 py-3">Station</th>
                            <th className="label text-right px-4 py-3">Sell (aUEC)</th>
                            <th className="label text-right px-4 py-3">Buy (aUEC)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.locations.map((loc, i) => (
                            <tr key={i} className="border-b border-edge/40 hover:bg-hull/30 transition-colors">
                              <td className="px-4 py-2.5 text-ink text-xs font-medium">{loc.terminalName}</td>
                              <td className="px-4 py-2.5 text-muted text-xs">{loc.system ?? "—"}</td>
                              <td className="px-4 py-2.5 text-muted text-xs">{loc.station ?? "—"}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                                {loc.priceSell != null
                                  ? <span className="text-quant font-mono font-semibold">{loc.priceSell.toLocaleString()}</span>
                                  : <span className="text-muted">—</span>
                                }
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                                {loc.priceBuy != null
                                  ? <span className="text-ink font-mono">{loc.priceBuy.toLocaleString()}</span>
                                  : <span className="text-muted">—</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="panel flex-1 flex items-center justify-center">
                <p className="text-muted text-sm">Select a commodity to see prices.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

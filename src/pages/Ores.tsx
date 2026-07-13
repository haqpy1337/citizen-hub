import { useEffect, useState } from "react";
import { getOreCommodities } from "../lib/uex/endpoints";
import type { OreCommodity } from "../lib/uex/types";

export default function Ores() {
  const [ores, setOres] = useState<OreCommodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getOreCommodities()
      .then(setOres)
      .finally(() => setLoading(false));
  }, []);

  const filtered = ores.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="eyebrow">Ore Prices</h1>

      <div className="flex gap-3 items-center">
        <input
          className="field max-w-xs"
          placeholder="Search ore…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted">{filtered.length} ores</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="label text-left px-4 py-3">Ore</th>
                <th className="label text-right px-4 py-3">Price / SCU</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                    No ores found.
                  </td>
                </tr>
              ) : filtered.map(ore => (
                <tr key={ore.id} className="border-b border-edge/50 hover:bg-hull/30 transition-colors">
                  <td className="px-4 py-3 text-ink font-medium">{ore.name}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {ore.pricePerScu != null
                      ? <span className="text-quant">{ore.pricePerScu.toLocaleString()} aUEC</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { getRefineryStations } from "../lib/uex/endpoints";
import { formatDuration } from "../lib/format";
import type { RefineryStation } from "../lib/uex/types";

export default function Refineries() {
  const [stations, setStations] = useState<RefineryStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRefineryStations()
      .then(setStations)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="eyebrow">Refineries</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : stations.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-muted text-sm">No refinery data available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map(station => (
            <div key={station.id} className="panel p-4 flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{station.name}</p>
                {station.system && (
                  <p className="text-xs text-muted">{station.system}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-edge">
                <div>
                  <p className="label mb-1">Queue</p>
                  <p className="text-sm font-mono text-ink">
                    {station.queueSec != null ? formatDuration(station.queueSec) : "—"}
                  </p>
                </div>
                <div>
                  <p className="label mb-1">Best Yield</p>
                  <p className={[
                    "text-sm font-mono",
                    station.bestYield != null && station.bestYield >= 0
                      ? "text-quant"
                      : "text-danger",
                  ].join(" ")}>
                    {station.bestYield != null
                      ? `${station.bestYield > 0 ? "+" : ""}${station.bestYield}%`
                      : "—"
                    }
                  </p>
                </div>
              </div>

              {station.yields.length > 0 && (
                <div className="flex flex-col gap-1 pt-1 border-t border-edge">
                  <p className="label mb-1">Yields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {station.yields.map((y, i) => (
                      <span
                        key={i}
                        title={`${y.name}: ${y.yieldPercent != null ? (y.yieldPercent > 0 ? "+" : "") + y.yieldPercent + "%" : "unknown"}`}
                        className={[
                          "tag text-[10px]",
                          y.yieldPercent != null && y.yieldPercent < 0
                            ? "bg-danger/20 text-danger"
                            : "bg-quant/20 text-quant",
                        ].join(" ")}
                      >
                        {y.name}
                        {y.yieldPercent != null && (
                          <span className="ml-1 opacity-70">
                            {y.yieldPercent > 0 ? "+" : ""}{y.yieldPercent}%
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

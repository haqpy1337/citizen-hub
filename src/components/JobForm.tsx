"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OreCombobox from "./OreCombobox";
import { parseDurationInput, formatDuration } from "@/lib/format";
import type { OreCommodity, RefineryMethod, RefineryStation } from "@/lib/clientTypes";
import { getClientRefineryStations, getClientRefineryMethods, getClientOreCommodities } from "@/lib/clientUex";

interface MaterialRow {
  name: string;
  commodityId: number | null;
  quantity: string;
  unit: "SCU" | "cSCU";
  yieldPercent: string;
  liveYieldMod: number | null; // auto-filled from API, shown as hint
}

const emptyRow: MaterialRow = {
  name: "",
  commodityId: null,
  quantity: "",
  unit: "SCU",
  yieldPercent: "",
  liveYieldMod: null,
};

function formatQueueShort(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m queue`;
  return m === 0 ? `${h}h queue` : `${h}h ${m}m queue`;
}

type Group = { id: string; name: string };

export default function JobForm() {
  const router = useRouter();

  const [stations, setStations] = useState<RefineryStation[]>([]);
  const [methods, setMethods] = useState<RefineryMethod[]>([]);
  const [ores, setOres] = useState<OreCommodity[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [liveOk, setLiveOk] = useState(true);

  const [stationId, setStationId] = useState<string>("");
  const [stationName, setStationName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [method, setMethod] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [groupId, setGroupId] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([{ ...emptyRow }]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getClientRefineryStations(),
      getClientRefineryMethods(),
      getClientOreCommodities(),
      fetch("/api/groups").then((r) => r.ok ? r.json() : []),
    ])
      .then(([stations, methods, ores, groups]) => {
        setStations(stations);
        setMethods(methods);
        setOres(ores);
        setGroups(Array.isArray(groups) ? groups : []);
        if (stations.length === 0) setLiveOk(false);
      })
      .catch(() => setLiveOk(false));
  }, []);

  /** Look up the live yield modifier for an ore at the currently selected station. */
  function getLiveYieldMod(oreName: string): number | null {
    if (!stationId) return null;
    const station = stations.find((s) => String(s.id) === stationId);
    if (!station) return null;
    const entry = station.yields.find(
      (y) => y.name.toLowerCase() === oreName.toLowerCase()
    );
    return entry?.yieldPercent ?? null;
  }

  function pickStation(value: string) {
    setStationId(value);
    const st = stations.find((s) => String(s.id) === value);
    if (st) {
      setStationName(st.name);
      setSystemName(st.system ?? "");
      // Refresh live yield modifiers for all current material rows
      setMaterials((rows) =>
        rows.map((r) => {
          if (!r.name) return r;
          const entry = st.yields.find(
            (y) => y.name.toLowerCase() === r.name.toLowerCase()
          );
          const mod = entry?.yieldPercent ?? null;
          return {
            ...r,
            liveYieldMod: mod,
            yieldPercent: mod !== null ? String(mod) : r.yieldPercent,
          };
        })
      );
    } else {
      setMaterials((rows) => rows.map((r) => ({ ...r, liveYieldMod: null })));
    }
  }

  function updateRow(i: number, patch: Partial<MaterialRow>) {
    setMaterials((rows) =>
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const updated = { ...r, ...patch };
        // If ore name changed, auto-lookup the live yield mod
        if ("name" in patch) {
          const mod = getLiveYieldMod(patch.name ?? "");
          updated.liveYieldMod = mod;
          if (mod !== null) updated.yieldPercent = String(mod);
        }
        return updated;
      })
    );
  }

  function addRow() {
    setMaterials((rows) => [...rows, { ...emptyRow }]);
  }
  function removeRow(i: number) {
    setMaterials((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));
  }

  const durationSec = parseDurationInput(duration);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!stationName.trim()) return setError("Please enter a station name.");
    if (!durationSec || durationSec <= 0)
      return setError("Please enter a valid duration, e.g. '1h 30m'.");

    const parsedMaterials = materials
      .filter((m) => m.name.trim() && m.quantity.trim())
      .map((m) => ({
        name: m.name.trim(),
        commodityId: m.commodityId ?? undefined,
        quantity: Number(m.quantity),
        unit: m.unit,
        yieldPercent: m.yieldPercent ? Number(m.yieldPercent) : undefined,
      }));

    if (parsedMaterials.length === 0)
      return setError("Please add at least one material with a quantity.");

    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: stationId ? Number(stationId) : undefined,
          stationName: stationName.trim(),
          systemName: systemName.trim() || undefined,
          method: method.trim() || undefined,
          durationSec,
          note: note.trim() || undefined,
          groupId: groupId || undefined,
          materials: parsedMaterials,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      router.push("/dashboard/jobs");
      router.refresh();
    } catch {
      setError("Connection failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {!liveOk && (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
          Live data currently unavailable. You can still enter station and materials manually.
        </p>
      )}

      {/* Station */}
      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Station</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Refinery (live list)</label>
            <select
              className="field"
              value={stationId}
              onChange={(e) => pickStation(e.target.value)}
            >
              <option value="">— enter manually —</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.system ? ` · ${s.system}` : ""}
                  {s.queueSec != null ? ` · ${formatQueueShort(s.queueSec)}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Station name</label>
            <input
              className="field"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="e.g. ARC-L1 Wide Forest Station"
              required
            />
          </div>
          <div>
            <label className="label">System (optional)</label>
            <input
              className="field"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Stanton"
            />
          </div>
          <div>
            <label className="label">Refining method (optional)</label>
            <input
              className="field"
              list="methods"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="e.g. Dinyx Solventation"
            />
            <datalist id="methods">
              {methods.map((m) => (
                <option key={m.name} value={m.name} />
              ))}
            </datalist>
          </div>
        </div>
      </section>

      {/* Group */}
      {groups.length > 0 && (
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Gruppe (optional)</h2>
          <div className="mt-4">
            <label className="label">Dieser Job gehört zu</label>
            <select className="field" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">— Kein Gruppe —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Materials */}
      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Materials</h2>
          <button type="button" onClick={addRow} className="btn-ghost px-3 py-1.5 text-xs">
            + Add material
          </button>
        </div>

        {stationId && (
          <p className="mt-2 font-mono text-xs text-quant">
            ◆ Live yield modifiers from selected station will be applied automatically.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {materials.map((row, i) => (
            <div key={i} className="space-y-1">
              <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px_110px_36px]">
                <OreCombobox
                  value={row.name}
                  ores={ores}
                  placeholder="Ore, e.g. Quantanium (Raw)"
                  onChange={(name, ore) =>
                    updateRow(i, { name, commodityId: ore?.id ?? null })
                  }
                />
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Amount"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, { quantity: e.target.value })}
                />
                <select
                  className="field"
                  value={row.unit}
                  onChange={(e) => updateRow(i, { unit: e.target.value as "SCU" | "cSCU" })}
                >
                  <option value="SCU">SCU</option>
                  <option value="cSCU">cSCU</option>
                </select>
                <div className="relative">
                  <input
                    className={`field w-full pr-8 ${row.liveYieldMod !== null ? "border-quant/50" : ""}`}
                    type="number"
                    min="-100"
                    max="100"
                    step="any"
                    placeholder="% Yield mod"
                    value={row.yieldPercent}
                    onChange={(e) => updateRow(i, { yieldPercent: e.target.value, liveYieldMod: null })}
                  />
                  {row.liveYieldMod !== null && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-quant" title="Live modifier">
                      ◆
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="rounded-md border border-edge text-muted transition hover:border-danger hover:text-danger"
                  aria-label="Remove material"
                >
                  ✕
                </button>
              </div>
              {row.liveYieldMod !== null && (
                <p className="font-mono text-[11px] text-quant pl-0.5">
                  ◆ Live modifier for {row.name} at this station:{" "}
                  <strong>{row.liveYieldMod > 0 ? "+" : ""}{row.liveYieldMod}%</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Outcome estimate */}
      {(() => {
        const rows = materials.filter((m) => m.name.trim() && m.quantity.trim() && Number(m.quantity) > 0);
        if (rows.length === 0) return null;
        let totalValue = 0;
        const lines = rows.map((m) => {
          const qtyScu = m.unit === "cSCU" ? Number(m.quantity) / 100 : Number(m.quantity);
          const yieldMod = m.yieldPercent ? Number(m.yieldPercent) : 0;
          const refined = qtyScu * (100 + yieldMod) / 100;
          const ore = ores.find((o) => o.id === m.commodityId || o.name.toLowerCase() === m.name.toLowerCase());
          const price = ore?.pricePerScu ?? null;
          const value = price != null ? refined * price : null;
          if (value != null) totalValue += value;
          return { name: m.name, qtyScu, yieldMod, refined, price, value };
        });
        const hasAnyPrice = lines.some((l) => l.price != null);
        return (
          <section className="panel p-5 border-quant/30">
            <h2 className="font-display text-lg font-semibold text-quant">Geschätzter Ertrag</h2>
            <p className="text-xs text-muted mt-0.5">Yield-Mod × Menge × aktueller Verkaufspreis</p>
            <div className="mt-4 space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border-b border-edge/40 pb-2 last:border-0">
                  <span className="flex-1 text-ink">{l.name}</span>
                  <span className="font-mono text-muted text-xs">
                    {l.qtyScu.toFixed(2)} SCU
                    {l.yieldMod !== 0 && (
                      <span className={l.yieldMod > 0 ? " text-toxic" : " text-danger"}>
                        {" "}{l.yieldMod > 0 ? "+" : ""}{l.yieldMod}%
                      </span>
                    )}
                    {" → "}<span className="text-ink">{l.refined.toFixed(2)} SCU</span>
                  </span>
                  {l.price != null ? (
                    <span className="font-mono text-quant tabular-nums w-32 text-right">
                      ~{Math.round(l.value!).toLocaleString()} aUEC
                    </span>
                  ) : (
                    <span className="text-muted text-xs w-32 text-right">kein Preis</span>
                  )}
                </div>
              ))}
            </div>
            {hasAnyPrice && (
              <div className="mt-3 flex justify-between items-center border-t border-edge pt-3">
                <span className="font-mono text-xs text-muted uppercase tracking-wider">Gesamt</span>
                <span className="font-display font-bold text-quant tabular-nums">
                  ~{Math.round(totalValue).toLocaleString()} aUEC
                </span>
              </div>
            )}
          </section>
        );
      })()}

      {/* Duration + Note */}
      <section className="panel p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Processing time</label>
            <input
              className="field"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1h 30m or 01:30:00"
              required
            />
            <p className="mt-1 font-mono text-xs text-muted">
              {durationSec ? `= ${formatDuration(durationSec)}` : "Format: 1h 30m / 90m / 01:30:00"}
            </p>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. for org run"
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Start job"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

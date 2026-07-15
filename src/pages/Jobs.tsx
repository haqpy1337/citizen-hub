import { useEffect, useState } from "react";
import { useAuth, usePage } from "../App";
import { api, CreateJobInput } from "../lib/api";
import { parseDurationInput, formatDuration } from "../lib/format";
import { getRefineryStations, getRefineryMethods, getOreCommodities } from "../lib/uex/endpoints";
import type { RefineryStation, RefineryMethod, OreCommodity } from "../lib/uex/types";

interface MaterialRow {
  _key: number;
  name: string;
  quantity: string;
  unit: string;
  yieldPercent: string;
  commodityId: number | null;
}

let keyCounter = 0;
function newRow(): MaterialRow {
  return { _key: ++keyCounter, name: "", quantity: "", unit: "SCU", yieldPercent: "", commodityId: null };
}

export default function Jobs() {
  const { token } = useAuth();
  const { setPage } = usePage();

  const [stations, setStations] = useState<RefineryStation[]>([]);
  const [methods, setMethods] = useState<RefineryMethod[]>([]);
  const [ores, setOres] = useState<OreCommodity[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [stationId, setStationId] = useState<number | null>(null);
  const [stationName, setStationName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [method, setMethod] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [note, setNote] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedDuration = parseDurationInput(durationInput);

  useEffect(() => {
    Promise.all([getRefineryStations(), getRefineryMethods(), getOreCommodities()])
      .then(([s, m, o]) => { setStations(s); setMethods(m); setOres(o); })
      .finally(() => setLoadingData(false));
  }, []);

  function onStationSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    const found = stations.find(s => s.id === id);
    if (found) {
      setStationId(found.id);
      setStationName(found.name);
      setSystemName(found.system ?? "");
    } else {
      setStationId(null);
    }
  }

  function updateMaterial(key: number, patch: Partial<MaterialRow>) {
    setMaterials(prev => prev.map(m => m._key === key ? { ...m, ...patch } : m));
  }

  function removeMaterial(key: number) {
    setMaterials(prev => prev.filter(m => m._key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!parsedDuration) { setError("Enter a valid duration (e.g. 1h 30m)."); return; }
    if (!stationName.trim()) { setError("Station name is required."); return; }
    setError(null);
    setSubmitting(true);

    const startedAt = new Date().toISOString();
    const finishesAt = new Date(Date.now() + parsedDuration * 1000).toISOString();

    const jobMaterials = materials
      .filter(m => m.name.trim())
      .map((m, i) => ({
        id: `local-${Date.now()}-${i}`,
        commodityId: m.commodityId,
        name: m.name.trim(),
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit,
        yieldPercent: m.yieldPercent ? parseFloat(m.yieldPercent) : null,
      }));

    const data: CreateJobInput = {
      stationId,
      stationName: stationName.trim(),
      systemName: systemName.trim() || null,
      method: method || null,
      startedAt,
      durationSec: parsedDuration,
      finishesAt,
      status: "running",
      note: note.trim() || null,
      materials: jobMaterials,
    };

    try {
      await api.jobs.create(token, data);
      setPage("refinery-jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="eyebrow">New Refinery Job</h1>
        <button onClick={() => setPage("refinery-jobs")} className="btn btn-ghost text-sm">
          Cancel
        </button>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="panel p-5 flex flex-col gap-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted/70">Station</p>
            <select
              className="field"
              value={stationId ?? ""}
              onChange={onStationSelect}
            >
              <option value="">— Select station —</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.system})</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Station Name</label>
                <input
                  className="field"
                  value={stationName}
                  onChange={e => setStationName(e.target.value)}
                  placeholder="Custom name…"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted">System</label>
                <input
                  className="field"
                  value={systemName}
                  onChange={e => setSystemName(e.target.value)}
                  placeholder="Stanton, Pyro…"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Refinery Method</label>
              <select className="field" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="">— Select method —</option>
                {methods.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel p-5 flex flex-col gap-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted/70">Materials</p>
            {materials.map(mat => (
              <div key={mat._key} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Ore</label>
                  <input
                    list={`ore-list-${mat._key}`}
                    className="field"
                    value={mat.name}
                    onChange={e => {
                      const found = ores.find(o => o.name === e.target.value);
                      updateMaterial(mat._key, {
                        name: e.target.value,
                        commodityId: found?.id ?? null,
                      });
                    }}
                    placeholder="Quantainium…"
                  />
                  <datalist id={`ore-list-${mat._key}`}>
                    {ores.map(o => <option key={o.id} value={o.name} />)}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Qty</label>
                  <input
                    type="number"
                    className="field"
                    value={mat.quantity}
                    min={0}
                    onChange={e => updateMaterial(mat._key, { quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Unit</label>
                  <select className="field" value={mat.unit} onChange={e => updateMaterial(mat._key, { unit: e.target.value })}>
                    <option>SCU</option>
                    <option>cSCU</option>
                    <option>mSCU</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Yield %</label>
                  <input
                    type="number"
                    className="field"
                    value={mat.yieldPercent}
                    min={-100}
                    max={100}
                    onChange={e => updateMaterial(mat._key, { yieldPercent: e.target.value })}
                    placeholder="—"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMaterial(mat._key)}
                  disabled={materials.length === 1}
                  className="btn btn-ghost text-danger px-2 py-1 self-end"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMaterials(prev => [...prev, newRow()])}
              className="btn btn-ghost text-xs self-start"
            >
              + Add Material
            </button>
          </div>

          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Duration</label>
              <input
                className="field"
                value={durationInput}
                onChange={e => setDurationInput(e.target.value)}
                placeholder="1h 30m  /  90m  /  01:30:00"
              />
              {durationInput && (
                <p className="text-xs text-muted">
                  {parsedDuration != null
                    ? <span className="text-quant">{formatDuration(parsedDuration)}</span>
                    : <span className="text-danger">Invalid format</span>
                  }
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted">Note (optional)</label>
              <textarea
                className="field resize-none"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Any notes…"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? "Creating…" : "Create Job"}
            </button>
            <button type="button" onClick={() => setPage("refinery-jobs")} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

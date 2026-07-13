import { useEffect, useState } from "react";

function useLocalSetting<T>(key: string, defaultVal: T) {
  const [val, setVal] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultVal;
    try { return JSON.parse(stored) as T; } catch { return defaultVal; }
  });
  function update(next: T) {
    setVal(next);
    localStorage.setItem(key, JSON.stringify(next));
  }
  return [val, update] as const;
}

function applyUiScale(scale: number) {
  document.documentElement.style.setProperty("--ui-scale", String(scale));
  (document.documentElement as HTMLElement).style.zoom = String(scale);
}

export default function Settings() {
  const [uiScale, setUiScale] = useLocalSetting<number>("ch-ui-scale", 1);
  const [volume, setVolume]   = useLocalSetting<number>("ch-volume", 50);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api.getVersion().then(setAppVersion).catch(() => {});
    applyUiScale(uiScale);
  }, []);

  function handleScaleChange(v: number) {
    setUiScale(v);
    applyUiScale(v);
  }

  async function handleCheckUpdates() {
    await window.api.checkForUpdates();
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <div className="flex items-end justify-between">
        <h1 className="eyebrow">Settings</h1>
        <span className="text-base font-mono text-quant tracking-widest pb-0.5">v{appVersion ?? "…"}</span>
      </div>

      {/* Display */}
      <section className="flex flex-col gap-4">
        <p className="label text-xs tracking-widest uppercase text-muted/60">Display</p>

        <div className="panel p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-ink font-medium">UI Scale</label>
              <span className="text-xs font-mono text-quant">{Math.round(uiScale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.7} max={1.4} step={0.05}
              value={uiScale}
              onChange={e => handleScaleChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted/40">
              <span>70%</span>
              <span>100%</span>
              <span>140%</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => handleScaleChange(1)}
              className="text-xs font-mono text-muted hover:text-quant transition-colors"
            >
              Reset to 100%
            </button>
          </div>
        </div>
      </section>

      {/* Audio */}
      <section className="flex flex-col gap-4">
        <p className="label text-xs tracking-widest uppercase text-muted/60">Audio</p>

        <div className="panel p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-ink font-medium">Master Volume</label>
              <span className="text-xs font-mono text-quant">{volume}%</span>
            </div>
            <input
              type="range"
              min={0} max={100} step={5}
              value={volume}
              onChange={e => setVolume(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <p className="text-[10px] text-muted/40 font-mono">
              Controls background ambient audio (coming soon)
            </p>
          </div>
        </div>
      </section>

      {/* Updates */}
      <section className="flex flex-col gap-4">
        <p className="label text-xs tracking-widest uppercase text-muted/60">Updates</p>

        <div className="panel p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink font-medium">Application Version</p>
              <p className="text-xs text-muted font-mono mt-0.5">v{appVersion ?? "…"}</p>
            </div>
            <button onClick={handleCheckUpdates} className="btn text-xs px-3 py-1.5 border border-edge text-muted hover:text-ink hover:border-quant transition-all font-mono">
              Check for Updates
            </button>
          </div>

          <div className="pt-1 border-t border-edge">
            <p className="text-[10px] text-muted/40 font-mono">
              Updates are downloaded automatically in the background and applied on next launch.
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="flex flex-col gap-4">
        <p className="label text-xs tracking-widest uppercase text-muted/60">About</p>
        <div className="panel p-5 flex flex-col gap-2">
          <p className="text-sm text-ink font-medium">Citizen Hub</p>
          <p className="text-xs text-muted">
            Star Citizen refinery job tracker with live UEX Corp data.
          </p>
          <a
            href="#"
            onClick={e => { e.preventDefault(); window.open("https://github.com/haqpy1337/citizen-hub"); }}
            className="text-xs text-quant hover:underline font-mono"
          >
            github.com/haqpy1337/citizen-hub ↗
          </a>
        </div>
      </section>
    </div>
  );
}

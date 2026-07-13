import { useEffect, useState } from "react";

type UpdateCheckState = "idle" | "checking" | "available" | "downloaded" | "uptodate" | "error";

export default function Settings() {
  const [zoom, setZoom]       = useState(1);
  const [volume, setVolume]   = useState(() => {
    const s = localStorage.getItem("ch-volume");
    return s ? parseInt(s) : 50;
  });
  const [appVersion, setAppVersion]   = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<UpdateCheckState>("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api.getVersion().then(setAppVersion).catch(() => {});
    window.api.getZoom().then(setZoom).catch(() => {});

    // Listen for update events so the button gets real feedback
    window.api.onUpdateAvailable((v) => { setUpdateVersion(v); setUpdateState("available"); });
    window.api.onUpdateDownloaded((v) => { setUpdateVersion(v); setUpdateState("downloaded"); });
    window.api.onUpdateError(() => setUpdateState("error"));
    window.api.onUpdateNotAvailable(() => setUpdateState("uptodate"));
  }, []);

  function handleZoomChange(v: number) {
    setZoom(v);
    window.api.setZoom(v); // native webContents zoom — no layout issues
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    localStorage.setItem("ch-volume", String(v));
  }

  async function handleCheckUpdates() {
    setUpdateState("checking");
    setUpdateVersion(null);
    await window.api.checkForUpdates();
    // result comes in via onUpdate* listeners above
  }

  const updateLabel: Record<UpdateCheckState, string> = {
    idle:      "Check for Updates",
    checking:  "Checking…",
    uptodate:  "✓ Up to date",
    available: `Downloading v${updateVersion ?? "…"}`,
    downloaded:`↓ v${updateVersion ?? "…"} ready`,
    error:     "Check failed — retry",
  };

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <div className="flex items-end justify-between">
        <h1 className="eyebrow">Settings</h1>
        <span className="text-base font-mono text-quant tracking-widest pb-0.5">
          v{appVersion ?? "…"}
        </span>
      </div>

      {/* Display */}
      <section className="flex flex-col gap-3">
        <p className="label">Display</p>
        <div className="panel p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-ink font-medium">UI Scale</label>
              <span className="text-xs font-mono text-quant">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range" min={0.7} max={1.4} step={0.05}
              value={zoom}
              onChange={e => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-quant"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted/40">
              <span>70%</span><span>100%</span><span>140%</span>
            </div>
          </div>
          <button
            onClick={() => handleZoomChange(1)}
            className="self-start text-xs font-mono text-muted hover:text-quant transition-colors"
          >
            Reset to 100%
          </button>
        </div>
      </section>

      {/* Audio */}
      <section className="flex flex-col gap-3">
        <p className="label">Audio</p>
        <div className="panel p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-ink font-medium">Master Volume</label>
            <span className="text-xs font-mono text-quant">{volume}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={volume}
            onChange={e => handleVolumeChange(parseInt(e.target.value))}
            className="w-full accent-quant"
          />
          <p className="text-[10px] text-muted/40 font-mono">
            Background ambient audio — coming soon
          </p>
        </div>
      </section>

      {/* Updates */}
      <section className="flex flex-col gap-3">
        <p className="label">Updates</p>
        <div className="panel p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink font-medium">Application Version</p>
              <p className="text-xs text-muted font-mono mt-0.5">v{appVersion ?? "…"}</p>
            </div>
            <button
              onClick={handleCheckUpdates}
              disabled={updateState === "checking"}
              className="btn-ghost shrink-0 text-xs px-3 py-1.5 font-mono disabled:opacity-50"
            >
              {updateLabel[updateState]}
            </button>
          </div>

          {updateState === "downloaded" && (
            <button
              onClick={() => window.api.installUpdate()}
              className="btn-primary text-xs py-2"
            >
              Install Update &amp; Restart
            </button>
          )}

          <p className="text-[10px] text-muted/40 font-mono border-t border-edge pt-3">
            Updates download automatically and install silently on restart.
          </p>
        </div>
      </section>

      {/* About */}
      <section className="flex flex-col gap-3">
        <p className="label">About</p>
        <div className="panel p-5 flex flex-col gap-2">
          <p className="text-sm text-ink font-medium">Citizen Hub</p>
          <p className="text-xs text-muted">
            Star Citizen refinery job tracker — live UEX Corp market data.
          </p>
          <button
            onClick={() => window.open("https://github.com/haqpy1337/citizen-hub")}
            className="self-start text-xs text-quant hover:underline font-mono"
          >
            github.com/haqpy1337/citizen-hub ↗
          </button>
        </div>
      </section>
    </div>
  );
}

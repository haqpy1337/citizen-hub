import { useEffect, useRef, useState } from "react";
import anime from "animejs";

type UpdateState = "idle" | "checking" | "available" | "downloaded" | "uptodate" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  gearRef: React.RefObject<HTMLButtonElement | null>;
}

export default function SettingsModal({ open, onClose, gearRef }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const prevOpen    = useRef(false);

  const [zoom, setZoom]             = useState(1);
  const [volume, setVolume]         = useState(() => parseInt(localStorage.getItem("ch-volume") ?? "50"));
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api.getVersion().then(setAppVersion).catch(() => {});
    window.api.getZoom().then(setZoom).catch(() => {});
    window.api.onUpdateAvailable((v) => { setUpdateVersion(v); setUpdateState("available"); });
    window.api.onUpdateDownloaded((v) => { setUpdateVersion(v); setUpdateState("downloaded"); });
    window.api.onUpdateError(() => setUpdateState("error"));
    window.api.onUpdateNotAvailable(() => setUpdateState("uptodate"));
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    const panel   = panelRef.current;
    if (!overlay || !panel) return;

    if (open && !prevOpen.current) {
      // Spin gear
      if (gearRef.current) {
        anime({ targets: gearRef.current, rotate: [0, 360], duration: 600, easing: "easeOutExpo" });
      }
      // Show overlay
      overlay.style.display = "flex";
      anime({ targets: overlay, opacity: [0, 1], duration: 200, easing: "easeOutSine" });
      anime({ targets: panel, translateX: [-320, 0], opacity: [0, 1], duration: 320, easing: "easeOutExpo" });
    } else if (!open && prevOpen.current) {
      // Spin gear back
      if (gearRef.current) {
        anime({ targets: gearRef.current, rotate: [0, -180], duration: 400, easing: "easeInExpo" });
      }
      anime({ targets: panel, translateX: [0, -40], opacity: [1, 0], duration: 220, easing: "easeInExpo" });
      anime({
        targets: overlay, opacity: [1, 0], duration: 200, easing: "easeInSine",
        complete: () => { overlay.style.display = "none"; },
      });
    }
    prevOpen.current = open;
  }, [open, gearRef]);

  // Close on overlay click (not panel click)
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleZoom(v: number) {
    setZoom(v);
    window.api.setZoom(v);
  }
  function handleVolume(v: number) {
    setVolume(v);
    localStorage.setItem("ch-volume", String(v));
  }
  async function checkUpdates() {
    setUpdateState("checking");
    setUpdateVersion(null);
    await window.api.checkForUpdates();
  }

  const updateLabel: Record<UpdateState, string> = {
    idle:      "Check for Updates",
    checking:  "Checking…",
    uptodate:  "✓ Up to date",
    available: `Downloading v${updateVersion ?? "…"}`,
    downloaded:`↓ v${updateVersion ?? "…"} ready — Install`,
    error:     "Check failed — retry",
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] items-start justify-start"
      style={{ display: "none", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        ref={panelRef}
        className="relative h-full w-[420px] bg-panel border-r border-edge flex flex-col overflow-y-auto"
        style={{ boxShadow: "var(--shadow-panel), 12px 0 48px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-edge shrink-0">
          <p className="eyebrow tracking-[0.35em]">Settings</p>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-quant">v{appVersion ?? "…"}</span>
            <button
              onClick={onClose}
              className="text-muted hover:text-ink transition-colors text-lg leading-none"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-7 px-6 py-6">
          {/* Display */}
          <section className="flex flex-col gap-3">
            <p className="label">Display</p>
            <div className="panel p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-ink">UI Scale</label>
                  <span className="text-xs font-mono text-quant">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range" min={0.7} max={1.4} step={0.05}
                  value={zoom}
                  onChange={e => handleZoom(parseFloat(e.target.value))}
                  className="w-full accent-quant"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted/40">
                  <span>70%</span><span>100%</span><span>140%</span>
                </div>
              </div>
              <button
                onClick={() => handleZoom(1)}
                className="self-start text-xs font-mono text-muted hover:text-quant transition-colors"
              >
                Reset to 100%
              </button>
            </div>
          </section>

          {/* Audio */}
          <section className="flex flex-col gap-3">
            <p className="label">Audio</p>
            <div className="panel p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-ink">Master Volume</label>
                <span className="text-xs font-mono text-quant">{volume}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={volume}
                onChange={e => handleVolume(parseInt(e.target.value))}
                className="w-full accent-quant"
              />
              <p className="text-[10px] text-muted/40 font-mono">
                Ambient audio — coming soon
              </p>
            </div>
          </section>

          {/* Updates */}
          <section className="flex flex-col gap-3">
            <p className="label">Updates</p>
            <div className="panel p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-ink">Application Version</p>
                  <p className="text-xs text-muted font-mono mt-0.5">v{appVersion ?? "…"}</p>
                </div>
                <button
                  onClick={updateState === "downloaded" ? () => window.api.installUpdate() : checkUpdates}
                  disabled={updateState === "checking"}
                  className="btn btn-ghost shrink-0 text-xs px-3 py-1.5 font-mono disabled:opacity-50"
                >
                  {updateLabel[updateState]}
                </button>
              </div>
              <p className="text-[10px] text-muted/40 font-mono border-t border-edge pt-3">
                Updates download automatically and install on restart.
              </p>
            </div>
          </section>

          {/* About */}
          <section className="flex flex-col gap-3">
            <p className="label">About</p>
            <div className="panel p-4 flex flex-col gap-2">
              <p className="text-sm text-ink font-medium">Citizen Hub</p>
              <p className="text-xs text-muted">
                Star Citizen refinery job tracker — live UEX Corp market data.
              </p>
              <button
                onClick={() => window.open("https://github.com/haqpy1337/citizen-hub")}
                className="self-start text-xs text-quant hover:underline font-mono mt-1"
              >
                github.com/haqpy1337/citizen-hub ↗
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

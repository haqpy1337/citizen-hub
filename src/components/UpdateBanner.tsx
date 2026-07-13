import { useEffect, useState } from "react";

type UpdateState = "idle" | "checking" | "available" | "downloading" | "downloaded" | "error" | "uptodate";

export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>("idle");
  const [version, setVersion] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    window.api.onUpdateAvailable((v) => { setVersion(v); setState("downloading"); });
    window.api.onUpdateDownloaded((v) => { setVersion(v); setState("downloaded"); });
    window.api.onUpdateError((msg) => { setErrorMsg(msg); setState("error"); });
    window.api.onUpdateNotAvailable(() => setState("uptodate"));
  }, []);

  if (state === "idle") return null;

  const colors: Record<UpdateState, string> = {
    idle: "",
    checking: "border-edge text-muted",
    available: "border-quant/40 text-quant",
    downloading: "border-quant/40 text-quant",
    downloaded: "border-emerald-500/40 text-emerald-300",
    error: "border-red-500/40 text-red-300",
    uptodate: "border-edge text-muted",
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded border bg-hull text-sm font-mono shadow-lg ${colors[state]}`}>
      {state === "downloading" && <span className="w-2 h-2 rounded-full bg-quant animate-pulse shrink-0" />}
      {state === "downloaded" && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
      {state === "error" && <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />}

      {state === "checking"    && <span>Checking for updates…</span>}
      {state === "downloading" && <span>Downloading v{version}…</span>}
      {state === "uptodate"   && <span>App is up to date</span>}
      {state === "error" && (
        <span title={errorMsg ?? undefined}>Update failed</span>
      )}
      {state === "downloaded" && (
        <>
          <span>v{version} ready</span>
          <button
            onClick={() => window.api.installUpdate()}
            className="btn btn-primary px-3 py-1 text-xs"
          >
            Install & Restart
          </button>
        </>
      )}

      <button
        onClick={() => setState("idle")}
        className="ml-1 text-muted hover:text-ink text-xs"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";

export default function UpdateBanner() {
  const [state, setState] = useState<"idle" | "available" | "downloaded">("idle");

  useEffect(() => {
    window.api.onUpdateAvailable(() => setState("available"));
    window.api.onUpdateDownloaded(() => setState("downloaded"));
  }, []);

  if (state === "idle") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded border border-emerald-500/40 bg-hull text-sm font-mono shadow-lg">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      {state === "available" ? (
        <span className="text-emerald-300">Update wird heruntergeladen…</span>
      ) : (
        <>
          <span className="text-emerald-300">Update bereit</span>
          <button
            onClick={() => window.api.installUpdate()}
            className="btn btn-primary px-3 py-1 text-xs"
          >
            Jetzt installieren
          </button>
        </>
      )}
    </div>
  );
}

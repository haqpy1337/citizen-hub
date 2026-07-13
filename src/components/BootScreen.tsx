import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { getOreCommodities, getRefineryStations, getRefineryMethods } from "../lib/uex/endpoints";

interface Props { onComplete: () => void }

type CheckStatus = "pending" | "running" | "ok" | "fail";
type UpdateState = "checking" | "uptodate" | "available" | "downloaded" | "error";

interface Check {
  label: string;
  run: () => Promise<boolean>;
}

const CHECKS: Check[] = [
  {
    label: "LOCAL DATABASE",
    run: async () => {
      try { return await window.api.dbPing(); }
      catch { return false; }
    },
  },
  {
    label: "UEX CORP API",
    run: async () => {
      try { const r = await getOreCommodities(); return r.length > 0; }
      catch { return false; }
    },
  },
  {
    label: "REFINERY DATA",
    run: async () => {
      try {
        const [s, m] = await Promise.all([getRefineryStations(), getRefineryMethods()]);
        return s.length > 0 || m.length > 0;
      } catch { return false; }
    },
  },
  {
    label: "CITIZEN HUB v2",
    run: async () => {
      try { await window.api.getVersion(); return true; }
      catch { return false; }
    },
  },
];

export default function BootScreen({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses]       = useState<CheckStatus[]>(CHECKS.map(() => "pending"));
  const [progress, setProgress]       = useState(0);
  const [ready, setReady]             = useState(false);
  const [version, setVersion]         = useState<string>("…");
  const [updateState, setUpdateState] = useState<UpdateState>("checking");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  // Register update listeners immediately on mount
  useEffect(() => {
    window.api.onUpdateAvailable((v) => { setUpdateVersion(v); setUpdateState("available"); });
    window.api.onUpdateDownloaded((v) => { setUpdateVersion(v); setUpdateState("downloaded"); });
    window.api.onUpdateError(() => setUpdateState("error"));
    window.api.onUpdateNotAvailable(() => setUpdateState("uptodate"));

    window.api.getVersion().then(v => setVersion(v)).catch(() => {});
  }, []);

  // Intro animation + sequential checks
  useEffect(() => {
    // Exact ms from timeline start when each row's animation begins.
    // Calculated from the chain of .add() offsets below:
    //   divider ends at 3380ms → rows use stagger(100) with -=100 → row 0 at 3280ms
    const ROW_START_MS = CHECKS.map((_, i) => 3280 + i * 100);

    // Capture the exact moment the timeline fires its first tick.
    // We use the TIMELINE-level begin (not per-child) because that's guaranteed.
    let tlStartAt = 0;
    let resolveTlStart!: () => void;
    const tlStarted = new Promise<void>(r => { resolveTlStart = r; });

    const tl = anime.timeline({
      easing: "easeOutExpo",
      begin: () => { tlStartAt = performance.now(); resolveTlStart(); },
    });

    tl
      .add({ targets: ".boot-grid",      opacity: [0, 1], duration: 700 })
      .add({ targets: ".boot-corner-h",  scaleX:  [0, 1], duration: 350, delay: anime.stagger(60), easing: "easeOutQuad" }, "-=300")
      .add({ targets: ".boot-corner-v",  scaleY:  [0, 1], duration: 350, delay: anime.stagger(60), easing: "easeOutQuad" }, "-=400")
      .add({ targets: ".boot-ring",      strokeDashoffset: [anime.setDashoffset, 0], opacity: [0, 1], duration: 700, delay: anime.stagger(120), easing: "easeInOutSine" }, "-=200")
      .add({ targets: ".boot-star",      opacity: [0, 1], scale: [0.2, 1], duration: 500, easing: "easeOutBack" }, "-=300")
      .add({ targets: ".boot-dot",       scale: [0, 1], opacity: [0, 1], duration: 300, easing: "easeOutBack" }, "-=150")
      .add({ targets: ".boot-citizen",   opacity: [0, 1], translateX: [-24, 0], duration: 500 }, "-=150")
      .add({ targets: ".boot-hub",       opacity: [0, 1], translateX: [-16, 0], duration: 400 }, "-=350")
      .add({ targets: ".boot-divider",   scaleX:  [0, 1], duration: 500, easing: "easeOutQuad" }, "-=150")
      .add({ targets: ".boot-row",       opacity: [0, 1], translateY: [8, 0], duration: 300, delay: anime.stagger(100) }, "-=100")
      .add({ targets: ".boot-bar-track", opacity: [0, 1], duration: 300 });

    let cancelled = false;
    (async () => {
      // Wait for the timeline to actually start (fires on the first rAF tick, ~16ms)
      await tlStarted;

      for (let i = 0; i < CHECKS.length; i++) {
        if (cancelled) return;

        // Wait precisely until this row's animation begins in the timeline.
        // If a previous slow check already pushed us past this point, skip the wait.
        const wait = ROW_START_MS[i] - (performance.now() - tlStartAt);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (cancelled) return;

        setStatuses(prev => { const n = [...prev]; n[i] = "running"; return n; });
        const result = await CHECKS[i].run();
        if (cancelled) return;

        setStatuses(prev => { const n = [...prev]; n[i] = result ? "ok" : "fail"; return n; });
        setProgress(Math.round(((i + 1) / CHECKS.length) * 100));

        if (i < CHECKS.length - 1) {
          await new Promise(r => setTimeout(r, 180));
          if (cancelled) return;
        }
      }

      await new Promise(r => setTimeout(r, 400));
      if (!cancelled) setReady(true);
    })();

    return () => { cancelled = true; tl.pause(); };
  }, []);

  // Animate ENTER button + footer in when ready becomes true
  useEffect(() => {
    if (!ready) return;
    anime({
      targets: [".boot-enter", ".boot-footer"],
      opacity:    [0, 1],
      translateY: [14, 0],
      duration: 600,
      easing: "easeOutExpo",
      delay: anime.stagger(80),
    });
  }, [ready]);

  function handleStart() {
    anime({
      targets: ".boot-flash",
      opacity: [0, 0.6, 0],
      duration: 400,
      easing: "easeInOutSine",
      complete: () =>
        anime({ targets: containerRef.current, opacity: [1, 0], duration: 350, complete: onComplete }),
    });
  }

  const statusColor = (s: CheckStatus) => {
    if (s === "pending") return "text-emerald-500/25";
    if (s === "running") return "text-emerald-400 animate-pulse";
    if (s === "ok")      return "text-emerald-400";
    return "text-red-400";
  };
  const statusText = (s: CheckStatus) => {
    if (s === "pending") return "· · ·";
    if (s === "running") return "LOADING";
    if (s === "ok")      return "ONLINE";
    return "OFFLINE";
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none">

      {/* Grid */}
      <div className="boot-grid absolute inset-0 opacity-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(16,185,129,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.05) 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ animation: "scanline 2.5s linear .4s forwards", position: "absolute", width: "100%", height: "1px", background: "linear-gradient(90deg,transparent,rgba(16,185,129,.4),transparent)", top: 0 }} />
      </div>

      {/* Corners */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-left" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-top -mt-px" />
      </div>
      <div className="absolute top-6 right-6 pointer-events-none flex flex-col items-end">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-right" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-top -mt-px" />
      </div>
      <div className="absolute bottom-6 left-6 pointer-events-none flex flex-col-reverse">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-left" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-bottom -mb-px" />
      </div>
      <div className="absolute bottom-6 right-6 pointer-events-none flex flex-col-reverse items-end">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-right" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-bottom -mb-px" />
      </div>

      {/* ─── Center panel — fixed height so nothing shifts ─── */}
      <div className="relative flex flex-col items-center w-72" style={{ gap: "1.75rem" }}>

        <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
          <circle className="boot-ring" cx="55" cy="55" r="50" stroke="#10b981" strokeWidth="0.7" opacity="0.2" />
          <circle className="boot-ring" cx="55" cy="55" r="38" stroke="#10b981" strokeWidth="1"   opacity="0.45" />
          <circle className="boot-ring" cx="55" cy="55" r="26" stroke="#10b981" strokeWidth="1.2" opacity="0.7" />
          <line className="boot-ring" x1="55" y1="2"   x2="55"  y2="14"  stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="55" y1="96"  x2="55"  y2="108" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="2"  y1="55"  x2="14"  y2="55"  stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="96" y1="55"  x2="108" y2="55"  stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <path className="boot-star" d="M55 26 L59 50 L83 55 L59 60 L55 84 L51 60 L27 55 L51 50 Z"
            fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1.4" strokeLinejoin="round" />
          <circle className="boot-dot" cx="55" cy="55" r="5" fill="#10b981" />
          <circle className="boot-dot" cx="55" cy="55" r="2.5" fill="#ecfdf5" />
        </svg>

        <div className="text-center leading-tight">
          <div className="boot-citizen opacity-0 font-bold text-white text-4xl" style={{ letterSpacing: "0.35em" }}>CITIZEN</div>
          <div className="boot-hub opacity-0 text-emerald-400 text-sm font-semibold mt-0.5" style={{ letterSpacing: "0.65em" }}>HUB</div>
        </div>

        <div className="boot-divider w-full h-px bg-emerald-500/20 origin-left" />

        <div className="w-full flex flex-col gap-2.5">
          {CHECKS.map((c, i) => (
            <div key={i} className="boot-row opacity-0 flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-500/50 tracking-wider">{c.label}</span>
              <span className={statusColor(statuses[i])}>{statusText(statuses[i])}</span>
            </div>
          ))}
        </div>

        <div className="boot-bar-track w-full opacity-0">
          <div className="relative w-full h-px bg-emerald-900/50 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono text-emerald-500/30">
            <span>INIT</span><span>{progress}%</span>
          </div>
        </div>

        {/* ENTER button — always rendered, invisible until ready */}
        <div
          className="boot-enter w-full"
          style={{ opacity: 0, pointerEvents: ready ? "auto" : "none" }}
        >
          <button
            onClick={handleStart}
            className="w-full py-2.5 text-sm font-mono font-semibold tracking-[0.25em] uppercase border border-emerald-500/60 text-emerald-400 rounded hover:bg-emerald-500/10 hover:border-emerald-400 transition-all active:scale-95"
          >
            — ENTER —
          </button>
        </div>
      </div>

      {/* ─── Footer bar ─── */}
      <div
        className="boot-footer absolute bottom-7 left-0 right-0 flex items-center justify-between px-10"
        style={{ opacity: 0 }}
      >
        <span className="text-sm font-mono text-emerald-400/60 tracking-widest">v{version}</span>
        <UpdateFooter state={updateState} version={updateVersion} onInstall={handleStart} />
      </div>

      <div className="boot-flash fixed inset-0 bg-emerald-400 opacity-0 pointer-events-none" />

      <style>{`
        @keyframes scanline {
          from { top:-1px; opacity:0 }
          5%   { opacity:.9 }
          95%  { opacity:.4 }
          to   { top:100%; opacity:0 }
        }
      `}</style>
    </div>
  );
}

function UpdateFooter({ state, version, onInstall }: {
  state: UpdateState; version: string | null; onInstall: () => void;
}) {
  if (state === "checking")  return <span className="text-xs font-mono text-emerald-500/30 animate-pulse tracking-wider">CHECKING FOR UPDATES…</span>;
  if (state === "uptodate")  return <span className="text-xs font-mono text-emerald-500/25 tracking-wider">UP TO DATE</span>;
  if (state === "error")     return <span className="text-xs font-mono text-red-400/50 tracking-wider">UPDATE CHECK FAILED</span>;
  if (state === "available") return <span className="text-xs font-mono text-emerald-400/70 animate-pulse tracking-wider">DOWNLOADING v{version}…</span>;
  if (state === "downloaded") return (
    <button
      onClick={e => { e.stopPropagation(); onInstall(); }}
      className="text-xs font-mono text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded hover:bg-emerald-500/10 transition-colors animate-pulse tracking-wider"
    >
      v{version} READY — INSTALL &amp; RESTART
    </button>
  );
  return null;
}

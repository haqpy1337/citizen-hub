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
  {
    label: "SYSTEM INTEGRITY",
    run: async () => {
      try {
        const isUpdate = await window.api.isFirstRunAfterUpdate().catch(() => false);
        if (!isUpdate) return true;
        const [dbOk, apiOk] = await Promise.all([
          window.api.dbPing().catch(() => false),
          getOreCommodities().then(r => r.length > 0).catch(() => false),
        ]);
        return dbOk && apiOk;
      } catch { return false; }
    },
  },
];

// Bootscreen always uses the dark MOLE palette regardless of active theme
const BG = "#060402";
const Q  = "#e05010";
const QD = "rgba(224,80,16,0.18)";

export default function BootScreen({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses]       = useState<CheckStatus[]>(CHECKS.map(() => "pending"));
  const [progress, setProgress]       = useState(0);
  const [ready, setReady]             = useState(false);
  const [version, setVersion]         = useState<string>("…");
  const [updateState, setUpdateState] = useState<UpdateState>("checking");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api.onUpdateAvailable((v) => { setUpdateVersion(v); setUpdateState("available"); });
    window.api.onUpdateDownloaded((v) => { setUpdateVersion(v); setUpdateState("downloaded"); });
    window.api.onUpdateError(() => setUpdateState("error"));
    window.api.onUpdateNotAvailable(() => setUpdateState("uptodate"));
    window.api.getVersion().then(v => setVersion(v)).catch(() => {});
    // Fallback: if no update event fires within 8 s, assume up to date
    const updateTimeout = setTimeout(() => setUpdateState(s => s === "checking" ? "uptodate" : s), 8000);
    return () => clearTimeout(updateTimeout);
  }, []);

  useEffect(() => {
    const ROW_START_MS = CHECKS.map((_, i) => 3280 + i * 100);
    const mountedAt = Date.now();
    const tl = anime.timeline({ easing: "easeOutExpo" });

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
      for (let i = 0; i < CHECKS.length; i++) {
        if (cancelled) return;
        const wait = ROW_START_MS[i] - (Date.now() - mountedAt);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (cancelled) return;
        setStatuses(prev => { const n = [...prev]; n[i] = "running"; return n; });
        const [result] = await Promise.all([
          CHECKS[i].run(),
          new Promise<void>(r => setTimeout(r, 700)),
        ]);
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

  useEffect(() => {
    if (!ready) return;
    anime({
      targets: [".boot-enter", ".boot-footer"],
      opacity: [0, 1], translateY: [14, 0],
      duration: 600, easing: "easeOutExpo", delay: anime.stagger(80),
    });
  }, [ready]);

  function handleStart() {
    const tl = anime.timeline({ easing: "easeInQuad" });
    tl
      // corners extend outward and vanish
      .add({ targets: ".boot-corner-h", scaleX: [1, 2.5], opacity: [1, 0], duration: 280, easing: "easeInCubic" })
      .add({ targets: ".boot-corner-v", scaleY: [1, 2.5], opacity: [1, 0], duration: 280, easing: "easeInCubic" }, "-=280")
      // center ring + logo collapse
      .add({ targets: ".boot-ring", opacity: [null, 0], duration: 180 }, "-=220")
      .add({ targets: [".boot-citizen", ".boot-hub"], opacity: [null, 0], scale: [1, 1.08], duration: 180, easing: "easeInQuad" }, "-=180")
      // rows cascade out
      .add({ targets: [".boot-row", ".boot-bar-track", ".boot-enter", ".boot-footer", ".boot-divider"], opacity: [null, 0], translateY: [0, -5], duration: 140, delay: anime.stagger(10) }, "-=140")
      // grid zooms
      .add({ targets: ".boot-grid", backgroundSize: ["44px 44px", "110px 110px"], opacity: [null, 0], duration: 260 }, "-=80")
      // flash covers window — expand + complete happen under the flash so resize is invisible
      .add({
        targets: ".boot-flash", opacity: [0, 1],
        duration: 200, easing: "easeOutQuad",
        begin: () => { window.api.expandWindow().catch(() => {}); },
        complete: onComplete,
      }, "-=140");
  }

  function statusStyle(s: CheckStatus): React.CSSProperties {
    if (s === "pending") return { color: Q, opacity: 0.25 };
    if (s === "running") return { color: Q };
    if (s === "ok")      return { color: Q };
    return { color: "#e02010" };
  }
  const statusText = (s: CheckStatus) =>
    s === "pending" ? "· · ·" : s === "running" ? "LOADING" : s === "ok" ? "ONLINE" : "OFFLINE";

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none" style={{ backgroundColor: BG }}>

      {/* Grid — uses theme quant-dim */}
      <div className="boot-grid absolute inset-0 opacity-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${QD} 1px,transparent 1px),linear-gradient(90deg,${QD} 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          animation: "boot-scanline 2.5s linear .4s forwards",
          position: "absolute", width: "100%", height: "1px",
          background: `linear-gradient(90deg,transparent,${Q},transparent)`,
          opacity: 0.4, top: 0,
        }} />
      </div>

      {/* Corners — all use quant color */}
      {[
        "absolute top-6 left-6 pointer-events-none",
        "absolute top-6 right-6 pointer-events-none flex flex-col items-end",
        "absolute bottom-6 left-6 pointer-events-none flex flex-col-reverse",
        "absolute bottom-6 right-6 pointer-events-none flex flex-col-reverse items-end",
      ].map((cls, i) => (
        <div key={i} className={cls}>
          <span className={`boot-corner-h block h-px w-10 ${i % 2 === 0 ? "origin-left" : "origin-right"}`}
            style={{ background: Q }} />
          <span className={`boot-corner-v block w-px h-10 ${i < 2 ? "origin-top -mt-px" : "origin-bottom -mb-px"}`}
            style={{ background: Q }} />
        </div>
      ))}

      {/* Center panel */}
      <div className="relative flex flex-col items-center w-72" style={{ gap: "1.1rem" }}>

        <svg width="88" height="88" viewBox="0 0 110 110" fill="none">
          <circle className="boot-ring" cx="55" cy="55" r="50" stroke={Q} strokeWidth="0.7" opacity="0.2" />
          <circle className="boot-ring" cx="55" cy="55" r="38" stroke={Q} strokeWidth="1"   opacity="0.45" />
          <circle className="boot-ring" cx="55" cy="55" r="26" stroke={Q} strokeWidth="1.2" opacity="0.7" />
          <line className="boot-ring" x1="55" y1="2"   x2="55"  y2="14"  stroke={Q} strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="55" y1="96"  x2="55"  y2="108" stroke={Q} strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="2"  y1="55"  x2="14"  y2="55"  stroke={Q} strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="96" y1="55"  x2="108" y2="55"  stroke={Q} strokeWidth="2" strokeLinecap="round" />
          <path className="boot-star" d="M55 26 L59 50 L83 55 L59 60 L55 84 L51 60 L27 55 L51 50 Z"
            fill={Q} fillOpacity={0.12} stroke={Q} strokeWidth="1.4" strokeLinejoin="round" />
          <circle className="boot-dot" cx="55" cy="55" r="5" fill={Q} />
          <circle className="boot-dot" cx="55" cy="55" r="2.5" fill="white" fillOpacity={0.9} />
        </svg>

        <div className="text-center leading-tight">
          <div className="boot-citizen opacity-0 font-bold text-white text-4xl" style={{ letterSpacing: "0.35em" }}>CITIZEN</div>
          <div className="boot-hub opacity-0 text-sm font-semibold mt-0.5" style={{ letterSpacing: "0.65em", color: Q }}>HUB</div>
        </div>

        <div className="boot-divider w-full h-px origin-left" style={{ background: Q, opacity: 0.2 }} />

        <div className="w-full flex flex-col gap-2.5">
          {CHECKS.map((c, i) => (
            <div key={i} className="boot-row opacity-0 flex justify-between items-center text-xs font-mono">
              <span style={{ color: Q, opacity: 0.45 }} className="tracking-wider">{c.label}</span>
              <span
                style={statusStyle(statuses[i])}
                className={statuses[i] === "running" ? "animate-pulse" : ""}
              >
                {statusText(statuses[i])}
              </span>
            </div>
          ))}
        </div>

        <div className="boot-bar-track w-full opacity-0">
          <div className="relative w-full h-px overflow-hidden" style={{ background: QD }}>
            <div
              className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: Q }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono" style={{ color: Q, opacity: 0.3 }}>
            <span>INIT</span><span>{progress}%</span>
          </div>
        </div>

        {/* ENTER button */}
        <div className="boot-enter w-full" style={{ opacity: 0, pointerEvents: ready ? "auto" : "none" }}>
          <button
            onClick={handleStart}
            className="w-full py-2.5 text-sm font-mono font-semibold tracking-[0.25em] uppercase rounded transition-all active:scale-95"
            style={{
              border: `1px solid ${Q}`,
              color: Q,
              opacity: 0.85,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
          >
            — ENTER —
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="boot-footer absolute bottom-8 left-0 right-0 flex items-center justify-between px-8" style={{ opacity: 0 }}>
        <span className="text-sm font-mono tracking-widest" style={{ color: Q, opacity: 0.55 }}>v{version}</span>
        <UpdateFooter state={updateState} version={updateVersion} onInstall={handleStart} />
      </div>

      <div className="boot-flash fixed inset-0 opacity-0 pointer-events-none" style={{ backgroundColor: BG, zIndex: 10 }} />

      {/* Expansion scan line */}
      <div className="boot-expand-scanline absolute pointer-events-none" style={{
        width: "100%", height: "2px", top: "-1px", opacity: 0, zIndex: 11,
        background: `linear-gradient(90deg, transparent, ${Q}, ${Q}, transparent)`,
        boxShadow: `0 0 12px 2px ${Q}`,
      }} />

      <style>{`
        @keyframes boot-scanline {
          from { top:-1px; opacity:0 }
          5%   { opacity:.9 }
          95%  { opacity:.4 }
          to   { top:100%; opacity:0 }
        }
      `}</style>
    </div>
  );
}

function DownloadingDots({ label, color }: { label: string; color: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  const dots = ["   ", ".  ", ".. ", "..."][frame];
  return (
    <span style={{ color, fontFamily: "monospace" }}>
      {label}<span style={{ opacity: 0.6 }}>{dots}</span>
    </span>
  );
}

function UpdateFooter({ state, version, onInstall }: {
  state: UpdateState; version: string | null; onInstall: () => void;
}) {
  const q = "var(--color-quant)";
  const style = { color: q, opacity: 0.45 } as React.CSSProperties;
  if (state === "checking")  return <span className="text-xs font-mono animate-pulse tracking-wider" style={style}>CHECKING FOR UPDATES…</span>;
  if (state === "uptodate")  return <span className="text-xs font-mono tracking-wider" style={{ ...style, opacity: 0.3 }}>UP TO DATE</span>;
  if (state === "error")     return <span className="text-xs font-mono tracking-wider" style={{ color: "#e02010", opacity: 0.5 }}>UPDATE CHECK FAILED</span>;
  if (state === "available") return (
    <span className="text-xs font-mono tracking-wider" style={{ ...style, opacity: 0.65 }}>
      <DownloadingDots label={`DOWNLOADING v${version}`} color={q} />
    </span>
  );
  if (state === "downloaded") return (
    <button
      onClick={e => { e.stopPropagation(); onInstall(); }}
      className="text-xs font-mono px-3 py-1 tracking-wider transition-all"
      style={{ color: q, border: `1px solid ${q}`, opacity: 0.9 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.background = `${q}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      v{version} READY — INSTALL &amp; RESTART
    </button>
  );
  return null;
}

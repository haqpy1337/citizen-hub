import { useEffect, useRef, useState } from "react";
import anime from "animejs";

interface Props { onComplete: () => void }

type CheckStatus = "pending" | "running" | "ok" | "fail";

interface Check {
  label: string;
  minMs: number;
  run: () => Promise<boolean>;
}

const CHECKS: Check[] = [
  {
    label: "LOCAL DATABASE",
    minMs: 600,
    run: async () => true,
  },
  {
    label: "UEX CORP API",
    minMs: 800,
    run: async () => {
      try {
        const r = await fetch("https://api.uexcorp.space/2.0/commodities?is_raw=1", {
          signal: AbortSignal.timeout(5000),
        });
        return r.ok;
      } catch {
        return false;
      }
    },
  },
  {
    label: "REFINERY DATA",
    minMs: 700,
    run: async () => {
      try {
        const r = await fetch("https://api.uexcorp.space/2.0/terminals?type=refinery", {
          signal: AbortSignal.timeout(5000),
        });
        return r.ok;
      } catch {
        return false;
      }
    },
  },
  {
    label: "CITIZEN HUB v2",
    minMs: 500,
    run: async () => true,
  },
];

export default function BootScreen({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<CheckStatus[]>(CHECKS.map(() => "pending"));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase 1: intro animation
    const tl = anime.timeline({ easing: "easeOutExpo" });
    tl
      .add({ targets: ".boot-grid", opacity: [0, 1], duration: 700 })
      .add({
        targets: ".boot-corner-h",
        scaleX: [0, 1],
        duration: 350,
        delay: anime.stagger(60),
        easing: "easeOutQuad",
      }, "-=300")
      .add({
        targets: ".boot-corner-v",
        scaleY: [0, 1],
        duration: 350,
        delay: anime.stagger(60),
        easing: "easeOutQuad",
      }, "-=400")
      .add({
        targets: ".boot-ring",
        strokeDashoffset: [anime.setDashoffset, 0],
        opacity: [0, 1],
        duration: 700,
        delay: anime.stagger(120),
        easing: "easeInOutSine",
      }, "-=200")
      .add({
        targets: ".boot-star",
        opacity: [0, 1],
        scale: [0.2, 1],
        duration: 500,
        easing: "easeOutBack",
      }, "-=300")
      .add({ targets: ".boot-dot", scale: [0, 1], opacity: [0, 1], duration: 300, easing: "easeOutBack" }, "-=150")
      .add({ targets: ".boot-citizen", opacity: [0, 1], translateX: [-24, 0], duration: 500 }, "-=150")
      .add({ targets: ".boot-hub",     opacity: [0, 1], translateX: [-16, 0], duration: 400 }, "-=350")
      .add({ targets: ".boot-divider", scaleX: [0, 1], duration: 500, easing: "easeOutQuad" }, "-=150")
      .add({
        targets: ".boot-row",
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 300,
        delay: anime.stagger(100),
      }, "-=100")
      .add({ targets: ".boot-bar-track", opacity: [0, 1], duration: 300 });

    // Phase 2: run checks sequentially after intro (≈2s)
    let cancelled = false;
    const runChecks = async () => {
      await new Promise(r => setTimeout(r, 1800));
      if (cancelled) return;

      for (let i = 0; i < CHECKS.length; i++) {
        if (cancelled) return;
        const check = CHECKS[i];

        // Mark as running
        setStatuses(prev => { const n = [...prev]; n[i] = "running"; return n; });

        // Run real check + enforce minimum display time
        const [result] = await Promise.all([
          check.run(),
          new Promise(r => setTimeout(r, check.minMs)),
        ]);
        if (cancelled) return;

        setStatuses(prev => { const n = [...prev]; n[i] = result ? "ok" : "fail"; return n; });

        // Update progress bar
        const pct = Math.round(((i + 1) / CHECKS.length) * 100);
        setProgress(pct);

        // Small pause between checks
        await new Promise(r => setTimeout(r, 300));
        if (cancelled) return;
      }

      // All done — wait a beat, then flash & exit
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;

      anime({
        targets: ".boot-flash",
        opacity: [0, 0.5, 0],
        duration: 400,
        easing: "easeInOutSine",
        complete: () => {
          if (cancelled) return;
          anime({
            targets: containerRef.current,
            opacity: [1, 0],
            duration: 350,
            complete: onComplete,
          });
        },
      });
    };

    runChecks();
    return () => { cancelled = true; tl.pause(); };
  }, [onComplete]);

  const statusColor = (s: CheckStatus) => {
    if (s === "pending") return "text-emerald-500/25";
    if (s === "running") return "text-emerald-400 animate-pulse";
    if (s === "ok")      return "text-emerald-400";
    return "text-red-400";
  };

  const statusText = (s: CheckStatus) => {
    if (s === "pending") return "· · ·";
    if (s === "running") return "CHECKING";
    if (s === "ok")      return "ONLINE";
    return "OFFLINE";
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none">

      {/* Animated grid */}
      <div className="boot-grid absolute inset-0 opacity-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(16,185,129,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.05) 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ animation: "scanline 2.5s linear .4s forwards", position:"absolute", width:"100%", height:"1px", background:"linear-gradient(90deg,transparent,rgba(16,185,129,.4),transparent)", top:0 }} />
      </div>

      {/* Corners — top-left */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-left" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-top -mt-px" />
      </div>
      {/* top-right */}
      <div className="absolute top-6 right-6 pointer-events-none flex flex-col items-end">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-right" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-top -mt-px" />
      </div>
      {/* bottom-left */}
      <div className="absolute bottom-6 left-6 pointer-events-none flex flex-col-reverse">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-left" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-bottom -mb-px" />
      </div>
      {/* bottom-right */}
      <div className="absolute bottom-6 right-6 pointer-events-none flex flex-col-reverse items-end">
        <span className="boot-corner-h block h-px w-10 bg-emerald-500 origin-right" />
        <span className="boot-corner-v block w-px h-10 bg-emerald-500 origin-bottom -mb-px" />
      </div>

      {/* Center */}
      <div className="relative flex flex-col items-center gap-7 w-72">

        {/* Compass logo */}
        <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
          <circle className="boot-ring" cx="55" cy="55" r="50" stroke="#10b981" strokeWidth="0.7" opacity="0.2" />
          <circle className="boot-ring" cx="55" cy="55" r="38" stroke="#10b981" strokeWidth="1"   opacity="0.45" />
          <circle className="boot-ring" cx="55" cy="55" r="26" stroke="#10b981" strokeWidth="1.2" opacity="0.7" />
          <line className="boot-ring" x1="55" y1="2"   x2="55" y2="14"  stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="55" y1="96"  x2="55" y2="108" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="2"  y1="55"  x2="14" y2="55"  stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="96" y1="55"  x2="108" y2="55" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <path className="boot-star" d="M55 26 L59 50 L83 55 L59 60 L55 84 L51 60 L27 55 L51 50 Z"
            fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1.4" strokeLinejoin="round" />
          <circle className="boot-dot" cx="55" cy="55" r="5" fill="#10b981" />
          <circle className="boot-dot" cx="55" cy="55" r="2.5" fill="#ecfdf5" />
        </svg>

        {/* Title */}
        <div className="text-center leading-tight">
          <div className="boot-citizen opacity-0 font-bold text-white text-4xl" style={{ letterSpacing: "0.35em" }}>CITIZEN</div>
          <div className="boot-hub opacity-0 text-emerald-400 text-sm font-semibold mt-0.5" style={{ letterSpacing: "0.65em" }}>HUB</div>
        </div>

        {/* Divider */}
        <div className="boot-divider w-full h-px bg-emerald-500/20 origin-left" />

        {/* Status checks */}
        <div className="w-full flex flex-col gap-2.5">
          {CHECKS.map((c, i) => (
            <div key={i} className="boot-row opacity-0 flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-500/50 tracking-wider">{c.label}</span>
              <span className={statusColor(statuses[i])}>{statusText(statuses[i])}</span>
            </div>
          ))}
        </div>

        {/* Progress bar — driven by real check progress */}
        <div className="boot-bar-track w-full opacity-0">
          <div className="relative w-full h-px bg-emerald-900/50 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono text-emerald-500/30">
            <span>INIT</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Flash overlay */}
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

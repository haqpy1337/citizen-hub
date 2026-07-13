import { useEffect, useRef, useState } from "react";
import anime from "animejs";

interface Props { onComplete: () => void }

const STATUS_CHECKS = [
  { label: "LOCAL DATABASE", check: async () => true },
  { label: "UEX CORP API",   check: async () => {
    try {
      const r = await fetch("https://api.uexcorp.space/2.0/commodities?is_raw=1", { signal: AbortSignal.timeout(4000) });
      return r.ok;
    } catch { return false; }
  }},
  { label: "SYSTEM MODULES", check: async () => true },
  { label: "CITIZEN HUB v2", check: async () => true },
];

export default function BootScreen({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [statuses, setStatuses] = useState<(boolean | null)[]>(STATUS_CHECKS.map(() => null));

  useEffect(() => {
    const tl = anime.timeline({ easing: "easeOutExpo" });

    // 1. Grid fades in
    tl.add({ targets: ".boot-grid", opacity: [0, 1], duration: 500 })
    // 2. Corner brackets
    .add({
      targets: ".boot-corner span",
      scaleX: [0, 1],
      duration: 300,
      delay: anime.stagger(60),
      easing: "easeOutQuad",
    }, "-=200")
    .add({
      targets: ".boot-corner-v span",
      scaleY: [0, 1],
      duration: 300,
      delay: anime.stagger(60),
      easing: "easeOutQuad",
    }, "-=300")
    // 3. Compass rings
    .add({
      targets: ".boot-ring",
      strokeDashoffset: [anime.setDashoffset, 0],
      opacity: [0, 1],
      duration: 600,
      delay: anime.stagger(100),
      easing: "easeInOutSine",
    }, "-=100")
    // 4. Star blades
    .add({
      targets: ".boot-star",
      opacity: [0, 1],
      scale: [0.2, 1],
      duration: 400,
      easing: "easeOutBack",
    }, "-=200")
    // 5. Center dot
    .add({
      targets: ".boot-center",
      scale: [0, 1],
      opacity: [0, 1],
      duration: 300,
      easing: "easeOutBack",
    }, "-=100")
    // 6. Title
    .add({ targets: ".boot-citizen", opacity: [0, 1], translateX: [-20, 0], duration: 400 }, "-=100")
    .add({ targets: ".boot-hub",     opacity: [0, 1], translateX: [-14, 0], duration: 300 }, "-=250")
    // 7. Divider
    .add({ targets: ".boot-divider", scaleX: [0, 1], duration: 400, easing: "easeOutQuad" }, "-=100")
    // 8. Status rows appear (staggered), actual checks happen async
    .add({
      targets: ".boot-row",
      opacity: [0, 1],
      translateY: [6, 0],
      duration: 250,
      delay: anime.stagger(100),
    }, "-=100")
    // 9. Progress bar
    .add({
      targets: ".boot-bar",
      width: ["0%", "100%"],
      duration: 1200,
      easing: "easeInOutQuad",
    }, "-=100");

    // Run status checks in parallel with animation
    STATUS_CHECKS.forEach((item, i) => {
      setTimeout(async () => {
        const ok = await item.check();
        setStatuses(prev => { const n = [...prev]; n[i] = ok; return n; });
      }, 400 + i * 300);
    });

    // After bar completes, flash and exit
    const exitTimer = setTimeout(() => {
      anime({
        targets: ".boot-flash",
        opacity: [0, 0.5, 0],
        duration: 350,
        easing: "easeInOutSine",
        complete: () => {
          anime({
            targets: containerRef.current,
            opacity: 0,
            duration: 300,
            complete: onComplete,
          });
        },
      });
    }, 2800);

    return () => { tl.pause(); clearTimeout(exitTimer); };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none">

      {/* Grid */}
      <div className="boot-grid absolute inset-0 opacity-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(16,185,129,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.055) 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ animation: "scanline 2.2s linear .2s forwards", position: "absolute", width: "100%", height: "1px", background: "linear-gradient(90deg,transparent,rgba(16,185,129,.35),transparent)", top: 0 }} />
      </div>

      {/* Corner brackets — CSS-based, always fits window */}
      {/* Top-left */}
      <div className="boot-corner absolute top-6 left-6 pointer-events-none">
        <span className="block h-px w-10 bg-emerald-500 origin-left" />
        <span className="block w-px h-10 bg-emerald-500 origin-top mt-0" style={{ marginTop: "-1px" }} />
      </div>
      {/* Top-right */}
      <div className="boot-corner absolute top-6 right-6 pointer-events-none flex flex-col items-end">
        <span className="block h-px w-10 bg-emerald-500 origin-right" />
        <span className="block w-px h-10 bg-emerald-500 origin-top" style={{ marginTop: "-1px" }} />
      </div>
      {/* Bottom-left */}
      <div className="boot-corner-v absolute bottom-6 left-6 pointer-events-none flex flex-col-reverse">
        <span className="block h-px w-10 bg-emerald-500 origin-left" />
        <span className="block w-px h-10 bg-emerald-500 origin-bottom" style={{ marginBottom: "-1px" }} />
      </div>
      {/* Bottom-right */}
      <div className="boot-corner-v absolute bottom-6 right-6 pointer-events-none flex flex-col-reverse items-end">
        <span className="block h-px w-10 bg-emerald-500 origin-right" />
        <span className="block w-px h-10 bg-emerald-500 origin-bottom" style={{ marginBottom: "-1px" }} />
      </div>

      {/* Side tick marks */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-px bg-emerald-500/30 pointer-events-none" />
      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-px bg-emerald-500/30 pointer-events-none" />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-6 w-72">

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
          <circle className="boot-center" cx="55" cy="55" r="5" fill="#10b981" />
          <circle className="boot-center" cx="55" cy="55" r="2.5" fill="#ecfdf5" />
        </svg>

        {/* Title */}
        <div className="text-center leading-tight">
          <div className="boot-citizen opacity-0 font-bold text-white tracking-[0.35em] text-4xl">CITIZEN</div>
          <div className="boot-hub opacity-0 text-emerald-400 tracking-[0.65em] text-sm font-semibold mt-0.5">HUB</div>
        </div>

        {/* Divider */}
        <div className="boot-divider w-full h-px bg-emerald-500/20 origin-left" />

        {/* Status checks */}
        <div className="w-full flex flex-col gap-2">
          {STATUS_CHECKS.map((item, i) => (
            <div key={i} className="boot-row opacity-0 flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-500/50">{item.label}</span>
              <span className={
                statuses[i] === null ? "text-emerald-500/30 animate-pulse" :
                statuses[i] ? "text-emerald-400" : "text-red-400"
              }>
                {statuses[i] === null ? "···" : statuses[i] ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-px bg-emerald-900/40 overflow-hidden">
          <div className="boot-bar h-full w-0 bg-gradient-to-r from-emerald-600 to-emerald-400" />
        </div>
      </div>

      {/* Flash */}
      <div className="boot-flash fixed inset-0 bg-emerald-400 opacity-0 pointer-events-none" />

      <style>{`
        @keyframes scanline {
          from { top:-1px; opacity:0 }
          5%   { opacity:1 }
          95%  { opacity:.6 }
          to   { top:100%; opacity:0 }
        }
      `}</style>
    </div>
  );
}

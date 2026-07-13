import { useEffect, useRef } from "react";
import anime from "animejs";

interface Props { onComplete: () => void }

export default function BootScreen({ onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = anime.timeline({ easing: "easeOutExpo" });

    // 1. Grid scan lines appear
    tl.add({
      targets: ".boot-grid",
      opacity: [0, 1],
      duration: 600,
    })
    // 2. Corner brackets draw in
    .add({
      targets: ".boot-corner",
      strokeDashoffset: [anime.setDashoffset, 0],
      duration: 500,
      delay: anime.stagger(80),
      easing: "easeInOutSine",
    }, "-=200")
    // 3. Logo compass ring
    .add({
      targets: ".boot-ring",
      strokeDashoffset: [anime.setDashoffset, 0],
      opacity: [0, 1],
      duration: 700,
      delay: anime.stagger(120),
      easing: "easeInOutSine",
    }, "-=100")
    // 4. Compass star blades
    .add({
      targets: ".boot-star",
      opacity: [0, 1],
      scale: [0.3, 1],
      duration: 400,
      easing: "easeOutBack",
    }, "-=200")
    // 5. Center dot
    .add({
      targets: ".boot-dot",
      scale: [0, 1],
      opacity: [0, 1],
      duration: 300,
      easing: "easeOutBack",
    }, "-=100")
    // 6. "CITIZEN" text glitch in
    .add({
      targets: ".boot-title-citizen",
      opacity: [0, 1],
      translateX: [-30, 0],
      duration: 500,
    }, "-=100")
    // 7. "HUB" text
    .add({
      targets: ".boot-title-hub",
      opacity: [0, 1],
      translateX: [-20, 0],
      duration: 400,
    }, "-=300")
    // 8. Status lines
    .add({
      targets: ".boot-status-line",
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 300,
      delay: anime.stagger(120),
    }, "-=100")
    // 9. Progress bar fill
    .add({
      targets: ".boot-bar-fill",
      width: ["0%", "100%"],
      duration: 900,
      easing: "easeInOutQuad",
    }, "-=400")
    // 10. Flash + fade out
    .add({
      targets: ".boot-flash",
      opacity: [0, 0.6, 0],
      duration: 400,
      easing: "easeInOutSine",
    })
    .add({
      targets: ref.current,
      opacity: [1, 0],
      duration: 400,
      complete: onComplete,
    }, "-=100");

    return () => tl.pause();
  }, [onComplete]);

  return (
    <div ref={ref} className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      {/* Animated grid background */}
      <div className="boot-grid absolute inset-0 opacity-0" style={{
        backgroundImage: `
          linear-gradient(rgba(16,185,129,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16,185,129,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      {/* Scan line sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="boot-scanline absolute w-full h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"
          style={{ animation: "scanline 2s linear 0.3s forwards", top: 0 }} />
      </div>

      {/* Corner brackets */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        {/* Top-left */}
        <polyline className="boot-corner" points="60,30 30,30 30,60" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
        {/* Top-right */}
        <polyline className="boot-corner" points={`${window.innerWidth - 60},30 ${window.innerWidth - 30},30 ${window.innerWidth - 30},60`} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bottom-left */}
        <polyline className="boot-corner" points={`60,${window.innerHeight - 30} 30,${window.innerHeight - 30} 30,${window.innerHeight - 60}`} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bottom-right */}
        <polyline className="boot-corner" points={`${window.innerWidth - 60},${window.innerHeight - 30} ${window.innerWidth - 30},${window.innerHeight - 30} ${window.innerWidth - 30},${window.innerHeight - 60}`} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

        {/* Side tick marks */}
        <line x1="30" y1={window.innerHeight / 2 - 15} x2="30" y2={window.innerHeight / 2 + 15} stroke="#10b981" strokeWidth="1" opacity="0.4" className="boot-corner" />
        <line x1={window.innerWidth - 30} y1={window.innerHeight / 2 - 15} x2={window.innerWidth - 30} y2={window.innerHeight / 2 + 15} stroke="#10b981" strokeWidth="1" opacity="0.4" className="boot-corner" />
      </svg>

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer ring */}
          <circle className="boot-ring" cx="60" cy="60" r="54" stroke="#10b981" strokeWidth="0.8" opacity="0.25" />
          {/* Middle ring */}
          <circle className="boot-ring" cx="60" cy="60" r="42" stroke="#10b981" strokeWidth="1" opacity="0.5" />
          {/* Inner ring */}
          <circle className="boot-ring" cx="60" cy="60" r="30" stroke="#10b981" strokeWidth="1.2" opacity="0.7" />
          {/* Crosshair ticks */}
          <line className="boot-ring" x1="60" y1="2" x2="60" y2="16" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="60" y1="104" x2="60" y2="118" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="2" y1="60" x2="16" y2="60" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line className="boot-ring" x1="104" y1="60" x2="118" y2="60" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          {/* 4-point compass star */}
          <path className="boot-star" d="M60 28 L65 55 L92 60 L65 65 L60 92 L55 65 L28 60 L55 55 Z"
            fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Glow behind center */}
          <circle cx="60" cy="60" r="8" fill="#10b981" opacity="0.08" />
          {/* Center dot */}
          <circle className="boot-dot" cx="60" cy="60" r="5" fill="#10b981" />
          <circle className="boot-dot" cx="60" cy="60" r="2.5" fill="#ecfdf5" />
        </svg>

        {/* Title */}
        <div className="text-center">
          <div className="boot-title-citizen opacity-0 text-5xl font-bold tracking-widest text-white" style={{ fontFamily: "'Segoe UI', sans-serif", letterSpacing: "0.3em" }}>
            CITIZEN
          </div>
          <div className="boot-title-hub opacity-0 text-lg font-semibold tracking-[0.6em] text-emerald-400 mt-1">
            HUB
          </div>
        </div>

        {/* Status lines */}
        <div className="flex flex-col gap-1 text-xs font-mono text-emerald-500/60 w-64">
          <div className="boot-status-line opacity-0 flex justify-between">
            <span>SYSTEM</span><span className="text-emerald-400">ONLINE</span>
          </div>
          <div className="boot-status-line opacity-0 flex justify-between">
            <span>UEX SYNC</span><span className="text-emerald-400">READY</span>
          </div>
          <div className="boot-status-line opacity-0 flex justify-between">
            <span>DATABASE</span><span className="text-emerald-400">LOADED</span>
          </div>
          <div className="boot-status-line opacity-0 flex justify-between">
            <span>CITIZEN HUB v2</span><span className="text-emerald-400">INITIALIZING</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-px bg-emerald-900/40 relative overflow-hidden">
          <div className="boot-bar-fill absolute inset-y-0 left-0 w-0 bg-emerald-400" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent animate-pulse" />
        </div>
      </div>

      {/* Flash overlay */}
      <div className="boot-flash fixed inset-0 bg-emerald-400 opacity-0 pointer-events-none" />

      <style>{`
        @keyframes scanline {
          from { top: -2px; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          to   { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

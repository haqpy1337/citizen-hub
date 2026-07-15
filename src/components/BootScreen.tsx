import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { getOreCommodities, getRefineryStations, getRefineryMethods } from "../lib/uex/endpoints";
import CrestLogo from "./CrestLogo";

interface Props { onComplete: () => void }

type CheckStatus = "pending" | "running" | "ok" | "fail";
type UpdateState = "checking" | "uptodate" | "available" | "downloaded" | "error";

interface Check { label: string; run: () => Promise<boolean> }

const CHECKS: Check[] = [
  { label: "LOCAL DATABASE",  run: async () => { try { return await window.api.dbPing(); } catch { return false; } } },
  { label: "UEX CORP API",    run: async () => { try { const r = await getOreCommodities(); return r.length > 0; } catch { return false; } } },
  { label: "REFINERY DATA",   run: async () => { try { const [s,m] = await Promise.all([getRefineryStations(),getRefineryMethods()]); return s.length>0||m.length>0; } catch { return false; } } },
  { label: "CITIZEN HUB v2",  run: async () => { try { await window.api.getVersion(); return true; } catch { return false; } } },
  { label: "SYSTEM INTEGRITY", run: async () => {
    try {
      const isUpdate = await window.api.isFirstRunAfterUpdate().catch(() => false);
      if (!isUpdate) return true;
      const [dbOk, apiOk] = await Promise.all([
        window.api.dbPing().catch(() => false),
        getOreCommodities().then(r => r.length > 0).catch(() => false),
      ]);
      return dbOk && apiOk;
    } catch { return false; }
  }},
];

const BG  = "#000c18";
const C   = "#00d4ff";
const CD  = "rgba(0,212,255,0.07)";
const SCR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=:<>";

function randHex() { return Math.random().toString(16).slice(2, 6).toUpperCase(); }

// ── Enter Button with sweep + scramble ────────────────────────────────────────

function EnterButton({ onClick }: { onClick: () => void }) {
  const sweepRef    = useRef<HTMLSpanElement>(null);
  const textRef     = useRef<HTMLSpanElement>(null);
  const scrambleId  = useRef<ReturnType<typeof setInterval>>();
  const LABEL       = "— ENTER —";

  function onEnter() {
    // Sweep light
    if (sweepRef.current) {
      anime.remove(sweepRef.current);
      anime({
        targets: sweepRef.current,
        translateX: ["-120%", "260%"],
        opacity: [0, 0.7, 0],
        duration: 520,
        easing: "easeInOutSine",
      });
    }
    // Brief text scramble → resolves back
    clearInterval(scrambleId.current);
    let f = 0;
    const FRAMES = 8;
    scrambleId.current = setInterval(() => {
      f++;
      if (f >= FRAMES) {
        clearInterval(scrambleId.current);
        if (textRef.current) textRef.current.textContent = LABEL;
        return;
      }
      const revealed = Math.floor((f / FRAMES) * LABEL.length);
      if (textRef.current) {
        textRef.current.textContent = LABEL.split("").map((ch, i) => {
          if (ch === "—" || ch === " ") return ch;
          if (i < revealed) return ch;
          return SCR[Math.floor(Math.random() * SCR.length)];
        }).join("");
      }
    }, 38);
  }

  function onLeave() {
    clearInterval(scrambleId.current);
    if (textRef.current) textRef.current.textContent = LABEL;
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="relative w-full py-2.5 text-sm font-mono font-semibold tracking-[0.3em] uppercase overflow-hidden active:scale-95"
      style={{
        border: `1px solid ${C}`,
        color: C,
        background: "transparent",
        transition: "box-shadow 0.25s, background 0.25s",
      }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.08)"; }}
      onMouseUp  ={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {/* Sweep element */}
      <span ref={sweepRef} aria-hidden="true" className="absolute inset-y-0 w-10 pointer-events-none"
        style={{ left: "0%", background: `linear-gradient(90deg,transparent,rgba(0,212,255,0.55),transparent)`, opacity: 0 }}
      />
      {/* Corner accents */}
      <span aria-hidden="true" className="absolute top-0 left-0 w-2 h-2 pointer-events-none"
        style={{ borderTop: `1px solid ${C}`, borderLeft: `1px solid ${C}`, opacity: 0.7 }} />
      <span aria-hidden="true" className="absolute top-0 right-0 w-2 h-2 pointer-events-none"
        style={{ borderTop: `1px solid ${C}`, borderRight: `1px solid ${C}`, opacity: 0.7 }} />
      <span aria-hidden="true" className="absolute bottom-0 left-0 w-2 h-2 pointer-events-none"
        style={{ borderBottom: `1px solid ${C}`, borderLeft: `1px solid ${C}`, opacity: 0.7 }} />
      <span aria-hidden="true" className="absolute bottom-0 right-0 w-2 h-2 pointer-events-none"
        style={{ borderBottom: `1px solid ${C}`, borderRight: `1px solid ${C}`, opacity: 0.7 }} />
      <span ref={textRef}>{LABEL}</span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BootScreen({ onComplete }: Props) {
  const [statuses, setStatuses]           = useState<CheckStatus[]>(CHECKS.map(() => "pending"));
  const [progress, setProgress]           = useState(0);
  const [ready, setReady]                 = useState(false);
  const [version, setVersion]             = useState("…");
  const [updateState, setUpdateState]     = useState<UpdateState>("checking");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [displayLabels, setDisplayLabels] = useState(CHECKS.map(c => c.label));
  const [codes, setCodes]                 = useState(CHECKS.map(() => "····"));
  const [pulseIdx, setPulseIdx]           = useState<number | null>(null);  // dot pulse on complete

  const scrambleTimers = useRef<ReturnType<typeof setInterval>[]>([]);
  const codeTimers     = useRef<ReturnType<typeof setInterval>[]>([]);
  const lockedCodes    = useRef(CHECKS.map(() => ""));

  useEffect(() => {
    window.api.onUpdateAvailable(v  => { setUpdateVersion(v); setUpdateState("available"); });
    window.api.onUpdateDownloaded(v => { setUpdateVersion(v); setUpdateState("downloaded"); });
    window.api.onUpdateError(()     => setUpdateState("error"));
    window.api.onUpdateNotAvailable(() => setUpdateState("uptodate"));
    window.api.getVersion().then(v => setVersion(v)).catch(() => {});
    const t = setTimeout(() => setUpdateState(s => s === "checking" ? "uptodate" : s), 8000);
    return () => clearTimeout(t);
  }, []);

  function startScramble(i: number) {
    const label = CHECKS[i].label;
    let frame = 0;
    const FRAMES = 18;
    clearInterval(scrambleTimers.current[i]);
    scrambleTimers.current[i] = setInterval(() => {
      frame++;
      if (frame >= FRAMES) {
        clearInterval(scrambleTimers.current[i]);
        setDisplayLabels(prev => { const n = [...prev]; n[i] = label; return n; });
        return;
      }
      const revealed = Math.floor((frame / FRAMES) * label.length);
      const scrambled = label.split("").map((ch, idx) => {
        if (ch === " ") return " ";
        if (idx < revealed) return ch;
        return SCR[Math.floor(Math.random() * SCR.length)];
      }).join("");
      setDisplayLabels(prev => { const n = [...prev]; n[i] = scrambled; return n; });
    }, 38);

    clearInterval(codeTimers.current[i]);
    codeTimers.current[i] = setInterval(() => {
      setCodes(prev => { const n = [...prev]; n[i] = randHex(); return n; });
    }, 60);
  }

  function lockCode(i: number) {
    clearInterval(codeTimers.current[i]);
    if (!lockedCodes.current[i]) lockedCodes.current[i] = randHex();
    const locked = lockedCodes.current[i];
    setCodes(prev => { const n = [...prev]; n[i] = locked; return n; });
  }

  // ── Intro animation ──────────────────────────────────────────────────────────

  useEffect(() => {
    const ROW_START_MS = CHECKS.map((_, i) => 2400 + i * 85);
    const mountedAt = Date.now();

    const tl = anime.timeline({ easing: "easeOutExpo" });
    tl
      // Grid fades in
      .add({ targets: ".boot-grid", opacity: [0, 1], duration: 700 })

      // Corner H lines snap in with overshoot
      .add({
        targets: ".boot-corner-h",
        scaleX: [0, 1.15, 1],
        duration: 380, delay: anime.stagger(50),
        easing: "easeOutBack",
      }, "-=350")

      // Corner V lines snap in
      .add({
        targets: ".boot-corner-v",
        scaleY: [0, 1.15, 1],
        duration: 380, delay: anime.stagger(50),
        easing: "easeOutBack",
      }, "-=420")

      // Corner glow flash
      .add({
        targets: [".boot-corner-h", ".boot-corner-v"],
        opacity: [1, 0.25, 1],
        duration: 220, delay: anime.stagger(20),
        easing: "easeOutQuad",
      }, "-=180")

      // Header text slides down
      .add({
        targets: ".boot-header",
        opacity: [0, 1], translateY: [-8, 0],
        duration: 380, easing: "easeOutQuad",
      }, "-=300")

      // Logo flickers in (CRT-style power-on)
      .add({
        targets: ".boot-logo",
        opacity: [0, 0.15, 0, 0.6, 0.1, 0.85, 0.4, 1],
        duration: 900,
        easing: "linear",
      }, "-=200")

      // Divider draws left-to-right
      .add({
        targets: ".boot-divider",
        scaleX: [0, 1],
        duration: 550, easing: "easeOutQuad",
      }, "-=150")

      // Divider glow tip sweeps
      .add({
        targets: ".boot-divider-tip",
        translateX: ["-100%", "2000%"],
        opacity: [0, 1, 0],
        duration: 550, easing: "easeOutCubic",
      }, "-=550")

      // Rows slide in with a brightness flash
      .add({
        targets: ".boot-row",
        opacity: [0, 1.0, 0.85, 1],
        translateX: [-12, 0],
        duration: 260, delay: anime.stagger(80),
        easing: "easeOutQuad",
      }, "-=150")

      // Progress bar track appears
      .add({ targets: ".boot-bar-track", opacity: [0, 1], duration: 300 });

    // ── Check runner ────────────────────────────────────────────────────────────

    let cancelled = false;
    (async () => {
      for (let i = 0; i < CHECKS.length; i++) {
        if (cancelled) return;
        const wait = ROW_START_MS[i] - (Date.now() - mountedAt);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (cancelled) return;

        startScramble(i);
        setStatuses(prev => { const n = [...prev]; n[i] = "running"; return n; });

        const [result] = await Promise.all([
          CHECKS[i].run(),
          new Promise<void>(r => setTimeout(r, 750)),
        ]);
        if (cancelled) return;

        lockCode(i);
        setStatuses(prev => { const n = [...prev]; n[i] = result ? "ok" : "fail"; return n; });
        setProgress(Math.round(((i + 1) / CHECKS.length) * 100));

        // Dot pulse on complete
        setPulseIdx(i);
        setTimeout(() => setPulseIdx(null), 600);

        // Brief row flash on complete
        const rowEl = document.querySelectorAll(".boot-row")[i] as HTMLElement | undefined;
        if (rowEl) {
          anime({
            targets: rowEl,
            opacity: [1, 0.4, 1],
            duration: 200, easing: "easeOutQuad",
          });
        }

        if (i < CHECKS.length - 1) {
          await new Promise(r => setTimeout(r, 150));
          if (cancelled) return;
        }
      }
      await new Promise(r => setTimeout(r, 450));
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      tl.pause();
      scrambleTimers.current.forEach(clearInterval);
      codeTimers.current.forEach(clearInterval);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    anime({
      targets: [".boot-enter", ".boot-footer"],
      opacity: [0, 1], translateY: [10, 0],
      duration: 600, easing: "easeOutExpo", delay: anime.stagger(80),
    });
  }, [ready]);

  // ── Exit animation ──────────────────────────────────────────────────────────

  function handleStart() {
    scrambleTimers.current.forEach(clearInterval);
    codeTimers.current.forEach(clearInterval);

    const tl = anime.timeline({ easing: "easeInQuad" });
    tl
      .add({ targets: ".boot-corner-h", scaleX: [1, 3], opacity: [1, 0], duration: 260, easing: "easeInCubic", delay: anime.stagger(20) })
      .add({ targets: ".boot-corner-v", scaleY: [1, 3], opacity: [1, 0], duration: 260, easing: "easeInCubic", delay: anime.stagger(20) }, "-=260")
      .add({ targets: ".boot-logo",     opacity: [null, 0, 0.3, 0], scale: [1, 1.05], duration: 220, easing: "linear" }, "-=200")
      .add({ targets: ".boot-header",   opacity: [null, 0], duration: 150 }, "-=220")
      .add({
        targets: [".boot-row", ".boot-bar-track", ".boot-enter", ".boot-footer", ".boot-divider"],
        opacity: [null, 0], translateY: [0, -5],
        duration: 120, delay: anime.stagger(8),
      }, "-=150")
      .add({ targets: ".boot-grid", backgroundSize: ["44px 44px", "130px 130px"], opacity: [null, 0], duration: 250 }, "-=80")
      .add({
        targets: ".boot-flash",
        opacity: [0, 1], duration: 190, easing: "easeOutQuad",
        begin: () => { window.api.expandWindow().catch(() => {}); },
        complete: onComplete,
      }, "-=110");
  }

  function statusColor(s: CheckStatus): string {
    if (s === "pending") return "rgba(0,212,255,0.2)";
    if (s === "running") return C;
    if (s === "ok")      return C;
    return "#ff3a3a";
  }
  function statusText(s: CheckStatus): string {
    if (s === "pending") return "· · ·";
    if (s === "running") return "LOADING";
    if (s === "ok")      return "ONLINE";
    return "OFFLINE";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ backgroundColor: BG }}
    >
      {/* Subtle CRT flicker overlay */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ animation: "boot-flicker 8s linear infinite", opacity: 0 }} />

      {/* Grid */}
      <div className="boot-grid absolute inset-0 pointer-events-none opacity-0" style={{
        backgroundImage: `linear-gradient(${CD} 1px,transparent 1px),linear-gradient(90deg,${CD} 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Scan line */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          animation: "boot-scan 3s linear 0.3s forwards",
          position: "absolute", width: "100%", height: "2px",
          background: `linear-gradient(90deg,transparent 5%,${C} 50%,transparent 95%)`,
          boxShadow: `0 0 8px 2px ${C}`,
          opacity: 0, top: 0,
        }} />
      </div>

      {/* Corner brackets */}
      {[
        { cls: "absolute top-6 left-6",                               hO: "origin-left",  vO: "origin-top",    mt: "-mt-px" },
        { cls: "absolute top-6 right-6 flex flex-col items-end",      hO: "origin-right", vO: "origin-top",    mt: "-mt-px" },
        { cls: "absolute bottom-6 left-6 flex flex-col-reverse",      hO: "origin-left",  vO: "origin-bottom", mt: "-mb-px" },
        { cls: "absolute bottom-6 right-6 flex flex-col-reverse items-end", hO: "origin-right", vO: "origin-bottom", mt: "-mb-px" },
      ].map((c, i) => (
        <div key={i} className={`${c.cls} pointer-events-none`}>
          <span className={`boot-corner-h block h-px w-12 ${c.hO}`}
            style={{ background: C, opacity: 0.75, boxShadow: `0 0 4px 0px ${C}` }} />
          <span className={`boot-corner-v block w-px h-12 ${c.vO} ${c.mt}`}
            style={{ background: C, opacity: 0.75, boxShadow: `0 0 4px 0px ${C}` }} />
        </div>
      ))}

      {/* Header */}
      <div className="boot-header absolute top-6 inset-x-0 flex justify-center opacity-0 pointer-events-none">
        <span className="text-[8px] font-mono tracking-[0.45em] uppercase" style={{ color: C, opacity: 0.35 }}>
          BOOT SEQUENCE ACTIVE
        </span>
      </div>

      {/* Center panel */}
      <div className="relative flex flex-col items-center w-72" style={{ gap: "1.1rem" }}>

        {/* Logo */}
        <div className="boot-logo opacity-0 pointer-events-none"
          style={{ "--color-quant": C, "--color-ink": "#c8eeff" } as React.CSSProperties}>
          <CrestLogo height={44} />
        </div>

        {/* Divider with tip element */}
        <div className="boot-divider relative w-full h-px overflow-visible origin-left" style={{ background: C, opacity: 0.18 }}>
          <span className="boot-divider-tip absolute inset-y-0 left-0 w-6 pointer-events-none"
            style={{ background: `linear-gradient(90deg,transparent,white,rgba(0,212,255,0.4))`, opacity: 0, transform: "translateX(-100%)" }} />
        </div>

        {/* Check rows */}
        <div className="w-full flex flex-col gap-2.5">
          {CHECKS.map((c, i) => (
            <div key={i} className="boot-row opacity-0 flex items-center gap-3 text-[11px] font-mono">
              {/* Status dot with pulse ring */}
              <span className="relative shrink-0 flex items-center justify-center w-3 h-3">
                <span className="w-1.5 h-1.5 rounded-full block"
                  style={{
                    background: statusColor(statuses[i]),
                    opacity: statuses[i] === "pending" ? 0.3 : 1,
                    boxShadow: statuses[i] === "running" ? `0 0 7px 1px ${C}` : "none",
                    transition: "box-shadow 0.3s",
                  }}
                />
                {pulseIdx === i && (
                  <span className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ animation: "boot-dot-pulse 0.6s ease-out forwards", border: `1px solid ${C}` }} />
                )}
              </span>

              {/* Label */}
              <span className="flex-1 tracking-wider transition-opacity duration-200"
                style={{ color: statusColor(statuses[i]), opacity: statuses[i] === "pending" ? 0.3 : 1 }}>
                {displayLabels[i]}
              </span>

              {/* Hex code */}
              <span className="text-[9px] tabular-nums font-mono shrink-0"
                style={{ color: C, opacity: statuses[i] === "pending" ? 0.12 : 0.45 }}>
                [{codes[i]}]
              </span>

              {/* Status text */}
              <span className={`shrink-0 ${statuses[i] === "running" ? "animate-pulse" : ""}`}
                style={{ color: statusColor(statuses[i]), opacity: statuses[i] === "pending" ? 0.2 : 1, minWidth: 52, textAlign: "right" }}>
                {statusText(statuses[i])}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="boot-bar-track w-full opacity-0">
          <div className="relative w-full overflow-hidden" style={{ height: 1, background: "rgba(0,212,255,0.1)" }}>
            <div
              className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: C,
                boxShadow: progress > 0 ? `0 0 8px 2px rgba(0,212,255,0.5)` : "none",
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono" style={{ color: C, opacity: 0.3 }}>
            <span>INIT</span><span>{progress}%</span>
          </div>
        </div>

        {/* Enter button */}
        <div className="boot-enter w-full" style={{ opacity: 0, pointerEvents: ready ? "auto" : "none" }}>
          <EnterButton onClick={handleStart} />
        </div>
      </div>

      {/* Footer */}
      <div className="boot-footer absolute bottom-8 inset-x-0 flex items-center justify-between px-8 opacity-0">
        <span className="text-xs font-mono tracking-widest" style={{ color: C, opacity: 0.38 }}>v{version}</span>
        <UpdateFooter state={updateState} version={updateVersion} onInstall={handleStart} />
      </div>

      <div className="boot-flash fixed inset-0 pointer-events-none opacity-0" style={{ backgroundColor: BG, zIndex: 10 }} />

      <style>{`
        @keyframes boot-scan {
          from { top: -2px; opacity: 0 }
          4%   { opacity: 0.9 }
          96%  { opacity: 0.3 }
          to   { top: 100%; opacity: 0 }
        }
        @keyframes boot-dot-pulse {
          0%   { transform: scale(1);   opacity: 0.9 }
          100% { transform: scale(3.5); opacity: 0   }
        }
        @keyframes boot-flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 0 }
          20%, 24%, 55%                           { opacity: 0.03 }
        }
      `}</style>
    </div>
  );
}

// ── UpdateFooter ────────────────────────────────────────────────────────────────

const C_U = "#00d4ff";

function DownloadingDots({ label }: { label: string }) {
  const [f, setF] = useState(0);
  useEffect(() => { const id = setInterval(() => setF(x => (x+1)%4), 500); return () => clearInterval(id); }, []);
  return <span style={{ color: C_U, fontFamily: "monospace" }}>{label}<span style={{ opacity: 0.45 }}>{["   ",".  ",".. ","..."][f]}</span></span>;
}

function UpdateFooter({ state, version, onInstall }: { state: UpdateState; version: string | null; onInstall: () => void }) {
  const base: React.CSSProperties = { color: C_U, opacity: 0.35 };
  if (state === "checking")   return <span className="text-xs font-mono animate-pulse tracking-wider" style={base}>CHECKING FOR UPDATES…</span>;
  if (state === "uptodate")   return <span className="text-xs font-mono tracking-wider" style={{ ...base, opacity: 0.25 }}>UP TO DATE</span>;
  if (state === "error")      return <span className="text-xs font-mono tracking-wider" style={{ color: "#ff3a3a", opacity: 0.5 }}>UPDATE CHECK FAILED</span>;
  if (state === "available")  return <DownloadingDots label={`DOWNLOADING v${version}`} />;
  if (state === "downloaded") return (
    <button
      onClick={e => { e.stopPropagation(); onInstall(); }}
      className="text-xs font-mono px-3 py-1 tracking-wider transition-all"
      style={{ color: C_U, border: `1px solid ${C_U}`, opacity: 0.9 }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "1"; b.style.background = "rgba(0,212,255,0.1)"; }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "0.9"; b.style.background = "transparent"; }}
    >
      v{version} READY — INSTALL &amp; RESTART
    </button>
  );
  return null;
}

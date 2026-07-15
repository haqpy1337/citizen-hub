import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { getOreCommodities, getRefineryStations, getRefineryMethods } from "../lib/uex/endpoints";
import CrestLogo from "./CrestLogo";

interface Props { onComplete: () => void }

type CheckStatus = "pending" | "running" | "ok" | "fail";
type UpdateState = "checking" | "uptodate" | "available" | "downloaded" | "error";

interface Check { label: string; run: () => Promise<boolean> }

const CHECKS: Check[] = [
  {
    label: "LOCAL DATABASE",
    run: async () => { try { return await window.api.dbPing(); } catch { return false; } },
  },
  {
    label: "UEX CORP API",
    run: async () => {
      try { const r = await getOreCommodities(); return r.length > 0; } catch { return false; }
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
    run: async () => { try { await window.api.getVersion(); return true; } catch { return false; } },
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

const BG  = "#000c18";
const C   = "#00d4ff";
const CD  = "rgba(0,212,255,0.07)";
const SCR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=:<>";

function randHex() { return Math.random().toString(16).slice(2, 6).toUpperCase(); }

export default function BootScreen({ onComplete }: Props) {
  const [statuses, setStatuses]             = useState<CheckStatus[]>(CHECKS.map(() => "pending"));
  const [progress, setProgress]             = useState(0);
  const [ready, setReady]                   = useState(false);
  const [version, setVersion]               = useState("…");
  const [updateState, setUpdateState]       = useState<UpdateState>("checking");
  const [updateVersion, setUpdateVersion]   = useState<string | null>(null);
  const [displayLabels, setDisplayLabels]   = useState(CHECKS.map(c => c.label));
  const [codes, setCodes]                   = useState(CHECKS.map(() => "····"));

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
    const FRAMES = 16;
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
    }, 40);

    clearInterval(codeTimers.current[i]);
    codeTimers.current[i] = setInterval(() => {
      setCodes(prev => { const n = [...prev]; n[i] = randHex(); return n; });
    }, 65);
  }

  function lockCode(i: number) {
    clearInterval(codeTimers.current[i]);
    if (!lockedCodes.current[i]) lockedCodes.current[i] = randHex();
    const locked = lockedCodes.current[i];
    setCodes(prev => { const n = [...prev]; n[i] = locked; return n; });
  }

  useEffect(() => {
    const ROW_START_MS = CHECKS.map((_, i) => 2600 + i * 90);
    const mountedAt = Date.now();

    const tl = anime.timeline({ easing: "easeOutExpo" });
    tl
      .add({ targets: ".boot-grid",     opacity: [0, 1],                  duration: 600 })
      .add({ targets: ".boot-corner-h", scaleX:  [0, 1],                  duration: 320, delay: anime.stagger(55), easing: "easeOutQuad" }, "-=300")
      .add({ targets: ".boot-corner-v", scaleY:  [0, 1],                  duration: 320, delay: anime.stagger(55), easing: "easeOutQuad" }, "-=380")
      .add({ targets: ".boot-header",   opacity: [0, 1], translateY: [-6, 0], duration: 400 }, "-=200")
      .add({ targets: ".boot-logo",     opacity: [0, 1], translateY: [14, 0], duration: 500 }, "-=250")
      .add({ targets: ".boot-divider",  scaleX:  [0, 1],                  duration: 500, easing: "easeOutQuad" }, "-=100")
      .add({ targets: ".boot-row",      opacity: [0, 1], translateY: [6, 0], duration: 280, delay: anime.stagger(90) }, "-=100")
      .add({ targets: ".boot-bar-track",opacity: [0, 1],                  duration: 300 });

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

        if (i < CHECKS.length - 1) {
          await new Promise(r => setTimeout(r, 160));
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
      opacity: [0, 1], translateY: [12, 0],
      duration: 600, easing: "easeOutExpo", delay: anime.stagger(80),
    });
  }, [ready]);

  function handleStart() {
    scrambleTimers.current.forEach(clearInterval);
    codeTimers.current.forEach(clearInterval);

    const tl = anime.timeline({ easing: "easeInQuad" });
    tl
      .add({ targets: ".boot-corner-h", scaleX:  [1, 2.8], opacity: [1, 0], duration: 260, easing: "easeInCubic" })
      .add({ targets: ".boot-corner-v", scaleY:  [1, 2.8], opacity: [1, 0], duration: 260, easing: "easeInCubic" }, "-=260")
      .add({ targets: ".boot-logo",     opacity: [null, 0], scale: [1, 1.06], duration: 180 }, "-=200")
      .add({ targets: ".boot-header",   opacity: [null, 0], duration: 160 }, "-=200")
      .add({
        targets: [".boot-row", ".boot-bar-track", ".boot-enter", ".boot-footer", ".boot-divider"],
        opacity: [null, 0], translateY: [0, -4],
        duration: 130, delay: anime.stagger(8),
      }, "-=140")
      .add({ targets: ".boot-grid", backgroundSize: ["44px 44px", "120px 120px"], opacity: [null, 0], duration: 240 }, "-=80")
      .add({
        targets: ".boot-flash",
        opacity: [0, 1], duration: 200, easing: "easeOutQuad",
        begin: () => { window.api.expandWindow().catch(() => {}); },
        complete: onComplete,
      }, "-=120");
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
      {/* Grid */}
      <div className="boot-grid absolute inset-0 pointer-events-none opacity-0" style={{
        backgroundImage: `linear-gradient(${CD} 1px,transparent 1px),linear-gradient(90deg,${CD} 1px,transparent 1px)`,
        backgroundSize: "44px 44px",
      }} />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          animation: "boot-scan 3s linear 0.3s forwards",
          position: "absolute", width: "100%", height: "1px",
          background: `linear-gradient(90deg,transparent 5%,${C} 50%,transparent 95%)`,
          opacity: 0.35, top: 0,
        }} />
      </div>

      {/* Corner brackets */}
      {[
        { cls: "absolute top-6 left-6 pointer-events-none",                              hOrigin: "origin-left",  vOrigin: "origin-top",    vMt: "-mt-px" },
        { cls: "absolute top-6 right-6 pointer-events-none flex flex-col items-end",     hOrigin: "origin-right", vOrigin: "origin-top",    vMt: "-mt-px" },
        { cls: "absolute bottom-6 left-6 pointer-events-none flex flex-col-reverse",     hOrigin: "origin-left",  vOrigin: "origin-bottom", vMt: "-mb-px" },
        { cls: "absolute bottom-6 right-6 pointer-events-none flex flex-col-reverse items-end", hOrigin: "origin-right", vOrigin: "origin-bottom", vMt: "-mb-px" },
      ].map((corner, i) => (
        <div key={i} className={corner.cls}>
          <span className={`boot-corner-h block h-px w-10 ${corner.hOrigin}`} style={{ background: C, opacity: 0.7 }} />
          <span className={`boot-corner-v block w-px h-10 ${corner.vOrigin} ${corner.vMt}`} style={{ background: C, opacity: 0.7 }} />
        </div>
      ))}

      {/* Header line */}
      <div className="boot-header absolute top-6 left-0 right-0 flex items-center justify-center opacity-0" style={{ pointerEvents: "none" }}>
        <span className="text-[9px] font-mono tracking-[0.3em] uppercase" style={{ color: C, opacity: 0.4 }}>
          BOOT SEQUENCE ACTIVE
        </span>
      </div>

      {/* Center panel */}
      <div className="relative flex flex-col items-center w-72" style={{ gap: "1.1rem" }}>

        {/* Logo */}
        <div className="boot-logo opacity-0" style={{ "--color-quant": C, "--color-ink": "#c8eeff" } as React.CSSProperties}>
          <CrestLogo height={44} />
        </div>

        <div className="boot-divider w-full h-px origin-left" style={{ background: C, opacity: 0.18 }} />

        {/* Check rows */}
        <div className="w-full flex flex-col gap-2">
          {CHECKS.map((c, i) => (
            <div key={i} className="boot-row opacity-0 flex items-center justify-between text-[11px] font-mono gap-3">
              {/* Indicator dot */}
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full"
                style={{
                  background: statusColor(statuses[i]),
                  opacity: statuses[i] === "pending" ? 0.3 : 1,
                  boxShadow: statuses[i] === "running" ? `0 0 6px 1px ${C}` : "none",
                }}
              />
              {/* Label */}
              <span
                className="flex-1 tracking-wider"
                style={{ color: statusColor(statuses[i]), opacity: statuses[i] === "pending" ? 0.3 : 1 }}
              >
                {displayLabels[i]}
              </span>
              {/* Hex code */}
              <span className="text-[9px] font-mono tabular-nums" style={{ color: C, opacity: statuses[i] === "pending" ? 0.15 : 0.5 }}>
                [{codes[i]}]
              </span>
              {/* Status */}
              <span
                className={statuses[i] === "running" ? "animate-pulse" : ""}
                style={{ color: statusColor(statuses[i]), opacity: statuses[i] === "pending" ? 0.25 : 1, minWidth: 56, textAlign: "right" }}
              >
                {statusText(statuses[i])}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="boot-bar-track w-full opacity-0">
          <div className="relative w-full h-px overflow-hidden" style={{ background: "rgba(0,212,255,0.1)" }}>
            <div
              className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: C, boxShadow: `0 0 6px 2px ${C}` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono" style={{ color: C, opacity: 0.3 }}>
            <span>INIT</span><span>{progress}%</span>
          </div>
        </div>

        {/* Enter button */}
        <div className="boot-enter w-full" style={{ opacity: 0, pointerEvents: ready ? "auto" : "none" }}>
          <button
            onClick={handleStart}
            className="w-full py-2.5 text-sm font-mono font-semibold tracking-[0.3em] uppercase rounded transition-all active:scale-95"
            style={{ border: `1px solid ${C}`, color: C, opacity: 0.85, background: "transparent" }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.opacity = "1";
              b.style.background = "rgba(0,212,255,0.06)";
              b.style.boxShadow = `0 0 18px 0px rgba(0,212,255,0.2)`;
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.opacity = "0.85";
              b.style.background = "transparent";
              b.style.boxShadow = "none";
            }}
          >
            — ENTER —
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="boot-footer absolute bottom-8 left-0 right-0 flex items-center justify-between px-8" style={{ opacity: 0 }}>
        <span className="text-xs font-mono tracking-widest" style={{ color: C, opacity: 0.4 }}>v{version}</span>
        <UpdateFooter state={updateState} version={updateVersion} onInstall={handleStart} />
      </div>

      <div className="boot-flash fixed inset-0 pointer-events-none opacity-0" style={{ backgroundColor: BG, zIndex: 10 }} />

      <style>{`
        @keyframes boot-scan {
          from { top: -1px; opacity: 0 }
          4%   { opacity: 0.8 }
          96%  { opacity: 0.3 }
          to   { top: 100%; opacity: 0 }
        }
      `}</style>
    </div>
  );
}

// ── UpdateFooter ───────────────────────────────────────────────────────────────

const C_UPDATE = "#00d4ff";

function DownloadingDots({ label }: { label: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  const dots = ["   ", ".  ", ".. ", "..."][frame];
  return <span style={{ color: C_UPDATE, fontFamily: "monospace" }}>{label}<span style={{ opacity: 0.5 }}>{dots}</span></span>;
}

function UpdateFooter({ state, version, onInstall }: {
  state: UpdateState; version: string | null; onInstall: () => void;
}) {
  const base: React.CSSProperties = { color: C_UPDATE, opacity: 0.38 };
  if (state === "checking")   return <span className="text-xs font-mono animate-pulse tracking-wider" style={base}>CHECKING FOR UPDATES…</span>;
  if (state === "uptodate")   return <span className="text-xs font-mono tracking-wider" style={{ ...base, opacity: 0.28 }}>UP TO DATE</span>;
  if (state === "error")      return <span className="text-xs font-mono tracking-wider" style={{ color: "#ff3a3a", opacity: 0.5 }}>UPDATE CHECK FAILED</span>;
  if (state === "available")  return <DownloadingDots label={`DOWNLOADING v${version}`} />;
  if (state === "downloaded") return (
    <button
      onClick={e => { e.stopPropagation(); onInstall(); }}
      className="text-xs font-mono px-3 py-1 tracking-wider transition-all"
      style={{ color: C_UPDATE, border: `1px solid ${C_UPDATE}`, opacity: 0.9 }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "1"; b.style.background = "rgba(0,212,255,0.1)"; }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "0.9"; b.style.background = "transparent"; }}
    >
      v{version} READY — INSTALL &amp; RESTART
    </button>
  );
  return null;
}

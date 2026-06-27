"use client";

import { useEffect, useState } from "react";

/* Fixed star positions — no Math.random(), no SSR mismatch */
const S = [
  [5,12,.8],[12,3,1.2],[18,88,.6],[23,45,1],[28,67,.7],[33,22,1.3],[38,79,.5],
  [42,9,.9],[47,55,1.1],[51,38,.6],[55,91,1.4],[59,17,.8],[63,72,.7],[67,33,1],
  [71,58,.5],[75,6,1.2],[79,84,.9],[82,47,.6],[86,25,1.1],[90,63,.8],[94,41,.7],
  [8,77,1],[15,52,.5],[21,31,1.3],[36,95,.6],[44,18,.9],[57,83,1.1],[69,7,.7],
  [77,96,1.2],[88,14,.8],[3,60,.6],[95,75,1],[49,2,.9],[31,40,.5],[62,28,1.3],
  [85,52,.7],[10,35,1.1],[40,70,.8],[73,19,.6],[92,88,1.2],[25,56,.9],[53,44,.7],
  [78,30,1],[16,68,.5],[65,93,1.1],[7,24,.8],[46,81,1.3],[83,11,.6],[34,50,.9],
  [97,37,.7],[19,86,1],[58,15,.5],[80,65,1.2],[27,4,.8],[43,73,.6],[70,46,1.1],
  [1,92,.9],[89,28,.7],[37,61,1.3],[54,8,.5],[13,48,1],[66,97,.8],[93,55,.6],
  [4,19,1.2],[48,89,.9],[76,34,.7],[22,76,1.1],[60,23,.5],[98,68,.8],[50,99,.6],
];

function Ship() {
  return (
    <svg viewBox="0 0 400 110" width="340" height="93" fill="none">
      <ellipse cx="368" cy="55" rx="32" ry="22" fill="rgba(217,74,10,0.06)"/>
      <ellipse cx="362" cy="55" rx="20" ry="14" fill="rgba(217,74,10,0.10)"/>
      <path d="M85 55 L62 39 L245 32 L280 45 L292 55 L280 65 L245 78 L62 71Z" fill="#1c1810" stroke="#d94a0a" strokeWidth=".6"/>
      <path d="M85 55 L105 39 L245 32 L245 40 L115 46Z" fill="#231f14"/>
      <path d="M85 55 L105 71 L245 78 L245 70 L115 64Z" fill="#19160e"/>
      <path d="M62 39 L28 48 L28 62 L62 71 L85 55Z" fill="#14120a" stroke="#d94a0a" strokeWidth=".5"/>
      <path d="M32 44 L57 39 L72 55 L57 71 L32 66Z" fill="rgba(20,80,200,.22)" stroke="#3a80c0" strokeWidth=".8"/>
      <path d="M36 47 L54 43 L65 55 L54 67 L36 63Z" fill="rgba(40,110,230,.12)"/>
      <path d="M38 46 L54 43 L58 51 L42 53Z" fill="rgba(160,200,255,.13)"/>
      <path d="M28 48 L4 55 L28 62Z" fill="#1a1610" stroke="#d94a0a" strokeWidth=".5"/>
      <circle cx="8" cy="55" r="2.5" fill="#d94a0a" opacity=".7"/>
      <path d="M258 38 L292 46 L292 64 L258 72 L253 55Z" fill="#141010" stroke="#d94a0a" strokeWidth=".5"/>
      <ellipse cx="292" cy="55" rx="3.5" ry="11" fill="#1a0a04" stroke="#d94a0a" strokeWidth=".9"/>
      <path d="M293 47 L332 55 L293 63Z" fill="rgba(217,74,10,.65)"/>
      <path d="M293 49 L355 55 L293 61Z" fill="rgba(217,74,10,.3)"/>
      <path d="M293 51 L375 55 L293 59Z" fill="rgba(217,74,10,.12)"/>
      <ellipse cx="296" cy="55" rx="2" ry="7" fill="rgba(255,190,90,.95)"
        style={{animation:"ls-pulse .7s ease-in-out 1.6s infinite"}}/>
      <ellipse cx="300" cy="55" rx="3" ry="5" fill="rgba(255,130,40,.6)"/>
      <path d="M118 32 L113 8 L128 8 L132 32" fill="#161210" stroke="#4a4440" strokeWidth=".6"/>
      <rect x="112" y="4" width="18" height="6" rx="1" fill="#1a1510" stroke="#d94a0a" strokeWidth=".4"/>
      <path d="M158 32 L153 4 L168 4 L171 32" fill="#161210" stroke="#4a4440" strokeWidth=".6"/>
      <rect x="152" y="0" width="18" height="6" rx="1" fill="#1a1510" stroke="#d94a0a" strokeWidth=".4"/>
      <path d="M198 32 L195 10 L208 10 L211 32" fill="#161210" stroke="#4a4440" strokeWidth=".6"/>
      <rect x="194" y="6" width="16" height="6" rx="1" fill="#1a1510" stroke="#d94a0a" strokeWidth=".4"/>
      <line x1="105" y1="41" x2="248" y2="35" stroke="#3a342d" strokeWidth=".5"/>
      <line x1="105" y1="69" x2="248" y2="75" stroke="#3a342d" strokeWidth=".5"/>
      <line x1="133" y1="35" x2="133" y2="75" stroke="#2a2420" strokeWidth=".5"/>
      <line x1="173" y1="33" x2="173" y2="77" stroke="#2a2420" strokeWidth=".5"/>
      <rect x="100" y="51" width="148" height="3" fill="#d94a0a" opacity=".2"/>
      <ellipse cx="90" cy="55" rx="7" ry="5" fill="#141210" stroke="#d94a0a" strokeWidth=".4"/>
      <ellipse cx="90" cy="55" rx="3.5" ry="2.5" fill="rgba(217,74,10,.55)"/>
      <line x1="120" y1="32" x2="108" y2="14" stroke="#4a4440" strokeWidth=".5"/>
      <circle cx="108" cy="14" r="1.8" fill="#d94a0a" opacity=".75"/>
    </svg>
  );
}

const A = (d: string, del: number, fill = "forwards") =>
  ({ animation: `${d} ${fill}`, animationDelay: `${del}s`, opacity: 0 } as React.CSSProperties);

export default function LoadingScreen() {
  /* Only show on client — this is the ONE pattern that always works in Next.js App Router */
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 3900);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#090806",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      ...A("ls-out .6s ease-in", 3.2),
    }}>

      {/* Stars */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
        {S.map(([x,y,r], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="white"
            style={A(`ls-fade .5s ease`, i * 0.012)} />
        ))}
      </svg>

      {/* HUD corners */}
      <div style={{ position:"absolute", top:20, left:20, width:40, height:40,
        borderTop:"2px solid #d94a0a", borderLeft:"2px solid #d94a0a",
        ...A("ls-ctleft .4s cubic-bezier(.16,1,.3,1)", .1) }}/>
      <div style={{ position:"absolute", top:20, right:20, width:40, height:40,
        borderTop:"2px solid #d94a0a", borderRight:"2px solid #d94a0a",
        ...A("ls-ctright .4s cubic-bezier(.16,1,.3,1)", .15) }}/>
      <div style={{ position:"absolute", bottom:20, left:20, width:40, height:40,
        borderBottom:"2px solid #d94a0a", borderLeft:"2px solid #d94a0a",
        ...A("ls-cbleft .4s cubic-bezier(.16,1,.3,1)", .2) }}/>
      <div style={{ position:"absolute", bottom:20, right:20, width:40, height:40,
        borderBottom:"2px solid #d94a0a", borderRight:"2px solid #d94a0a",
        ...A("ls-cbright .4s cubic-bezier(.16,1,.3,1)", .25) }}/>

      {/* HUD labels */}
      <div style={{ position:"absolute", top:32, left:80,
        fontFamily:"monospace", fontSize:9, letterSpacing:"0.3em",
        color:"rgba(217,74,10,.4)", userSelect:"none" }}>SYS.BOOT v2.4.1</div>
      <div style={{ position:"absolute", bottom:32, right:80,
        fontFamily:"monospace", fontSize:9, letterSpacing:"0.3em",
        color:"rgba(217,74,10,.4)", userSelect:"none" }}>UEX.LINK ACTIVE</div>

      {/* Content */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, userSelect:"none" }}>

        {/* Logo */}
        <div style={A("ls-up .6s cubic-bezier(.16,1,.3,1)", .4)}>
          <div style={{
            fontFamily:"var(--font-rajdhani, sans-serif)", fontWeight:700,
            fontSize:"clamp(3rem,8vw,5rem)", letterSpacing:"0.25em", textAlign:"center",
            color:"#d94a0a",
            textShadow:"0 0 40px rgba(217,74,10,.7), 0 0 80px rgba(217,74,10,.3)",
          }}>hMA</div>
          <div style={{
            fontFamily:"monospace", fontSize:11, letterSpacing:"0.5em",
            textTransform:"uppercase", textAlign:"center", marginTop:4,
            color:"#6a6058", ...A("ls-fade .5s ease", .85),
          }}>haqpy&apos;s miner assistant</div>
        </div>

        {/* Ship: slides in, then warps out */}
        <div style={{
          opacity: 0,
          animation: "ls-in .9s cubic-bezier(.16,1,.3,1) .7s forwards, ls-warp .55s ease-in 2.65s forwards",
        }}>
          <Ship />
        </div>

        {/* Status */}
        <div style={{
          fontFamily:"monospace", fontSize:11, letterSpacing:"0.35em",
          textTransform:"uppercase", color:"#5aaa30",
          display:"flex", alignItems:"center", gap:8,
          ...A("ls-up .4s ease", 1.65),
        }}>
          <span style={{
            display:"inline-block", width:8, height:8, borderRadius:"50%",
            background:"#5aaa30", boxShadow:"0 0 8px #5aaa30",
          }}/>
          Systems Online — Initiating Jump
        </div>
      </div>

      {/* Warp flash */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 60% 40% at center, rgba(217,74,10,.85) 0%, rgba(217,74,10,.3) 40%, transparent 70%)",
        ...A("ls-flash .4s ease-out", 2.8),
      }}/>
    </div>
  );
}

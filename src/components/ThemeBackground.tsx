import { useEffect, useRef, useState } from "react";
import anime from "animejs";

function getTheme(): string {
  const m = document.documentElement.className.match(/theme-(\w+)/);
  return m ? m[1] : "mole";
}

export default function ThemeBackground() {
  const [theme, setTheme] = useState(getTheme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const map: Record<string, React.ReactElement> = {
    mole:    <MoleBg    key="mole"    />,
    cockpit: <CockpitBg key="cockpit" />,
    origin:  <OriginBg  key="origin"  />,
    gatac:   <GatacBg   key="gatac"   />,
    hornet:  <HornetBg  key="hornet"  />,
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {map[theme] ?? map["mole"]}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MOLE — ARGO Industrial ore-mining barge
   Heavy grid of rivet-dots + slow horizontal scan beam that sweeps the hull
   ═══════════════════════════════════════════════════════════════════════════════ */
function MoleBg() {
  const sweepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Staggered pulse radiating outward from center — industrial "power cycle"
    const pulse = anime({
      targets: ".mole-dot",
      opacity: [0.04, 0.45],
      scale: [0.5, 1.4],
      duration: 2600,
      delay: anime.stagger(85, { grid: [18, 11], from: "center" }),
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    // Scan beam drifts down the hull every ~5.5s
    const sweep = anime({
      targets: sweepRef.current,
      translateY: ["-12vh", "112vh"],
      duration: 5800,
      delay: 600,
      loop: true,
      easing: "linear",
    });

    // Corner "weld-spark" flashes — random dots near edges briefly brighten
    const sparks = anime({
      targets: ".mole-spark",
      opacity: [0, 0.9, 0],
      scale: [0.5, 2, 0.5],
      duration: 300,
      delay: anime.stagger(900, { start: 1200 }),
      loop: true,
      easing: "easeInOutQuad",
    });

    return () => { pulse.pause(); sweep.pause(); sparks.pause(); };
  }, []);

  const COLS = 18, ROWS = 11;
  // Dots at grid intersections
  const dots = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => (
      <circle
        key={`${r}-${c}`}
        className="mole-dot"
        cx={`${((c + 0.5) / COLS) * 100}%`}
        cy={`${((r + 0.5) / ROWS) * 100}%`}
        r="2.5"
        fill="#e05010"
        opacity="0.04"
      />
    ))
  );

  // Weld-sparks near the four corners
  const sparkPositions = [
    [5, 8], [10, 6], [15, 9], [85, 7], [90, 12], [82, 5],
    [7, 88], [12, 92], [88, 90], [92, 85],
  ];

  return (
    <div className="absolute inset-0">
      {/* Background grid lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
        <defs>
          <pattern id="moleGrid" x="0" y="0" width="5.55%" height="9.09%" patternUnits="objectBoundingBox">
            <path d="M 0 0 L 0 100% M 0 0 L 100% 0" fill="none" stroke="#e05010" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#moleGrid)" />
      </svg>

      {/* Rivet dots */}
      <svg className="absolute inset-0 w-full h-full">
        {dots}
        {sparkPositions.map(([cx, cy], i) => (
          <circle key={i} className="mole-spark" cx={`${cx}%`} cy={`${cy}%`}
            r="3" fill="#ff6820" opacity="0" />
        ))}
      </svg>

      {/* Scan beam */}
      <div ref={sweepRef} className="absolute left-0 right-0" style={{
        height: "18vh",
        top: 0,
        background: "linear-gradient(to bottom, transparent, rgba(224,80,16,0.09) 35%, rgba(224,80,16,0.05) 65%, transparent)",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COCKPIT — RSI Aurora CRT terminal
   Cascading terminal columns + phosphor scanline sweep across the whole UI
   ═══════════════════════════════════════════════════════════════════════════════ */
const TERM_LINES = [
  "> INIT 0xA4F2C8D0", "> NAVDATA SYNCED", "> QDRIVE STANDBY",
  "FF A0 3C 21 00 1F", "> ATMO -3200m/s", "48 65 6C 6C 6F 20",
  "> SHIELDS 100%",   "0A 1B 2C 3D 4E 5F", "> FUEL 82.4 pcu",
  "> QUANTUM LOCK",   "DE AD BE EF 00 FF", "> CARGO SEALED",
  "> TRANSPONDER ON", "A4 B5 C6 D7 E8 F9", "> MOBIGAS LINK",
  "01 23 45 67 89 AB", "> VELOCITY 0 m/s", "F0 0D CA FE 42 33",
  "> TARGETING OFF",  "C0 FF EE 1A 2B 3C",
];

function CockpitBg() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const LINE_H = 17;
  const N_UNIQ = TERM_LINES.length;
  const SCROLL_PX = N_UNIQ * LINE_H;
  const NUM_COLS = 9;

  useEffect(() => {
    if (!wrapRef.current) return;
    const cols = wrapRef.current.querySelectorAll<HTMLElement>(".cpit-col");
    const anims: anime.AnimeInstance[] = [];

    cols.forEach((col, i) => {
      anims.push(anime({
        targets: col,
        translateY: [0, -SCROLL_PX],
        duration: 13000 + i * 1400,
        delay: i * 650,
        loop: true,
        easing: "linear",
      }));
    });

    // Full-screen phosphor scanline sweeping downward
    const scan = anime({
      targets: scanRef.current,
      translateY: ["-4vh", "104vh"],
      duration: 3500,
      delay: 500,
      loop: true,
      easing: "linear",
    });

    anims.push(scan);
    return () => anims.forEach(a => a.pause());
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 flex">
      {Array.from({ length: NUM_COLS }, (_, ci) => {
        const offset = (ci * 4) % N_UNIQ;
        const lines = [...TERM_LINES.slice(offset), ...TERM_LINES.slice(0, offset)];
        return (
          <div key={ci} className="relative overflow-hidden flex-1 h-full"
            style={{ opacity: 0.045 + ci * 0.005 }}>
            <div className="cpit-col absolute top-0 left-0 right-0" style={{ willChange: "transform" }}>
              {/* Doubled for seamless loop */}
              {[...lines, ...lines].map((l, j) => (
                <div key={j} className="text-[7px] leading-[17px] px-0.5 font-mono truncate"
                  style={{ color: "#50e828" }}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Phosphor scan beam */}
      <div ref={scanRef} className="absolute left-0 right-0 pointer-events-none" style={{
        height: "8vh",
        top: 0,
        background: "linear-gradient(to bottom, transparent, rgba(80,232,40,0.06) 50%, transparent)",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ORIGIN — 890 Jump superyacht luxury
   Soft floating bokeh particles drifting upward + slow revolving light arcs
   ═══════════════════════════════════════════════════════════════════════════════ */
function OriginBg() {
  const ringsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    // Floating particles drift upward and fade
    anime({
      targets: ".origin-p",
      translateY: (_el: Element, i: number) => [0, -(100 + i * 18)],
      translateX: (_el: Element, i: number) => [(i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 8), 0],
      opacity: [
        { value: 0, duration: 0 },
        { value: 0.55, duration: 2200, easing: "easeOutSine" },
        { value: 0, duration: 2200, easing: "easeInSine" },
      ],
      scale: [0.4, 1.2],
      duration: 6500,
      delay: anime.stagger(380, { start: 0 }),
      loop: true,
      easing: "easeInOutSine",
    });

    // Slowly revolving decorative arc rings
    anime({
      targets: ringsRef.current,
      rotate: [0, 360],
      duration: 40000,
      loop: true,
      easing: "linear",
    });

    return () => anime.remove([".origin-p", ringsRef.current]);
  }, []);

  const N = 22;
  const particles = Array.from({ length: N }, (_, i) => ({
    x: 8 + (i * 4.1) % 84,
    y: 15 + (i * 3.7) % 70,
    size: 5 + (i % 4) * 4,
  }));

  return (
    <div className="absolute inset-0">
      {/* Bokeh particles */}
      {particles.map((p, i) => (
        <div key={i} className="origin-p absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: `${p.x}%`, top: `${p.y}%`,
            background: "radial-gradient(circle, rgba(14,111,170,0.9) 0%, rgba(14,111,170,0.3) 50%, transparent 100%)",
            filter: `blur(${1 + (i % 3)}px)`,
            opacity: 0,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Revolving arc rings centered in background */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <g ref={ringsRef} style={{ transformOrigin: "50% 50%" }}>
          {[180, 260, 340, 420].map((r, i) => (
            <ellipse key={i} cx="50%" cy="50%" rx={r} ry={r * 0.38}
              fill="none" stroke="#0e6faa" strokeWidth={i % 2 === 0 ? 1 : 0.5}
              strokeDasharray={`${r * 0.6} ${r * 0.3}`} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   GATAC — Alien bioluminescent technology
   Neural network of pulsing nodes + charge lines that ripple between them
   ═══════════════════════════════════════════════════════════════════════════════ */
// Node positions as % of viewport (x, y)
const GATAC_NODES: [number, number][] = [
  [8, 12], [28, 6], [52, 10], [78, 15], [92, 40],
  [88, 68], [62, 88], [36, 82], [10, 62], [18, 36],
  [42, 48], [68, 34], [30, 58], [72, 62],
];

// Which nodes connect with an edge
const GATAC_EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],
  [9,0],[9,10],[10,2],[10,12],[12,7],[11,3],[11,4],[11,10],
  [12,6],[13,5],[13,11],[13,10],
];

function GatacBg() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Node breathing — each node pulses with different phase
    anime({
      targets: ".gn-core",
      r: [4, 9],
      opacity: [0.15, 0.75],
      duration: 3200,
      delay: anime.stagger(240, { start: 0 }),
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    // Outer glow ring expands and fades
    anime({
      targets: ".gn-ring",
      r: [12, 28],
      opacity: [0.3, 0],
      duration: 3200,
      delay: anime.stagger(240, { start: 0 }),
      loop: true,
      easing: "easeOutQuad",
    });

    // Edges charge one-by-one — energy travels through the network
    anime({
      targets: ".gn-edge",
      strokeDashoffset: [anime.setDashoffset, 0],
      opacity: [0.04, 0.38, 0.04],
      duration: 3600,
      delay: anime.stagger(300, { start: 0 }),
      loop: true,
      easing: "easeInOutQuad",
    });

    // Second pass of edges in reverse for "return signal"
    anime({
      targets: ".gn-edge-r",
      strokeDashoffset: [0, anime.setDashoffset],
      opacity: [0.04, 0.22, 0.04],
      duration: 5000,
      delay: anime.stagger(500, { start: 1800 }),
      loop: true,
      easing: "easeInOutSine",
    });

    return () => {
      anime.remove([".gn-core", ".gn-ring", ".gn-edge", ".gn-edge-r"]);
    };
  }, []);

  return (
    <svg ref={svgRef} className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100" preserveAspectRatio="none">

      {/* Charge edges */}
      {GATAC_EDGES.map(([a, b], i) => {
        const [x1, y1] = GATAC_NODES[a];
        const [x2, y2] = GATAC_NODES[b];
        return (
          <g key={i}>
            <line className="gn-edge" x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#b848ff" strokeWidth="0.25" opacity="0.04"
              strokeDasharray="200" strokeDashoffset="200" />
            <line className="gn-edge-r" x1={x2} y1={y2} x2={x1} y2={y1}
              stroke="#d090ff" strokeWidth="0.15" opacity="0.04"
              strokeDasharray="200" strokeDashoffset="0" />
          </g>
        );
      })}

      {/* Nodes */}
      {GATAC_NODES.map(([cx, cy], i) => (
        <g key={i}>
          {/* Expanding glow ring */}
          <circle className="gn-ring" cx={cx} cy={cy} r="12"
            fill="none" stroke="#b848ff" strokeWidth="0.3" opacity="0.3" />
          {/* Core dot */}
          <circle className="gn-core" cx={cx} cy={cy} r="4"
            fill="#b848ff" opacity="0.15" />
          {/* Static bright center */}
          <circle cx={cx} cy={cy} r="1.2" fill="#e0b0ff" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HORNET — Anvil F7C military tactical HUD
   Rotating radar in corner + tactical brackets + target blips
   ═══════════════════════════════════════════════════════════════════════════════ */
function HornetBg() {
  const sweepRef = useRef<SVGGElement>(null);

  useEffect(() => {
    // Radar arm rotates continuously
    anime({
      targets: sweepRef.current,
      rotate: [0, 360],
      duration: 3500,
      loop: true,
      easing: "linear",
    });

    // Tactical corner brackets pulse
    anime({
      targets: ".h-bracket",
      opacity: [0.12, 0.5],
      duration: 2000,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
      delay: anime.stagger(280),
    });

    // Target blips appear and fade as the radar sweeps over them
    anime({
      targets: ".h-blip",
      opacity: [0, 1, 0.6, 0],
      scale: [0.5, 1.4, 1, 0.8],
      duration: 3500,
      delay: anime.stagger(700, { start: 400 }),
      loop: true,
      easing: "easeOutBack",
    });

    // Range ring that expands outward (ping effect)
    anime({
      targets: ".h-ping",
      r: [8, 95],
      opacity: [0.3, 0],
      duration: 3500,
      delay: 800,
      loop: true,
      easing: "easeOutQuad",
    });

    return () => {
      anime.remove([sweepRef.current, ".h-bracket", ".h-blip", ".h-ping"]);
    };
  }, []);

  // Radar centered at (100, 100), radius 90
  const CX = 100, CY = 100, R = 90;

  return (
    <div className="absolute inset-0">
      {/* Corner tactical brackets — full-screen SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="h-bracket" d="M2 10 L2 2 L10 2" fill="none" stroke="#2898d8" strokeWidth="0.6" opacity="0.12" />
        <path className="h-bracket" d="M90 2 L98 2 L98 10" fill="none" stroke="#2898d8" strokeWidth="0.6" opacity="0.12" />
        <path className="h-bracket" d="M2 90 L2 98 L10 98" fill="none" stroke="#2898d8" strokeWidth="0.6" opacity="0.12" />
        <path className="h-bracket" d="M90 98 L98 98 L98 90" fill="none" stroke="#2898d8" strokeWidth="0.6" opacity="0.12" />
        {/* HUD crosshair marks along edges */}
        <path className="h-bracket" d="M50 0 L50 3" fill="none" stroke="#2898d8" strokeWidth="0.4" opacity="0.1" />
        <path className="h-bracket" d="M50 97 L50 100" fill="none" stroke="#2898d8" strokeWidth="0.4" opacity="0.1" />
        <path className="h-bracket" d="M0 50 L3 50" fill="none" stroke="#2898d8" strokeWidth="0.4" opacity="0.1" />
        <path className="h-bracket" d="M97 50 L100 50" fill="none" stroke="#2898d8" strokeWidth="0.4" opacity="0.1" />
      </svg>

      {/* Radar — fixed size in bottom-right */}
      <svg width="220" height="220"
        className="absolute"
        style={{ bottom: "40px", right: "40px" }}
        viewBox="0 0 200 200">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2898d8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#2898d8" stopOpacity="0.01" />
          </radialGradient>
          <radialGradient id="sweepGrad" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#2898d8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2898d8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Radar background fill */}
        <circle cx={CX} cy={CY} r={R} fill="url(#radarFill)" />

        {/* Concentric range rings */}
        {[R, R * 0.67, R * 0.33].map((r, i) => (
          <circle key={i} cx={CX} cy={CY} r={r}
            fill="none" stroke="#2898d8" strokeWidth="0.5"
            opacity={0.06 + i * 0.05} />
        ))}

        {/* Crosshair */}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#2898d8" strokeWidth="0.3" opacity="0.07" />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#2898d8" strokeWidth="0.3" opacity="0.07" />

        {/* Diagonal tick marks */}
        {[45, 135, 225, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line key={i}
              x1={CX + (R - 6) * Math.cos(rad)} y1={CY + (R - 6) * Math.sin(rad)}
              x2={CX + R * Math.cos(rad)} y2={CY + R * Math.sin(rad)}
              stroke="#2898d8" strokeWidth="0.4" opacity="0.1" />
          );
        })}

        {/* Expanding ping ring */}
        <circle className="h-ping" cx={CX} cy={CY} r="8"
          fill="none" stroke="#2898d8" strokeWidth="0.6" opacity="0.3" />

        {/* Rotating sweep group */}
        <g ref={sweepRef} style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {/* Sweep cone */}
          <path
            d={`M ${CX} ${CY} L ${CX} ${CY - R} A ${R} ${R} 0 0 1 ${(CX + R * Math.sin((15 * Math.PI) / 180)).toFixed(1)} ${(CY - R * Math.cos((15 * Math.PI) / 180)).toFixed(1)} Z`}
            fill="url(#sweepGrad)"
            opacity="0.7"
          />
          {/* Sweep arm */}
          <line x1={CX} y1={CY} x2={CX} y2={CY - R}
            stroke="#2898d8" strokeWidth="1.2" opacity="0.8" />
        </g>

        {/* Target blip dots */}
        {[[130, 62], [72, 148], [155, 118], [52, 74], [118, 155]].map(([bx, by], i) => (
          <circle key={i} className="h-blip" cx={bx} cy={by} r="2.5"
            fill="#2898d8" opacity="0" />
        ))}

        {/* Radar label */}
        <text x={CX} y={CY + R + 14} textAnchor="middle"
          fontSize="6" fill="#2898d8" opacity="0.2" fontFamily="monospace">
          TACTICAL SCAN
        </text>
      </svg>
    </div>
  );
}

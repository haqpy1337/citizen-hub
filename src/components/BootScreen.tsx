import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { getOreCommodities, getRefineryStations, getRefineryMethods } from "../lib/uex/endpoints";

interface Props { onComplete: () => void }

type CheckStatus = "pending" | "running" | "ok" | "fail";
type UpdateState = "checking" | "uptodate" | "available" | "downloaded" | "error";

interface Check { label: string; run: () => Promise<boolean> }

const CHECKS: Check[] = [
  { label: "LOCAL DATABASE",   run: async () => { try { return await window.api.dbPing(); } catch { return false; } } },
  { label: "UEX CORP API",     run: async () => { try { const r = await getOreCommodities(); return r.length > 0; } catch { return false; } } },
  { label: "REFINERY DATA",    run: async () => { try { const [s,m] = await Promise.all([getRefineryStations(),getRefineryMethods()]); return s.length>0||m.length>0; } catch { return false; } } },
  { label: "CITIZEN HUB v2",   run: async () => { try { await window.api.getVersion(); return true; } catch { return false; } } },
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

// ── WebGL shaders ──────────────────────────────────────────────────────────────

const VS = `
attribute vec3 aP, aN;
uniform mat4 uMVP;
varying vec3 vN;
void main() { vN = aN; gl_Position = uMVP * vec4(aP, 1.0); }`;

const FS_PLANET = `
precision highp float;
varying vec3 vN;
uniform float uT;
uniform vec3 uSun;
float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195) + 0.1);
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float vn(vec3 p) {
  vec3 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(i),hash(i+vec3(1,0,0)),u.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),u.z);
}
float fbm(vec3 p) {
  float v=0.0,a=0.5; p+=vec3(13.3,47.7,81.2);
  for(int i=0;i<8;i++){v+=a*vn(p);p=p*2.07+vec3(3.1,1.7,5.9);a*=0.52;}
  return v;
}
void main() {
  vec3 n=normalize(vN);
  float s=sin(uT*0.07),c=cos(uT*0.07);
  vec3 nr=vec3(n.x*c-n.z*s,n.y,n.x*s+n.z*c);
  float e=fbm(nr*2.2); e=clamp(e*1.6-0.25,0.0,1.0); e=pow(e,0.9);
  vec3 c0=vec3(0.10,0.03,0.22),c1=vec3(0.22,0.08,0.48),
       c2=vec3(0.42,0.18,0.72),c3=vec3(0.65,0.35,0.88),c4=vec3(0.80,0.55,0.95);
  vec3 col=e<0.25?mix(c0,c1,e/0.25):e<0.5?mix(c1,c2,(e-0.25)/0.25):e<0.75?mix(c2,c3,(e-0.5)/0.25):mix(c3,c4,(e-0.75)/0.25);
  vec3 norm=normalize(vN),sun=normalize(uSun),view=vec3(0,0,1);
  col*=mix(0.18,1.0,smoothstep(-0.28,0.75,dot(norm,sun)));
  col+=pow(max(dot(normalize(sun+view),norm),0.0),40.0)*0.18*vec3(0.7,0.55,1.0);
  float ndv=abs(dot(norm,view));
  col*=mix(0.50,1.0,ndv*ndv);
  col+=pow(1.0-ndv,2.8)*vec3(0.10,0.06,0.55)*1.8;
  gl_FragColor=vec4(col,1.0);
}`;

const FS_ATMO = `
precision mediump float;
varying vec3 vN;
uniform vec3 uSun;
void main(){
  vec3 n=normalize(vN);
  float ndv=abs(dot(n,vec3(0,0,1)));
  float lit=smoothstep(-0.5,0.6,dot(n,normalize(uSun)));
  gl_FragColor=vec4(mix(vec3(0.04,0.02,0.30),vec3(0.16,0.10,0.58),lit),pow(1.0-ndv,2.2)*0.52*max(lit,0.08));
}`;

function buildSphere(seg: number) {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let la = 0; la <= seg; la++) {
    const th = (la * Math.PI) / seg, st = Math.sin(th), ct = Math.cos(th);
    for (let lo = 0; lo <= seg; lo++) {
      const ph = (lo * 2 * Math.PI) / seg;
      const x = st * Math.cos(ph), y = ct, z = st * Math.sin(ph);
      pos.push(x, y, z); nor.push(x, y, z);
    }
  }
  for (let la = 0; la < seg; la++)
    for (let lo = 0; lo < seg; lo++) {
      const a = la * (seg + 1) + lo, b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

function id4() { const m = new Float32Array(16); m[0]=m[5]=m[10]=m[15]=1; return m; }
function mul4(a: Float32Array, b: Float32Array) {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[i+k*4]*b[k+j*4]; r[i+j*4]=s; }
  return r;
}
function persp(fov: number, ar: number, nr: number, fr: number) {
  const f = 1/Math.tan(fov/2), nf = 1/(nr-fr), m = new Float32Array(16);
  m[0]=f/ar; m[5]=f; m[10]=(fr+nr)*nf; m[11]=-1; m[14]=2*fr*nr*nf; return m;
}
function trans(x: number, y: number, z: number) { const m = id4(); m[12]=x; m[13]=y; m[14]=z; return m; }
function scl(s: number) { const m = id4(); m[0]=m[5]=m[10]=s; return m; }

// ── Hub-Node SVG Emblem ────────────────────────────────────────────────────────

function HubEmblem() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" style={{ filter: "drop-shadow(0 0 6px rgba(180,140,255,.5))" }}>
      <circle cx="19" cy="19" r="17" stroke="rgba(175,140,255,.12)" strokeWidth=".7" strokeDasharray="2 3"/>
      <line x1="19" y1="19" x2="19"   y2="3.5"  stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="32.7" y2="10.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="32.7" y2="27.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="19"   y2="34.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="5.3"  y2="27.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="5.3"  y2="10.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <circle cx="19"   cy="3.5"  r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="32.7" cy="10.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="32.7" cy="27.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="19"   cy="34.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="5.3"  cy="27.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="5.3"  cy="10.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="19" cy="19" r="5"   fill="rgba(170,125,255,.18)" stroke="rgba(200,165,255,.65)" strokeWidth="1"/>
      <circle cx="19" cy="19" r="2.5" fill="rgba(210,180,255,.80)"/>
      <circle cx="19" cy="19" r="1.2" fill="rgba(248,242,255,.98)"/>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BootScreen({ onComplete }: Props) {
  // Force body transparent during boot so the OS sees through the rectangle
  useEffect(() => {
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, []);

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const flashRef    = useRef<HTMLDivElement>(null);
  const logoRef     = useRef<HTMLDivElement>(null);
  const progRef     = useRef<HTMLDivElement>(null);
  const pressRef    = useRef<HTMLDivElement>(null);

  const [progress,  setProgress]  = useState(0);
  const [ready,     setReady]     = useState(false);
  const [checkText, setCheckText] = useState("INITIALIZING…");
  const [checkDone, setCheckDone] = useState(false);
  const [dots,      setDots]      = useState([false,false,false,false,false]);
  const [version,   setVersion]   = useState("…");
  const [updateState,   setUpdateState]   = useState<UpdateState>("checking");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [statuses,  setStatuses]  = useState<CheckStatus[]>(CHECKS.map(() => "pending"));

  // ── WebGL ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) return;

    cv.width = 340; cv.height = 340;
    gl.viewport(0, 0, 340, 340);

    const sh = (t: GLenum, src: string) => {
      const s = gl.createShader(t)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const pr = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p); return p;
    };
    const pP = pr(VS, FS_PLANET), pA = pr(VS, FS_ATMO);

    const geo = buildSphere(128);
    const mkBuf = (d: Float32Array | Uint16Array, t: GLenum = gl.ARRAY_BUFFER) => {
      const b = gl.createBuffer()!; gl.bindBuffer(t, b); gl.bufferData(t, d, gl.STATIC_DRAW); return b;
    };
    const vB = mkBuf(geo.pos), nB = mkBuf(geo.nor);
    const iB = mkBuf(geo.idx, gl.ELEMENT_ARRAY_BUFFER);
    const IL = geo.idx.length;

    const attr = (p: WebGLProgram, nm: string, b: WebGLBuffer, sz: number) => {
      const l = gl.getAttribLocation(p, nm);
      if (l < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 0, 0);
    };

    const proj   = persp(0.70, 1, 0.1, 100);
    const mP     = trans(0, 0, -2.82);
    const mA     = mul4(trans(0, 0, -2.82), scl(1.048));
    const mvpP   = mul4(proj, mP);
    const mvpA   = mul4(proj, mA);
    const sun    = [1.4, 0.9, 0.7];
    const t0     = performance.now();

    const render = (now: number) => {
      rafRef.current = requestAnimationFrame(render);
      const t = (now - t0) / 1000;
      gl.clearColor(0.01, 0.008, 0.04, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      gl.useProgram(pP);
      attr(pP, "aP", vB, 3); attr(pP, "aN", nB, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
      gl.uniformMatrix4fv(gl.getUniformLocation(pP, "uMVP"), false, mvpP);
      gl.uniform1f(gl.getUniformLocation(pP, "uT"), t);
      gl.uniform3fv(gl.getUniformLocation(pP, "uSun"), sun);
      gl.disable(gl.BLEND);
      gl.drawElements(gl.TRIANGLES, IL, gl.UNSIGNED_SHORT, 0);

      gl.useProgram(pA);
      attr(pA, "aP", vB, 3); attr(pA, "aN", nB, 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iB);
      gl.uniformMatrix4fv(gl.getUniformLocation(pA, "uMVP"), false, mvpA);
      gl.uniform3fv(gl.getUniformLocation(pA, "uSun"), sun);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
      gl.drawElements(gl.TRIANGLES, IL, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.CULL_FACE);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Update listener + version ──────────────────────────────────────────────

  useEffect(() => {
    window.api.onUpdateAvailable(v  => { setUpdateVersion(v); setUpdateState("available"); });
    window.api.onUpdateDownloaded(v => { setUpdateVersion(v); setUpdateState("downloaded"); });
    window.api.onUpdateError(()     => setUpdateState("error"));
    window.api.onUpdateNotAvailable(() => setUpdateState("uptodate"));
    window.api.getVersion().then(v => setVersion(v)).catch(() => {});
    const t = setTimeout(() => setUpdateState(s => s === "checking" ? "uptodate" : s), 8000);
    return () => clearTimeout(t);
  }, []);

  // ── Boot sequence ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fade = (el: HTMLElement | null, to: number, ms = 400, delay = 0) => {
      if (!el) return;
      el.style.transition = "none"; el.style.opacity = "0";
      setTimeout(() => {
        if (!el) return;
        el.style.transition = `opacity ${ms}ms ease`;
        el.style.opacity = String(to);
      }, delay);
    };

    // Logo CRT flicker
    const logo = logoRef.current;
    if (logo) {
      const frames: [number, number][] = [[0,0],[.08,70],[0,110],[.45,175],[.05,235],[.80,305],[.32,365],[1,435]];
      frames.forEach(([op, d]) => setTimeout(() => {
        if (logo) { logo.style.transition = "none"; logo.style.opacity = String(op); }
      }, d));
    }

    (async () => {
      await new Promise(r => setTimeout(r, 560));
      if (cancelled) return;

      fade(progRef.current, 1, 500);
      await new Promise(r => setTimeout(r, 680));
      if (cancelled) return;

      for (let i = 0; i < CHECKS.length; i++) {
        if (cancelled) return;
        setCheckText(`${CHECKS[i].label}…`);
        setCheckDone(false);
        setStatuses(prev => { const n = [...prev]; n[i] = "running"; return n; });

        const [result] = await Promise.all([
          CHECKS[i].run(),
          new Promise<void>(r => setTimeout(r, 720)),
        ]);
        if (cancelled) return;

        setStatuses(prev => { const n = [...prev]; n[i] = result ? "ok" : "fail"; return n; });
        setProgress(Math.round(((i + 1) / CHECKS.length) * 100));
        setCheckText(`${CHECKS[i].label}  ✓`);
        setCheckDone(true);
        setDots(prev => { const n = [...prev]; n[i] = true; return n; });

        await new Promise(r => setTimeout(r, 200));
      }

      if (cancelled) return;
      await new Promise(r => setTimeout(r, 300));
      fade(progRef.current, 0, 350);
      await new Promise(r => setTimeout(r, 420));
      if (cancelled) return;
      setReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = pressRef.current;
    if (!el) return;
    el.style.transition = "none"; el.style.opacity = "0";
    setTimeout(() => {
      if (!el) return;
      el.style.transition = "opacity 700ms ease";
      el.style.opacity = "1";
    }, 50);
  }, [ready]);

  // ── PRESS handler ──────────────────────────────────────────────────────────

  function handlePress() {
    const fl = flashRef.current;
    const logo = logoRef.current;
    const press = pressRef.current;

    if (press) { press.style.transition = "opacity 200ms ease"; press.style.opacity = "0"; }
    if (logo)  { logo.style.transition  = "opacity 300ms ease"; logo.style.opacity  = "0"; }

    setTimeout(() => {
      if (fl) { fl.style.transition = "opacity 600ms ease"; fl.style.opacity = "1"; }
      window.api.expandWindow().catch(() => {});
    }, 320);

    setTimeout(onComplete, 980);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 flex items-center justify-center select-none"
      style={{ background: "transparent", WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* The planet circle — no-drag so clicks on UI elements work */}
      <div style={{
        position: "relative",
        width: 340, height: 340,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 0 0 1px rgba(110,60,200,.22), 0 0 30px 12px rgba(80,40,160,.38), 0 0 80px 32px rgba(55,22,120,.22)",
        WebkitAppRegion: "no-drag",
      } as React.CSSProperties}>
        {/* WebGL canvas */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />

        {/* Vignette */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          boxShadow: "inset 0 0 60px 22px rgba(2,0,10,.60)",
        }} />

        {/* UI overlay */}
        <div style={{ position: "absolute", inset: 0 }}>

          {/* Logo */}
          <div
            ref={logoRef}
            style={{
              position: "absolute", top: 44, left: 0, right: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
              opacity: 0,
            }}
          >
            <HubEmblem />
            <div style={{
              marginTop: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: "0.58em",
              paddingLeft: "0.58em", fontFamily: "Courier New, monospace",
              color: "rgba(235,220,255,.90)",
              textShadow: "0 0 10px rgba(175,135,255,.6), 0 0 28px rgba(140,90,255,.3)",
            }}>CITIZEN HUB</div>
            <div style={{
              marginTop: 5,
              fontSize: 7, letterSpacing: "0.45em", paddingLeft: "0.45em",
              fontFamily: "Courier New, monospace",
              color: "rgba(185,160,255,.58)", fontWeight: 400,
              textShadow: "0 0 10px rgba(155,115,255,.35)",
            }}>STAR CITIZEN COMPANION</div>
          </div>

          {/* Progress area */}
          <div
            ref={progRef}
            style={{
              position: "absolute", bottom: 52, left: 0, right: 0,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              opacity: 0,
            }}
          >
            {/* Bar with corner brackets */}
            <div style={{ position: "relative", width: 180, height: 12, display: "flex", alignItems: "center", gap: 0 }}>
              {/* Left bracket */}
              <div style={{ flexShrink: 0, width: 5, height: 10, border: "1px solid rgba(160,110,255,.40)", borderRight: "none" }} />
              {/* Fill track */}
              <div style={{ flex: 1, height: 2, position: "relative", overflow: "visible" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, height: 2,
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, rgba(130,80,230,.5), rgba(185,140,255,1))",
                  boxShadow: "0 0 5px 1px rgba(170,120,255,.8), 0 0 14px 3px rgba(140,90,240,.45)",
                  borderRadius: "0 1px 1px 0",
                  transition: "width 0.6s cubic-bezier(.22,.8,.25,1)",
                }} />
              </div>
              {/* Right bracket */}
              <div style={{ flexShrink: 0, width: 5, height: 10, border: "1px solid rgba(160,110,255,.40)", borderLeft: "none" }} />
            </div>

            {/* Dots */}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {dots.map((lit, i) => (
                <div key={i} style={{
                  width: 3, height: 3, borderRadius: "50%",
                  background: lit ? "rgba(190,155,255,.9)" : "rgba(150,110,255,.15)",
                  boxShadow: lit ? "0 0 4px 2px rgba(165,120,255,.6)" : "none",
                  transition: "all 0.35s ease",
                }} />
              ))}
            </div>

            {/* Check text */}
            <div style={{
              fontSize: 6, letterSpacing: "0.28em", paddingLeft: "0.28em",
              fontFamily: "Courier New, monospace",
              color: checkDone ? "rgba(160,205,255,.45)" : "rgba(170,145,255,.35)",
              textAlign: "center", minHeight: 10,
              textShadow: "0 0 8px rgba(150,110,255,.3)",
              transition: "color 0.25s",
            }}>
              {checkText}
            </div>
          </div>

          {/* PRESS button */}
          {ready && (
            <div
              ref={pressRef}
              style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                opacity: 0,
                animation: "planet-press-pulse 2.8s ease-in-out infinite",
              }}
            >
              <button
                onClick={handlePress}
                style={{
                  display: "block", position: "relative",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "Courier New, monospace",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.9em",
                  padding: "0.9em 1.8em", paddingLeft: "calc(1.8em + 0.9em)",
                  color: "rgba(225,205,255,.85)",
                  textShadow: "0 0 8px rgba(175,135,255,.65), 0 0 22px rgba(140,95,255,.3)",
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.color = "rgba(250,242,255,.98)";
                  b.style.textShadow = "0 0 4px #fff, 0 0 14px rgba(195,160,255,.9), 0 0 40px rgba(150,100,255,.5)";
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.color = "rgba(225,205,255,.85)";
                  b.style.textShadow = "0 0 8px rgba(175,135,255,.65), 0 0 22px rgba(140,95,255,.3)";
                }}
              >
                {/* Corner brackets */}
                <span aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: "1px solid rgba(175,135,255,.55)", borderLeft: "1px solid rgba(175,135,255,.55)" }} />
                <span aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTop: "1px solid rgba(175,135,255,.55)", borderRight: "1px solid rgba(175,135,255,.55)" }} />
                <span aria-hidden="true" style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottom: "1px solid rgba(175,135,255,.55)", borderLeft: "1px solid rgba(175,135,255,.55)" }} />
                <span aria-hidden="true" style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: "1px solid rgba(175,135,255,.55)", borderRight: "1px solid rgba(175,135,255,.55)" }} />
                PRESS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Version + update footer — outside the circle */}
      <div style={{
        position: "fixed", bottom: 24, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 24,
        fontFamily: "Courier New, monospace", fontSize: 9,
        color: "rgba(160,130,200,.35)", letterSpacing: "0.2em",
        pointerEvents: updateState === "downloaded" ? "auto" : "none",
      }}>
        <span>v{version}</span>
        <UpdateFooter state={updateState} version={updateVersion} onInstall={handlePress} />
      </div>

      {/* Flash overlay */}
      <div
        ref={flashRef}
        style={{
          position: "fixed", inset: 0, background: "#0a0010",
          opacity: 0, pointerEvents: "none", zIndex: 99,
        }}
      />

      <style>{`
        @keyframes planet-press-pulse {
          0%,100% { opacity: .45 }
          50%      { opacity: 1   }
        }
        @keyframes planet-logo-flicker {
          0%,13%,15%,100% { opacity:1  }
          14%             { opacity:.08}
        }
      `}</style>
    </div>
  );
}

// ── UpdateFooter ───────────────────────────────────────────────────────────────

function DownloadingDots({ label }: { label: string }) {
  const [f, setF] = useState(0);
  useEffect(() => { const id = setInterval(() => setF(x => (x+1)%4), 500); return () => clearInterval(id); }, []);
  return <span style={{ color: "rgba(160,130,200,.5)" }}>{label}<span style={{ opacity: 0.45 }}>{["   ",".  ",".. ","..."][f]}</span></span>;
}

function UpdateFooter({ state, version, onInstall }: { state: UpdateState; version: string | null; onInstall: () => void }) {
  if (state === "checking")   return <span style={{ opacity: 0.5 }}>CHECKING FOR UPDATES…</span>;
  if (state === "uptodate")   return <span style={{ opacity: 0.25 }}>UP TO DATE</span>;
  if (state === "error")      return <span style={{ color: "rgba(255,80,80,.5)" }}>UPDATE CHECK FAILED</span>;
  if (state === "available")  return <DownloadingDots label={`DOWNLOADING v${version}`} />;
  if (state === "downloaded") return (
    <button
      onClick={e => { e.stopPropagation(); onInstall(); }}
      style={{
        fontFamily: "Courier New, monospace", fontSize: 9, letterSpacing: "0.2em",
        background: "none", border: "1px solid rgba(160,130,200,.4)",
        color: "rgba(200,180,255,.8)", padding: "2px 8px", cursor: "pointer",
      }}
    >
      v{version} READY — INSTALL &amp; RESTART
    </button>
  );
  return null;
}

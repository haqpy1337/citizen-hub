import { useEffect, useRef, useState } from "react";
import { usePage, useLang } from "../App";
import CrestLogo from "./CrestLogo";
import SettingsModal from "./SettingsModal";
import anime from "animejs";

const themes = [
  { key: "mole",    color: "#e05010", title: "Mole",    sub: "ARGO Industrial" },
  { key: "cockpit", color: "#50e828", title: "Cockpit", sub: "RSI Terminal"    },
  { key: "origin",  color: "#0e6faa", title: "Origin",  sub: "890 Jump Luxury" },
  { key: "gatac",   color: "#b848ff", title: "Gatac",   sub: "Alien Tech"      },
  { key: "hornet",  color: "#2898d8", title: "Hornet",  sub: "Anvil Military"  },
];

const NAV_ITEMS = [
  { label: "Dashboard",  key: "dashboard"  },
  { label: "Jobs",       key: "jobs"       },
  { label: "History",    key: "history"    },
  { label: "Ore Prices", key: "ores"       },
  { label: "Refineries", key: "refineries" },
] as const;

type PageKey = "dashboard" | "jobs" | "history" | "ores" | "refineries";

export default function Sidebar() {
  const { page, setPage } = usePage();
  const { lang, setLang } = useLang();
  const [activeTheme, setActiveTheme] = useState<string>(
    () => localStorage.getItem("ch-theme") ?? "mole"
  );
  const [themeOpen, setThemeOpen]     = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navRef       = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);
  const gearRef      = useRef<HTMLButtonElement>(null);
  const dropVisible  = useRef(false);

  // ── Sliding indicator ──────────────────────────────────────────────────────
  function positionIndicator(key: string, animate: boolean) {
    if (!navRef.current || !indicatorRef.current) return;
    const btn = navRef.current.querySelector<HTMLElement>(`[data-nav="${key}"]`);
    if (!btn) return;
    if (animate) {
      anime({ targets: indicatorRef.current, top: btn.offsetTop, height: btn.offsetHeight, duration: 300, easing: "easeOutCubic" });
    } else {
      indicatorRef.current.style.top    = `${btn.offsetTop}px`;
      indicatorRef.current.style.height = `${btn.offsetHeight}px`;
    }
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => positionIndicator(page, false));
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate(key: string) {
    setPage(key as PageKey);
    positionIndicator(key, true);
    const btn = navRef.current?.querySelector<HTMLElement>(`[data-nav="${key}"]`);
    if (btn) anime({ targets: btn, translateX: [6, 0], duration: 200, easing: "easeOutExpo" });
  }

  function handleNavHover(el: HTMLElement, entering: boolean) {
    if (el.dataset.nav === page) return;
    anime({ targets: el, translateX: entering ? 3 : 0, duration: 150, easing: "easeOutSine" });
  }

  // ── Theme dropdown ─────────────────────────────────────────────────────────
  function openDrop(open: boolean) {
    if (open === dropVisible.current) return;
    dropVisible.current = open;
    setThemeOpen(open);
    const el = dropRef.current;
    if (!el) return;
    if (open) {
      el.style.display = "block";
      anime({ targets: el, opacity: [0, 1], translateY: [-6, 0], duration: 220, easing: "easeOutExpo" });
    } else {
      anime({ targets: el, opacity: [1, 0], translateY: [0, -6], duration: 180, easing: "easeInExpo",
        complete: () => { el.style.display = "none"; } });
    }
  }

  function applyTheme(key: string) {
    const html = document.documentElement;
    themes.forEach(t => html.classList.remove(`theme-${t.key}`));
    html.classList.add(`theme-${key}`);
    localStorage.setItem("ch-theme", key);
    setActiveTheme(key);
    openDrop(false);
  }

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (dropVisible.current && dropRef.current && !dropRef.current.contains(e.target as Node))
        openDrop(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const curTheme = themes.find(t => t.key === activeTheme);

  function navButton(item: { label: string; key: string }) {
    return (
      <button
        key={item.key}
        data-nav={item.key}
        onClick={() => navigate(item.key)}
        onMouseEnter={e => handleNavHover(e.currentTarget, true)}
        onMouseLeave={e => handleNavHover(e.currentTarget, false)}
        className={[
          "relative z-10 shrink-0 w-full text-left flex items-center gap-2.5 px-3 py-2.5",
          "text-xs font-mono uppercase tracking-wider transition-colors",
          page === item.key ? "text-quant" : "text-muted hover:text-ink",
        ].join(" ")}
      >
        <span className="flex-1">{item.label}</span>
        {page === item.key && (
          <span className="w-1.5 h-1.5 rounded-full bg-quant shrink-0 sidebar-active-dot" />
        )}
      </button>
    );
  }

  return (
    <>
      <aside className="w-56 shrink-0 flex flex-col h-screen border-r border-edge bg-panel sticky top-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-edge shrink-0">
          <CrestLogo height={32} />
        </div>

        {/* Navigation */}
        <div ref={navRef} className="relative flex-1 px-3 py-4 flex flex-col overflow-y-auto">

          <div
            ref={indicatorRef}
            className="absolute left-3 right-3 pointer-events-none"
            style={{ top: 0, height: 36, background: "var(--color-quant-dim)", borderLeft: "2px solid var(--color-quant)" }}
          />

          <p className="px-2 mb-2 text-[9px] font-mono uppercase tracking-widest text-muted/50 shrink-0">
            Navigation
          </p>

          {NAV_ITEMS.map(item => navButton(item))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-edge px-4 py-4 flex flex-col gap-3 shrink-0">

          {/* Theme picker */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted/50 mb-2">Theme</p>
            <div className="relative">
              <button
                onClick={() => openDrop(!themeOpen)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 border border-edge hover:border-quant/60 transition-colors text-xs font-mono"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: curTheme?.color }} />
                <span className="flex-1 text-left text-muted/80">{curTheme?.title}</span>
                <span className="text-muted/40 text-[10px]">{themeOpen ? "▴" : "▾"}</span>
              </button>

              <div
                ref={dropRef}
                className="absolute bottom-full left-0 right-0 mb-1.5 border border-edge bg-panel z-50 overflow-hidden"
                style={{ display: "none", opacity: 0 }}
              >
                {themes.map(t => (
                  <button
                    key={t.key}
                    onClick={() => applyTheme(t.key)}
                    onMouseEnter={e => anime({ targets: e.currentTarget, translateX: [0, 4], duration: 140, easing: "easeOutSine" })}
                    onMouseLeave={e => anime({ targets: e.currentTarget, translateX: [4, 0], duration: 140, easing: "easeOutSine" })}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                      t.key === activeTheme ? "bg-quant/10 text-quant" : "text-muted hover:bg-hull hover:text-ink",
                    ].join(" ")}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/20" style={{ background: t.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold leading-tight">{t.title}</div>
                      <div className="text-[10px] text-muted/70 leading-tight">{t.sub}</div>
                    </div>
                    {t.key === activeTheme && <span className="text-quant text-[10px] shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted/50 mb-2">Language</p>
            <div className="flex gap-1">
              {(["en", "de"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={[
                    "flex-1 py-1 text-xs font-mono uppercase border transition-all",
                    lang === l ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Settings gear */}
          <div className="pt-1 border-t border-edge/50">
            <button
              ref={gearRef}
              onClick={() => setSettingsOpen(o => !o)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-muted hover:text-quant transition-colors text-xs font-mono"
            >
              <span className="text-base leading-none" style={{ display: "inline-block" }}>⚙</span>
              <span className="uppercase tracking-widest text-[10px]">Settings</span>
            </button>
          </div>
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} gearRef={gearRef} />
    </>
  );
}

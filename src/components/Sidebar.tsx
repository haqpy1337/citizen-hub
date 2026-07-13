import { useState } from "react";
import { usePage, useLang } from "../App";
import CrestLogo from "./CrestLogo";

const themes = [
  { key: "mole",    color: "#f97316", title: "Mole"    },
  { key: "cockpit", color: "#22c55e", title: "Cockpit" },
  { key: "origin",  color: "#7dd3fc", title: "Origin"  },
  { key: "gatac",   color: "#a855f7", title: "Gatac"   },
  { key: "hornet",  color: "#3b82f6", title: "Hornet"  },
];

const navItems = [
  { label: "Dashboard",  key: "dashboard"  },
  { label: "Jobs",       key: "jobs"       },
  { label: "History",    key: "history"    },
  { label: "Ore Prices", key: "ores"       },
  { label: "Refineries", key: "refineries" },
] as const;

export default function Sidebar() {
  const { page, setPage } = usePage();
  const { lang, setLang } = useLang();
  const [activeTheme, setActiveTheme] = useState<string>(() =>
    localStorage.getItem("ch-theme") ?? "mole"
  );

  function applyTheme(key: string) {
    const html = document.documentElement;
    themes.forEach(t => html.classList.remove(`theme-${t.key}`));
    html.classList.add(`theme-${key}`);
    localStorage.setItem("ch-theme", key);
    setActiveTheme(key);
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen border-r border-edge bg-panel sticky top-0">
      <div className="px-5 py-5 border-b border-edge">
        <CrestLogo height={32} />
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[9px] font-mono uppercase tracking-widest text-muted/50">
          Navigation
        </p>
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={[
              "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all",
              page === item.key
                ? "bg-hull text-quant border border-edge"
                : "text-muted hover:text-ink hover:bg-hull/60",
            ].join(" ")}
          >
            <span className="flex-1">{item.label}</span>
            {page === item.key && (
              <span className="h-1.5 w-1.5 rounded-full bg-quant shrink-0" />
            )}
          </button>
        ))}
      </nav>

      {/* Settings link */}
      <button
        onClick={() => setPage("settings")}
        className={[
          "mx-3 mb-1 text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all border",
          page === "settings"
            ? "bg-hull text-quant border-edge"
            : "text-muted hover:text-ink hover:bg-hull/60 border-transparent",
        ].join(" ")}
      >
        <span className="flex-1">Settings</span>
        {page === "settings" && <span className="h-1.5 w-1.5 rounded-full bg-quant shrink-0" />}
      </button>

      <div className="border-t border-edge px-4 py-4 flex flex-col gap-3">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted/50 mb-2">Theme</p>
          <div className="flex gap-2">
            {themes.map(t => (
              <button
                key={t.key}
                title={t.title}
                onClick={() => applyTheme(t.key)}
                style={{ background: t.color }}
                className={[
                  "w-4 h-4 rounded-full transition-all hover:scale-110",
                  activeTheme === t.key ? "ring-2 ring-offset-1 ring-offset-panel ring-white/50" : "",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted/50 mb-2">Language</p>
          <div className="flex gap-1">
            {(["en", "de"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={[
                  "px-2 py-0.5 text-xs font-mono uppercase rounded border transition-all",
                  lang === l
                    ? "border-quant text-quant bg-quant/10"
                    : "border-edge text-muted hover:text-ink",
                ].join(" ")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

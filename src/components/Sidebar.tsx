import { useState } from "react";
import { usePage, useAuth, useLang } from "../App";
import CrestLogo from "./CrestLogo";

const themes = [
  { key: "mole",    color: "#f97316", title: "Mole" },
  { key: "cockpit", color: "#22c55e", title: "Cockpit" },
  { key: "origin",  color: "#7dd3fc", title: "Origin" },
  { key: "gatac",   color: "#a855f7", title: "Gatac" },
  { key: "hornet",  color: "#3b82f6", title: "Hornet" },
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
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    const cls = document.documentElement.className;
    return themes.find(t => cls.includes(`theme-${t.key}`))?.key ?? "mole";
  });

  function applyTheme(key: string) {
    const html = document.documentElement;
    themes.forEach(t => html.classList.remove(`theme-${t.key}`));
    html.classList.add(`theme-${key}`);
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
                    : "border-edge text-muted hover:text-ink hover:border-edge/80",
                ].join(" ")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2 pt-1 border-t border-edge">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-hull flex items-center justify-center text-[10px] text-muted shrink-0">
                {user.username[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs text-ink truncate flex-1 font-mono">{user.username}</span>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full text-left text-xs font-mono uppercase tracking-wider text-muted hover:text-danger transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

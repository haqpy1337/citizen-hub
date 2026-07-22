import { createContext, useContext, useEffect, useState } from "react";
import { User } from "./lib/api";
import BootScreen from "./components/BootScreen";
import DashboardPage from "./pages/Dashboard";
import JobsPage from "./pages/Jobs";
import RefineryJobsPage from "./pages/RefineryJobs";
import CommoditiesPage from "./pages/Commodities";
import RefineriesPage from "./pages/Refineries";
import Sidebar from "./components/Sidebar";
import { Lang } from "./lib/i18n";

export type Page = "dashboard" | "refinery-jobs" | "jobs" | "commodities" | "refineries";

export interface AuthCtx { user: User | null; token: string | null }
export const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

interface PageCtx { page: Page; setPage: (p: Page) => void }
export const PageContext = createContext<PageCtx>(null!);
export const usePage = () => useContext(PageContext);

interface LangCtx { lang: Lang; setLang: (l: Lang) => void }
export const LangContext = createContext<LangCtx>(null!);
export const useLang = () => useContext(LangContext);

type AppState = "booting" | "animating" | "ready";

export default function App() {
  const [appState, setAppState] = useState<AppState>("booting");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [lang, setLang] = useState<Lang>(() =>
    (localStorage.getItem("ch-lang") as Lang) ?? "en"
  );

  useEffect(() => {
    window.api.auth.getOrCreateLocal().then(({ token: t, user: u }) => {
      setToken(t);
      setUser(u);
      setAppState("animating");
    });
  }, []);

  const handleLang = (l: Lang) => { setLang(l); localStorage.setItem("ch-lang", l); };

  if (appState === "booting") return <div className="h-screen" style={{ background: "transparent" }} />;

  if (appState === "animating") {
    return (
      <BootScreen onComplete={() => {
        // Restore titlebar button colors after boot animation
        const themeColors: Record<string, { bg: string; sym: string }> = {
          mole:    { bg: "#060402", sym: "#e05010" },
          cockpit: { bg: "#010402", sym: "#50e828" },
          origin:  { bg: "#f0f2f5", sym: "#0e6faa" },
          gatac:   { bg: "#060410", sym: "#b848ff" },
          hornet:  { bg: "#06080e", sym: "#2898d8" },
          odin:    { bg: "#0a0a0e", sym: "#c8a050" },
        };
        const theme = localStorage.getItem("hma-design") ?? "mole";
        const c = themeColors[theme] ?? themeColors.mole;
        window.api.setTitlebarColors(c.bg, c.sym).catch(() => {});
        setAppState("ready");
      }} />
    );
  }

  const pageMap: Record<Page, React.ReactElement> = {
    dashboard: <DashboardPage />,
    "refinery-jobs": <RefineryJobsPage />,
    jobs: <JobsPage />,
    commodities: <CommoditiesPage />,
    refineries: <RefineriesPage />,
  };

  return (
    <LangContext.Provider value={{ lang, setLang: handleLang }}>
      <AuthContext.Provider value={{ user, token }}>
        <PageContext.Provider value={{ page, setPage }}>
          <div className="flex bg-void overflow-hidden" style={{ height: "100vh" }}>
            <Sidebar />
            <div className="relative flex flex-col flex-1 overflow-hidden">
              {/* Window controls — top right, above all content */}
              <div
                className="absolute top-0 right-0 z-50 flex items-center gap-0.5 px-3"
                style={{ height: 34, WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <button
                  onClick={() => window.api.minimizeWindow().catch(() => {})}
                  className="w-7 h-7 flex items-center justify-center opacity-25 hover:opacity-70 transition-opacity text-muted hover:text-ink"
                  title="Minimieren"
                  style={{ fontSize: 16, lineHeight: 1, paddingBottom: 2 }}
                >−</button>
                <button
                  onClick={() => window.api.maximizeWindow().catch(() => {})}
                  className="w-7 h-7 flex items-center justify-center opacity-25 hover:opacity-70 transition-opacity text-muted hover:text-ink"
                  title="Maximieren"
                  style={{ fontSize: 10, lineHeight: 1 }}
                >□</button>
                <button
                  onClick={() => window.api.closeWindow().catch(() => {})}
                  className="w-7 h-7 flex items-center justify-center opacity-25 hover:opacity-90 transition-all text-muted hover:text-red-400"
                  title="Schließen"
                  style={{ fontSize: 15, lineHeight: 1 }}
                >×</button>
              </div>
              <main key={page} className="page-enter flex-1 overflow-y-auto p-6">
                {pageMap[page]}
              </main>
            </div>
          </div>
        </PageContext.Provider>
      </AuthContext.Provider>
    </LangContext.Provider>
  );
}

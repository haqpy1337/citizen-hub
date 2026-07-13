import { createContext, useContext, useEffect, useState } from "react";
import { User } from "./lib/api";
import BootScreen from "./components/BootScreen";
import DashboardPage from "./pages/Dashboard";
import JobsPage from "./pages/Jobs";
import HistoryPage from "./pages/History";
import OresPage from "./pages/Ores";
import RefineriesPage from "./pages/Refineries";
import Sidebar from "./components/Sidebar";
import UpdateBanner from "./components/UpdateBanner";
import { Lang } from "./lib/i18n";

export type Page = "dashboard" | "jobs" | "history" | "ores" | "refineries";

interface AuthCtx { user: User | null; token: string | null }
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

  if (appState === "booting") return <div className="h-screen bg-black" />;

  if (appState === "animating") {
    return <BootScreen onComplete={() => setAppState("ready")} />;
  }

  const pageMap: Record<Page, React.ReactElement> = {
    dashboard: <DashboardPage />,
    jobs: <JobsPage />,
    history: <HistoryPage />,
    ores: <OresPage />,
    refineries: <RefineriesPage />,
  };

  return (
    <LangContext.Provider value={{ lang, setLang: handleLang }}>
      <AuthContext.Provider value={{ user, token }}>
        <PageContext.Provider value={{ page, setPage }}>
          <div className="flex h-screen bg-void overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">
              {pageMap[page]}
            </main>
          </div>
          <UpdateBanner />
        </PageContext.Provider>
      </AuthContext.Provider>
    </LangContext.Provider>
  );
}

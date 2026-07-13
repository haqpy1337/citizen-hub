import { createContext, useContext, useEffect, useState } from "react";
import { api, User } from "./lib/api";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import JobsPage from "./pages/Jobs";
import HistoryPage from "./pages/History";
import OresPage from "./pages/Ores";
import RefineriesPage from "./pages/Refineries";
import Sidebar from "./components/Sidebar";
import { Lang } from "./lib/i18n";

// ── Pages ────────────────────────────────────────────────────────────────────

export type Page = "dashboard" | "jobs" | "history" | "ores" | "refineries";

// ── Auth context ──────────────────────────────────────────────────────────────

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

// ── Page context ──────────────────────────────────────────────────────────────

interface PageCtx { page: Page; setPage: (p: Page) => void }
export const PageContext = createContext<PageCtx>(null!);
export const usePage = () => useContext(PageContext);

// ── Lang context ──────────────────────────────────────────────────────────────

interface LangCtx { lang: Lang; setLang: (l: Lang) => void }
export const LangContext = createContext<LangCtx>(null!);
export const useLang = () => useContext(LangContext);

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [lang, setLang] = useState<Lang>(() =>
    (localStorage.getItem("ch-lang") as Lang) ?? "en"
  );

  // Restore session on boot
  useEffect(() => {
    const saved = localStorage.getItem("ch-token");
    if (!saved) { setReady(true); return; }
    api.auth.me(saved).then((u) => {
      if (u) { setUser(u); setToken(saved); }
      else localStorage.removeItem("ch-token");
      setReady(true);
    }).catch(() => { localStorage.removeItem("ch-token"); setReady(true); });
  }, []);

  const login = async (username: string, password: string) => {
    const { token: t, user: u } = await api.auth.login(username, password);
    localStorage.setItem("ch-token", t);
    setToken(t); setUser(u);
  };

  const register = async (username: string, password: string) => {
    const { token: t, user: u } = await api.auth.register(username, password);
    localStorage.setItem("ch-token", t);
    setToken(t); setUser(u);
  };

  const logout = () => {
    if (token) api.auth.logout(token).catch(() => {});
    localStorage.removeItem("ch-token");
    setToken(null); setUser(null); setPage("dashboard");
  };

  const handleLang = (l: Lang) => { setLang(l); localStorage.setItem("ch-lang", l); };

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-void">
        <div className="w-8 h-8 border-2 border-quant/30 border-t-quant rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LangContext.Provider value={{ lang, setLang: handleLang }}>
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
          <LoginPage />
        </AuthContext.Provider>
      </LangContext.Provider>
    );
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
      <AuthContext.Provider value={{ user, token, login, register, logout }}>
        <PageContext.Provider value={{ page, setPage }}>
          <div className="flex h-screen bg-void overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">
              {pageMap[page]}
            </main>
          </div>
        </PageContext.Provider>
      </AuthContext.Provider>
    </LangContext.Provider>
  );
}

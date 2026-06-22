"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDesign, type Design } from "./ThemeProvider";
import Avatar from "./Avatar";
import { useT } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/i18n";

const designs: { id: Design; label: string; desc: string }[] = [
  { id: "mole",    label: "Mole",         desc: "ARGO industrial" },
  { id: "cockpit", label: "Cockpit",      desc: "RSI retro-HUD" },
  { id: "origin",  label: "Origin",       desc: "890 Jump luxury" },
  { id: "gatac",   label: "Gatac",        desc: "Khartu stealth" },
  { id: "hornet",  label: "Hornet",       desc: "F7C military" },
  { id: "odin",    label: "Odin Trooper", desc: "Vanduul heavy" },
];

export default function Sidebar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const setDesign = useDesign();
  const { t, lang, setLang } = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [designsOpen, setDesignsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [current, setCurrent] = useState<Design>("mole");
  const userRef = useRef<HTMLDivElement>(null);

  const links = [
    {
      href: "/dashboard",
      label: t.nav.dashboard,
      exact: true,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="2" y="2" width="7" height="7" rx="1" />
          <rect x="11" y="2" width="7" height="7" rx="1" />
          <rect x="2" y="11" width="7" height="7" rx="1" />
          <rect x="11" y="11" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: "/dashboard/jobs",
      label: t.nav.myJobs,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M4 6h12M4 10h8M4 14h10" />
        </svg>
      ),
    },
    {
      href: "/dashboard/history",
      label: t.nav.history,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2.5" />
        </svg>
      ),
    },
    {
      href: "/dashboard/ores",
      label: t.nav.orePrices,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M10 2l2.5 5H17l-4 3.5 1.5 5.5L10 13l-4.5 3 1.5-5.5L3 7h4.5L10 2z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/trade",
      label: t.nav.tradeRoutes,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M3 7h14M3 7l3-3M3 7l3 3M17 13H3M17 13l-3-3M17 13l-3 3" />
        </svg>
      ),
    },
    {
      href: "/dashboard/refineries",
      label: t.nav.refineries,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M10 2v4M6 4l4 2 4-2M4 8h12l1 9H3L4 8z" />
          <path d="M8 12v3M12 12v3" />
        </svg>
      ),
    },
    {
      href: "/dashboard/groups",
      label: t.nav.groups,
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="7" cy="7" r="2.5" />
          <circle cx="14" cy="7" r="2" />
          <path d="M1 17c0-3 2.5-5 6-5s6 2 6 5" />
          <path d="M14 9c2 0 4 1.5 4 4" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const stored = (localStorage.getItem("hma-design") ?? "mole") as Design;
    setCurrent(stored);
    const handler = (e: Event) => setCurrent((e as CustomEvent<Design>).detail);
    window.addEventListener("hma-design-change", handler);
    return () => window.removeEventListener("hma-design-change", handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!userOpen) return;
    function onOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [userOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function pickDesign(d: Design) {
    setDesign(d);
    setCurrent(d);
    setDesignsOpen(false);
  }

  const [langOpen, setLangOpen] = useState(false);

  const languages: { id: Lang; label: string; flag: string }[] = [
    { id: "en", label: "English", flag: "🇬🇧" },
    { id: "de", label: "Deutsch", flag: "🇩🇪" },
  ];

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-edge">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded font-display font-bold text-sm"
            style={{ background: "var(--color-quant)", color: "var(--color-void)" }}>
            hM
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-sm text-ink">haqpy&apos;s</div>
            <div className="font-mono text-[10px] text-muted uppercase tracking-widest">Miner Assistant</div>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        <p className="px-2 mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted/50">Navigation</p>
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? "bg-hull text-quant border border-edge"
                  : "text-muted hover:text-ink hover:bg-hull/60"
              }`}
            >
              <span className={`shrink-0 transition-colors ${active ? "text-quant" : "text-muted"}`}>
                {l.icon}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider">{l.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-quant shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Language + Designs + User */}
      <div className="border-t border-edge px-3 py-3 space-y-1">
        {/* Language picker */}
        <button
          onClick={() => setLangOpen((v) => !v)}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-muted hover:text-ink hover:bg-hull/60 transition"
        >
          <span className="w-4 h-4 shrink-0 text-base leading-none">{languages.find(l => l.id === lang)?.flag}</span>
          <span className="font-mono text-xs uppercase tracking-wider flex-1 text-left">{t.nav.language}</span>
          <span className="font-mono text-[10px] text-quant">{languages.find(l => l.id === lang)?.label}</span>
          <svg className={`w-3 h-3 shrink-0 transition-transform ${langOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>

        {langOpen && (
          <div className="mx-1 rounded-md border border-edge bg-hull overflow-hidden">
            {languages.map((l) => (
              <button
                key={l.id}
                onClick={() => { setLang(l.id); setLangOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition hover:bg-panel ${lang === l.id ? "text-quant" : "text-ink"}`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="text-xs flex-1">{l.label}</span>
                {lang === l.id && (
                  <svg className="w-3 h-3 shrink-0 text-quant" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1.5 6l3 3 6-6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Design picker */}
        <button
          onClick={() => setDesignsOpen((v) => !v)}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-muted hover:text-ink hover:bg-hull/60 transition"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 shrink-0">
            <circle cx="10" cy="10" r="3" />
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
          </svg>
          <span className="font-mono text-xs uppercase tracking-wider flex-1 text-left">{t.nav.design}</span>
          <span className="font-mono text-[10px] text-quant">{designs.find(d => d.id === current)?.label}</span>
          <svg
            className={`w-3 h-3 shrink-0 transition-transform ${designsOpen ? "rotate-180" : ""}`}
            viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>

        {designsOpen && (
          <div className="mx-1 rounded-md border border-edge bg-hull overflow-hidden">
            {designs.map((d) => (
              <button
                key={d.id}
                onClick={() => pickDesign(d.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition hover:bg-panel ${
                  current === d.id ? "text-quant" : "text-ink"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{d.label}</div>
                  <div className="text-[10px] text-muted truncate">{d.desc}</div>
                </div>
                {current === d.id && (
                  <svg className="w-3 h-3 shrink-0 text-quant" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1.5 6l3 3 6-6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* User */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-muted hover:text-ink hover:bg-hull/60 transition"
          >
            <Avatar username={username} avatarUrl={avatarUrl} size={24} />
            <span className="font-mono text-xs uppercase tracking-wider flex-1 text-left text-ink">{username}</span>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3 shrink-0">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>

          {userOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-edge bg-panel overflow-hidden z-50"
              style={{ boxShadow: "var(--shadow-panel)" }}>
              <Link
                href="/dashboard/profile"
                onClick={() => setUserOpen(false)}
                className="block px-4 py-2.5 text-sm text-muted hover:bg-hull hover:text-ink transition"
              >
                {t.nav.profile}
              </Link>
              <button
                onClick={logout}
                className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-hull hover:text-danger transition border-t border-edge"
              >
                {t.nav.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-edge bg-void sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-edge bg-void flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-1.5 rounded-md border border-edge text-muted hover:text-ink transition"
          aria-label="Menu"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
            {mobileOpen
              ? <path d="M4 4l12 12M16 4L4 16" />
              : <><path d="M3 6h14M3 10h14M3 14h14" /></>
            }
          </svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 flex-1">
          <span className="font-display font-bold text-sm text-quant">hMA</span>
          <span className="font-mono text-xs text-muted">haqpy&apos;s Miner Assistant</span>
        </Link>
        <span className="font-mono text-xs text-muted">{username}</span>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-void border-r border-edge h-full overflow-y-auto">
            {navContent}
          </div>
          <div className="flex-1 bg-void/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDesign, type Design } from "./ThemeProvider";
import CrestLogo from "./CrestLogo";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/jobs", label: "My Jobs" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/ores", label: "Ore Prices" },
  { href: "/dashboard/trade", label: "Trade Routes" },
  { href: "/dashboard/refineries", label: "Refineries" },
];

const designs: { id: Design; label: string }[] = [
  { id: "mole",    label: "Mole" },
  { id: "cockpit", label: "Cockpit" },
  { id: "origin",  label: "Origin" },
  { id: "gatac",   label: "Gatac" },
  { id: "hornet",  label: "Hornet" },
  { id: "odin",    label: "Odin Trooper" },
];

export default function Nav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const setDesign = useDesign();
  const [open, setOpen] = useState(false);
  const [designsOpen, setDesignsOpen] = useState(false);
  const [current, setCurrent] = useState<Design>("mole");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = (localStorage.getItem("hma-design") ?? "swiss") as Design;
    setCurrent(stored);
    const handler = (e: Event) => setCurrent((e as CustomEvent<Design>).detail);
    window.addEventListener("hma-design-change", handler);
    return () => window.removeEventListener("hma-design-change", handler);
  }, []);

  useEffect(() => {
    if (!open) { setDesignsOpen(false); return; }
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function pickDesign(d: Design) {
    setDesign(d);
    setCurrent(d);
    setOpen(false);
    setDesignsOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-void backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/dashboard" className="shrink-0 flex items-center">
          <CrestLogo height={28} />
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active =
              l.href === "/dashboard"
                ? pathname === l.href
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition whitespace-nowrap ${
                  active ? "bg-hull text-quant" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition ${
              open
                ? "border-quant text-quant"
                : "border-edge text-muted hover:border-quant hover:text-quant"
            }`}
          >
            <span className="hidden sm:inline">{username}</span>
            <svg
              className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-edge bg-panel z-50 overflow-hidden"
              style={{ boxShadow: "var(--shadow-panel)" }}
            >
              {/* Designs menu item */}
              <button
                onClick={() => setDesignsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-hull transition"
              >
                <span>Designs</span>
                <svg
                  className={`h-3.5 w-3.5 text-muted transition-transform ${designsOpen ? "rotate-90" : ""}`}
                  viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Design picker (expands inline) */}
              {designsOpen && (
                <div className="border-t border-edge bg-hull px-2 py-2">
                  {designs.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => pickDesign(d.id)}
                      className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition ${
                        current === d.id
                          ? "bg-panel text-quant"
                          : "text-ink hover:bg-panel"
                      }`}
                    >
                      <span className="text-xs font-semibold">{d.label}</span>
                      {current === d.id && (
                        <svg className="h-3 w-3 shrink-0 text-quant" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 6l3 3 6-6" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Divider + logout */}
              <div className="border-t border-edge" />
              <button
                onClick={logout}
                className="w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-hull hover:text-danger transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

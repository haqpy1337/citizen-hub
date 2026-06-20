"use client";

import { useEffect } from "react";

export type Design = "mole" | "cockpit" | "cream" | "purple" | "hornet";

const ALL_THEMES: Design[] = ["mole", "cockpit", "cream", "purple", "hornet"];
const DEFAULT: Design = "mole";

function applyDesign(design: Design) {
  const html = document.documentElement;
  ALL_THEMES.forEach((t) => html.classList.remove(`theme-${t}`));
  if (design !== DEFAULT) {
    html.classList.add(`theme-${design}`);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const raw = localStorage.getItem("hma-design");
    // Migrate old keys from previous sessions
    const migrated: Record<string, Design> = {
      swiss: "mole", mineral: "cream", noir: "purple", dark: "mole", light: "mole",
    };
    const stored = (raw ? (migrated[raw] ?? raw) : DEFAULT) as Design;
    applyDesign(stored);
  }, []);
  return <>{children}</>;
}

export function useDesign() {
  function setDesign(design: Design) {
    applyDesign(design);
    localStorage.setItem("hma-design", design);
    window.dispatchEvent(new CustomEvent("hma-design-change", { detail: design }));
  }
  return setDesign;
}

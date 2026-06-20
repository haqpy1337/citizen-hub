import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void:      "var(--color-void)",
        hull:      "var(--color-hull)",
        panel:     "var(--color-panel)",
        edge:      "var(--color-edge)",
        steel:     "var(--color-steel)",
        ink:       "var(--color-ink)",
        muted:     "var(--color-muted)",
        quant:     "var(--color-quant)",
        "quant-dim": "var(--color-quant-dim)",
        amber:     "var(--color-amber)",
        toxic:     "var(--color-toxic)",
        danger:    "var(--color-danger)",
      },
      fontFamily: {
        display: ["var(--font-rajdhani)", "system-ui", "sans-serif"],
        body:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow:  "var(--shadow-glow)",
        panel: "var(--shadow-panel)",
      },
      backgroundImage: {
        grid: "linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;

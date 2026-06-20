"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { OreCommodity } from "@/lib/clientTypes";

interface Props {
  value: string;
  ores: OreCommodity[];
  onChange: (name: string, ore: OreCommodity | null) => void;
  placeholder?: string;
}

export default function OreCombobox({ value, ores, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = query.trim()
    ? ores.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : ores;

  function select(ore: OreCommodity) {
    setQuery(ore.name);
    onChange(ore.name, ore);
    setOpen(false);
  }

  function handleInput(v: string) {
    setQuery(v);
    updateRect();
    setOpen(true);
    const exact = ores.find((o) => o.name.toLowerCase() === v.toLowerCase());
    onChange(v, exact ?? null);
  }

  function updateRect() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (inputRef.current && !inputRef.current.contains(target)) {
        // Allow clicks on the portal list itself (handled by onMouseDown on items)
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

  const dropdown = open && filtered.length > 0 && rect ? createPortal(
    <ul
      style={{
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: 224,
        overflowY: "auto",
        background: "var(--color-panel)",
        border: "1px solid var(--color-edge)",
        borderRadius: "var(--panel-radius, 0.375rem)",
        boxShadow: "var(--shadow-panel)",
      }}
    >
      {filtered.slice(0, 40).map((ore) => (
        <li key={ore.id}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); select(ore); }}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              textAlign: "left",
              fontSize: "0.875rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: ore.name === query ? "var(--color-quant)" : "var(--color-ink)",
              display: "flex",
              gap: "0.5rem",
              alignItems: "baseline",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-hull)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <span>{ore.name}</span>
          </button>
        </li>
      ))}
    </ul>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="field w-full"
        value={query}
        placeholder={placeholder ?? "Ore name…"}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => { updateRect(); setOpen(true); }}
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}

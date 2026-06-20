"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration, secondsLeft } from "@/lib/format";

interface Props {
  startedAt: string;
  finishesAt: string;
  durationSec: number;
  status: string;
  onExpire?: () => void;
}

export default function JobTimer({ startedAt, finishesAt, durationSec, status, onExpire }: Props) {
  const [left, setLeft] = useState(() => secondsLeft(finishesAt));
  const firedRef = useRef(false);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const l = secondsLeft(finishesAt);
      setLeft(l);
      if (l <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    }, 1000);
    // Fire immediately if already expired when mounted
    if (secondsLeft(finishesAt) <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
    return () => clearInterval(id);
  }, [finishesAt, status, onExpire]);

  const done = status === "running" ? left <= 0 : status !== "cancelled";
  const elapsed = Math.max(0, durationSec - left);
  const pct =
    status === "running"
      ? Math.min(100, (elapsed / durationSec) * 100)
      : status === "cancelled"
        ? 0
        : 100;

  const ready = status === "running" && left <= 0;
  const accent = ready
    ? "bg-toxic"
    : status === "cancelled"
      ? "bg-steel"
      : status === "running"
        ? "bg-quant"
        : "bg-toxic";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {status === "cancelled"
            ? "Cancelled"
            : status === "collected"
              ? "Collected"
              : status === "done"
                ? "Ready for pickup"
                : ready
                  ? "Ready for pickup"
                  : "Processing"}
        </span>
        <span
          className={`font-mono text-sm tabular-nums ${
            ready ? "text-toxic" : "text-ink"
          }`}
        >
          {status === "running" ? (ready ? "00s" : formatDuration(left)) : "—"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-edge bg-hull">
        <div
          className={`h-full ${accent} transition-[width] duration-1000 ease-linear`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

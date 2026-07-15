import { useEffect, useRef, useState } from "react";
import { useAuth, usePage } from "../App";
import { api, Job } from "../lib/api";
import { formatDuration, secondsLeft } from "../lib/format";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ── Server Status ─────────────────────────────────────────────────────────────

function ServerStatusPanel() {
  const [status, setStatus] = useState<{ indicator: string; description: string; incidents: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.fetchServerStatus()
      .then(res => { if (res.ok) setStatus(res); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dotColor =
    !status || loading ? "bg-muted/40" :
    status.indicator === "none" ? "bg-green-500" :
    status.indicator === "minor" ? "bg-amber-400" :
    "bg-danger";

  const label =
    !status || loading ? "Checking…" :
    status.description;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 panel">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted/50 shrink-0">RSI Status</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${status?.indicator === "none" ? "shadow-[0_0_6px_1px_rgba(74,222,128,0.5)]" : ""}`} />
        <span className="text-xs font-mono text-ink/80">{label}</span>
      </div>
      {status?.incidents && status.incidents.length > 0 && (
        <span className="text-[10px] text-amber-400 ml-1 truncate">{status.incidents[0]}</span>
      )}
    </div>
  );
}

// ── Active Jobs Alert ─────────────────────────────────────────────────────────

function ActiveJobsAlert({ jobs }: { jobs: Job[] }) {
  const { setPage } = usePage();
  const now = useNow();

  const readyJobs    = jobs.filter(j => j.status === "done");
  const soonJobs     = jobs.filter(j => j.status === "running" && secondsLeft(j.finishesAt, now) < 30 * 60 && secondsLeft(j.finishesAt, now) > 0);

  if (readyJobs.length === 0 && soonJobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {readyJobs.length > 0 && (
        <button
          onClick={() => setPage("refinery-jobs")}
          className="flex items-center gap-3 px-4 py-3 panel border-l-2 border-green-500 hover:bg-green-500/5 transition-colors text-left w-full"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_2px_rgba(74,222,128,0.4)] shrink-0" />
          <span className="text-sm font-semibold text-green-400">
            {readyJobs.length === 1 ? "1 job ready to collect" : `${readyJobs.length} jobs ready to collect`}
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted/50">Go to Refinery Jobs →</span>
        </button>
      )}
      {soonJobs.length > 0 && (
        <button
          onClick={() => setPage("refinery-jobs")}
          className="flex items-center gap-3 px-4 py-3 panel border-l-2 border-amber-400/70 hover:bg-amber-400/5 transition-colors text-left w-full"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-400">
            {soonJobs.length === 1
              ? `1 job finishing in ${formatDuration(secondsLeft(soonJobs[0].finishesAt, now))}`
              : `${soonJobs.length} jobs finishing soon`}
          </span>
          <span className="ml-auto text-[10px] font-mono text-muted/50">Go to Refinery Jobs →</span>
        </button>
      )}
    </div>
  );
}

// ── This Week in Star Citizen ─────────────────────────────────────────────────

interface TwiskItem { title: string; link: string; date: string; imageUrl: string | null; description: string }

function TwiskPanel() {
  const [item, setItem]       = useState<TwiskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  function load() {
    setLoading(true); setError(false);
    window.api.fetchTwisk()
      .then(res => { if (res.ok && res.item) setItem(res.item); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const fmtDate = (d: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); }
    catch { return d.slice(0, 10); }
  };

  return (
    <div className="panel flex flex-col">
      {loading ? (
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-4 h-4 border-2 border-quant/30 border-t-quant rounded-full animate-spin shrink-0" />
          <span className="text-xs font-mono text-muted">Loading…</span>
        </div>
      ) : error || !item ? (
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <span className="text-xs text-muted">Could not load article.</span>
          <div className="flex items-center gap-3">
            <button onClick={load} className="text-xs font-mono text-quant hover:underline">↻ Retry</button>
            <button onClick={() => window.open("https://robertsspaceindustries.com/en/comm-link/transmission/")} className="text-xs font-mono text-muted hover:text-quant transition-colors">Open RSI ↗</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 p-4">
          {item.imageUrl && (
            <img src={item.imageUrl} alt="" className="shrink-0 rounded object-cover" style={{ width: 120, height: 80 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">{item.title}</p>
            {item.date && <p className="text-[10px] font-mono text-muted">{fmtDate(item.date)}</p>}
            {item.description && (
              <p className="text-[11px] text-muted/70 leading-relaxed line-clamp-3">{item.description}</p>
            )}
            <div className="flex items-center gap-3 mt-auto pt-1">
              <button onClick={() => window.open(item.link)} className="text-xs font-mono text-quant hover:underline">Read more ↗</button>
              <button onClick={load} className="text-[10px] font-mono text-muted/40 hover:text-muted">↻</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patch Notes ───────────────────────────────────────────────────────────────

interface PatchItem { title: string; link: string; date: string; channel: string }
type PatchTab = "LIVE" | "PTU" | "All";

function PatchNotesPanel() {
  const [items, setItems]     = useState<PatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [idx, setIdx]         = useState(0);
  const [tab, setTab]         = useState<PatchTab>("LIVE");
  const itemsRef              = useRef(items);
  itemsRef.current            = items;

  function fetchNotes() {
    setLoading(true); setError(false); setItems([]); setIdx(0);
    window.api.fetchPatchNotes()
      .then(res => { if (res.ok && res.items.length > 0) setItems(res.items); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetchNotes(); }, []);

  const filtered = tab === "All" ? items : items.filter(i => i.channel === tab);
  const cur      = filtered[Math.min(idx, Math.max(0, filtered.length - 1))];

  const fmtDate = (d: string) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d.slice(0, 10); }
  };

  function changeTab(t: PatchTab) { setTab(t); setIdx(0); }
  function nav(dir: 1 | -1) { setIdx(i => Math.max(0, Math.min(filtered.length - 1, i + dir))); }

  const CHANNEL_CLS: Record<string, string> = {
    LIVE: "border-quant/60 text-quant bg-quant/10",
    PTU:  "border-amber-400/60 text-amber-400 bg-amber-400/10",
    EPTU: "border-muted/40 text-muted",
  };

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-3 pb-2 border-b border-edge/50 shrink-0">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Patch Notes</p>
        <div className="flex gap-1 ml-auto">
          {(["LIVE", "PTU", "All"] as const).map(t => (
            <button key={t} onClick={() => changeTab(t)}
              className={["text-[10px] font-mono px-2 py-0.5 border transition-all",
                tab === t ? "border-quant text-quant bg-quant/10" : "border-edge text-muted hover:text-ink"].join(" ")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-4 h-4 border-2 border-quant/30 border-t-quant rounded-full animate-spin shrink-0" />
          <span className="text-xs font-mono text-muted">Loading patch notes…</span>
        </div>
      ) : error || !cur ? (
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <span className="text-xs text-muted">
            {items.length > 0 && tab !== "All" ? `No ${tab} patches found.` : "Could not load patch notes."}
          </span>
          <div className="flex items-center gap-3">
            {(error || items.length === 0) && (
              <button onClick={fetchNotes} className="text-xs font-mono text-quant hover:underline">↻ Retry</button>
            )}
            <button onClick={() => window.open("https://robertsspaceindustries.com/comm-link/patch-notes")}
              className="text-xs font-mono text-muted hover:text-quant transition-colors">Open RSI ↗</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => nav(-1)} disabled={idx === 0}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0">←</button>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border shrink-0 ${CHANNEL_CLS[cur.channel] ?? CHANNEL_CLS.EPTU}`}>
                {cur.channel}
              </span>
              <p className="text-sm font-medium text-ink truncate">{cur.title}</p>
            </div>
            {cur.date && <p className="text-[10px] font-mono text-muted">{fmtDate(cur.date)}</p>}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-muted/40 tabular-nums">{idx + 1} / {filtered.length}</span>
            <button onClick={() => window.open(cur.link || "https://robertsspaceindustries.com/comm-link/patch-notes")}
              className="text-xs font-mono text-quant hover:underline">Full Notes ↗</button>
          </div>

          <button onClick={() => nav(1)} disabled={idx >= filtered.length - 1}
            className="text-sm font-mono text-muted hover:text-quant transition-colors disabled:opacity-20 shrink-0">→</button>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!token) return;
    api.jobs.list(token).then(setJobs).catch(() => {});
  }, [token]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="eyebrow">Dashboard</h1>
        <ServerStatusPanel />
      </div>

      <ActiveJobsAlert jobs={jobs} />

      <div className="flex gap-4">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <p className="eyebrow text-muted/50">This Week in Star Citizen</p>
          <TwiskPanel />
        </div>
        <div className="flex flex-col gap-3 shrink-0" style={{ width: 380 }}>
          <p className="eyebrow text-muted/50">Patch Notes</p>
          <PatchNotesPanel />
        </div>
      </div>
    </div>
  );
}

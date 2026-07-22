import { useEffect, useState } from "react";
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
  const [state, setState]   = useState<"loading" | "ok" | "error">("loading");

  function load() {
    setState("loading");
    // frontend-side timeout so "Checking…" never hangs indefinitely
    const guard = setTimeout(() => setState(s => s === "loading" ? "error" : s), 10_000);
    window.api.fetchServerStatus()
      .then(res => { if (res.ok) { setStatus(res as typeof status); setState("ok"); } else setState("error"); })
      .catch(() => setState("error"))
      .finally(() => clearTimeout(guard));
  }

  useEffect(() => { load(); }, []);

  const dotColor =
    state === "loading" ? "bg-muted/40 animate-pulse" :
    state === "error"   ? "bg-muted/30" :
    status?.indicator === "none"  ? "bg-green-500" :
    status?.indicator === "minor" ? "bg-amber-400" :
    "bg-danger";

  const label =
    state === "loading" ? "Checking…" :
    state === "error"   ? "Unavailable" :
    status?.description ?? "Unknown";

  return (
    <button onClick={load}
      className="flex items-center gap-2.5 px-4 py-2.5 panel hover:bg-hull/60 transition-colors"
      title="Click to refresh">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted/50 shrink-0">RSI Status</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${status?.indicator === "none" ? "shadow-[0_0_6px_1px_rgba(74,222,128,0.5)]" : ""}`} />
        <span className="text-xs font-mono text-ink/80">{label}</span>
      </div>
      {status?.incidents && status.incidents.length > 0 && (
        <span className="text-[10px] text-amber-400 ml-1 truncate">{status.incidents[0]}</span>
      )}
    </button>
  );
}

// ── Alerts ───────────────────────────────────────────────────────────────────

function Alerts({ jobs }: { jobs: Job[] }) {
  const { setPage } = usePage();
  const now = useNow();

  // Only show running jobs whose timer has expired — "collected"/"done" never appear
  const readyJobs = jobs.filter(j =>
    j.status === "running" && secondsLeft(j.finishesAt, now) <= 0
  );
  const soonJobs  = jobs.filter(j =>
    j.status === "running" &&
    secondsLeft(j.finishesAt, now) < 30 * 60 &&
    secondsLeft(j.finishesAt, now) > 0
  );

  if (readyJobs.length === 0 && soonJobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-muted/30 text-xs font-mono">
        No active alerts
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {readyJobs.map(job => (
        <button
          key={job.id}
          onClick={() => setPage("refinery-jobs")}
          className="flex items-center gap-3 px-4 py-3 panel border-l-2 border-green-500 hover:bg-green-500/5 transition-colors text-left w-full"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_2px_rgba(74,222,128,0.4)] shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-400 leading-tight">Ready to collect</p>
            <p className="text-[10px] font-mono text-muted/60 truncate mt-0.5">{job.stationName}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
              {job.materials.map(m => (
                <span key={m.id} className="text-[10px] font-mono text-muted/50">
                  {m.name} <span className="text-quant/70">{m.quantity} {m.unit}</span>
                </span>
              ))}
            </div>
          </div>
          <span className="text-[10px] font-mono text-muted/40 shrink-0">Refinery Jobs →</span>
        </button>
      ))}
      {soonJobs.map(job => {
        const left = secondsLeft(job.finishesAt, now);
        return (
          <button
            key={job.id}
            onClick={() => setPage("refinery-jobs")}
            className="flex items-center gap-3 px-4 py-3 panel border-l-2 border-amber-400/70 hover:bg-amber-400/5 transition-colors text-left w-full"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-400 leading-tight">
                Finishing in {formatDuration(left)}
              </p>
              <p className="text-[10px] font-mono text-muted/60 truncate mt-0.5">{job.stationName}</p>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                {job.materials.map(m => (
                  <span key={m.id} className="text-[10px] font-mono text-muted/50">
                    {m.name} <span className="text-amber-400/70">{m.quantity} {m.unit}</span>
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted/40 shrink-0">Refinery Jobs →</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Patch Notes ───────────────────────────────────────────────────────────────

interface PatchItem { title: string; link: string; date: string; channel: string }
type PatchTab = "LIVE" | "PTU" | "EPTU" | "All";

const CHANNEL_STYLE: Record<string, { badge: string; dot: string }> = {
  LIVE: { badge: "border-quant/50 text-quant  bg-quant/10",         dot: "bg-quant" },
  PTU:  { badge: "border-amber/50  text-amber  bg-amber/10",         dot: "bg-amber" },
  EPTU: { badge: "border-muted/40  text-muted/70 bg-muted/5",        dot: "bg-muted/60" },
};

function channelStyle(ch: string) {
  return CHANNEL_STYLE[ch] ?? CHANNEL_STYLE.EPTU;
}

function PatchNotesPanel() {
  const [items, setItems]     = useState<PatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [tab, setTab]         = useState<PatchTab>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  function fetchNotes() {
    setLoading(true); setError(false); setItems([]); setExpanded(null);
    window.api.fetchPatchNotes()
      .then(res => { if (res.ok && res.items.length > 0) setItems(res.items); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetchNotes(); }, []);

  function toggleExpand(link: string) {
    if (expanded === link) { setExpanded(null); return; }
    setExpanded(link);
    if (detailCache[link] !== undefined) return;
    setDetailLoading(link);
    window.api.fetchPatchNoteDetail(link)
      .then(res => setDetailCache(c => ({ ...c, [link]: res.ok ? res.content : "" })))
      .catch(() => setDetailCache(c => ({ ...c, [link]: "" })))
      .finally(() => setDetailLoading(null));
  }

  const tabs: PatchTab[] = ["All", "LIVE", "PTU", "EPTU"];
  const filtered = tab === "All" ? items : items.filter(i => i.channel === tab);

  const fmtDate = (d: string) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d.slice(0, 10) || null; }
  };

  return (
    <div className="panel flex flex-col" style={{ minHeight: 0, flex: 1 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-edge shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted/60">Patch Notes</p>
        <div className="flex gap-1 ml-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={["text-[9px] font-mono px-2 py-0.5 border transition-all",
                tab === t ? "border-quant text-quant bg-quant/10" : "border-edge/60 text-muted/60 hover:text-ink hover:border-edge"].join(" ")}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={fetchNotes} className="text-[10px] font-mono text-muted/40 hover:text-quant transition-colors ml-1">↻</button>
        <button onClick={() => window.open("https://robertsspaceindustries.com/comm-link/patch-notes")}
          className="text-[10px] font-mono text-muted/40 hover:text-quant transition-colors">↗</button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="w-3.5 h-3.5 border-2 border-quant/30 border-t-quant rounded-full animate-spin shrink-0" />
          <span className="text-xs font-mono text-muted/60">Loading…</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-between px-4 py-4 gap-4">
          <span className="text-xs text-muted/60">Could not load patch notes.</span>
          <button onClick={fetchNotes} className="text-xs font-mono text-quant hover:underline shrink-0">↻ Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-4">
          <span className="text-xs text-muted/60">No {tab} patches found.</span>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {filtered.map((item, i) => {
            const cs = channelStyle(item.channel);
            const date = fmtDate(item.date);
            const isOpen = expanded === item.link;
            const content = detailCache[item.link];
            const isDetailLoading = detailLoading === item.link;
            return (
              <div key={i} className="border-b border-edge/20">
                {/* Row */}
                <button
                  onClick={() => toggleExpand(item.link)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-hull/40 transition-colors text-left"
                >
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 border shrink-0 mt-0.5 ${cs.badge}`}>{item.channel}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-ink/90 font-medium leading-tight block text-xs">{item.title}</span>
                    {date && <span className="text-[9px] font-mono text-muted/40 mt-0.5 block">{date}</span>}
                  </div>
                  <span className="text-[10px] font-mono text-muted/30 shrink-0 mt-0.5 transition-transform"
                    style={{ transform: isOpen ? "rotate(180deg)" : undefined }}>▾</span>
                </button>
                {/* Expanded content */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-edge/10">
                    {isDetailLoading ? (
                      <div className="flex items-center gap-2 py-3">
                        <div className="w-3 h-3 border border-quant/40 border-t-quant rounded-full animate-spin" />
                        <span className="text-[10px] font-mono text-muted/40">Loading content…</span>
                      </div>
                    ) : content ? (
                      <p className="text-[11px] leading-relaxed text-muted/70 whitespace-pre-wrap">{content}</p>
                    ) : (
                      <div className="flex items-center gap-3 py-2">
                        <span className="text-[10px] text-muted/40">Content not available.</span>
                        <button onClick={e => { e.stopPropagation(); window.open(item.link); }}
                          className="text-[10px] font-mono text-quant hover:underline">Open on RSI ↗</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
    const id = setInterval(() => {
      api.jobs.list(token).then(setJobs).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div className="flex flex-col gap-4" style={{ height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="eyebrow">Dashboard</h1>
        <ServerStatusPanel />
      </div>

      {/* 2-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left: Alerts */}
        <div className="flex flex-col gap-2 min-h-0" style={{ width: 340, flexShrink: 0 }}>
          <p className="eyebrow text-muted/50 shrink-0">Alerts</p>
          <div className="overflow-y-auto [scrollbar-width:thin]">
            <Alerts jobs={jobs} />
          </div>
        </div>

        {/* Right: Patch Notes */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <p className="eyebrow text-muted/50 shrink-0">Patch Notes</p>
          <PatchNotesPanel />
        </div>

      </div>
    </div>
  );
}

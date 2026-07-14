import { app, BrowserWindow, ipcMain, shell, dialog, net } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import type { Database } from "sql.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface User { id: string; username: string; avatarUrl: string | null }
interface JobMaterial { id: string; commodityId: number | null; name: string; quantity: number; unit: string; yieldPercent: number | null }
interface Job { id: string; stationId: number | null; stationName: string; systemName: string | null; method: string | null; startedAt: string; durationSec: number; finishesAt: string; status: string; note: string | null; materials: JobMaterial[] }

// ── Globals ──────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
const sessions = new Map<string, string>(); // token → userId
let db: Database;
let dbPath: string;

// ── Settings (persisted JSON) ─────────────────────────────────────────────────

interface AppSettings { zoom?: number; lastVersion?: string; isFirstRunAfterUpdate?: boolean }
let settingsPath: string;
let settings: AppSettings = {};

function loadSettings() {
  settingsPath = path.join(app.getPath("userData"), "settings.json");
  try { settings = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch { settings = {}; }

  // Detect version change (= first run after update)
  const current = app.getVersion();
  if (settings.lastVersion && settings.lastVersion !== current) {
    settings.isFirstRunAfterUpdate = true;
  } else {
    settings.isFirstRunAfterUpdate = false;
  }
  settings.lastVersion = current;
  saveSettings();
}
function saveSettings() {
  try { fs.writeFileSync(settingsPath, JSON.stringify(settings)); } catch {}
}

// ── Paths ────────────────────────────────────────────────────────────────────

function dataDir() {
  const d = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// ── Database ─────────────────────────────────────────────────────────────────

async function initDb() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require("sql.js");

  // In packaged app, WASM file is in resources (asarUnpack)
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist", "sql-wasm.wasm")
    : path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");

  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  dbPath = path.join(dataDir(), "citizen-hub.db");

  // Try to open existing DB; recover from corruption by renaming and starting fresh
  let fileData: Buffer | null = null;
  if (fs.existsSync(dbPath)) {
    try {
      fileData = fs.readFileSync(dbPath);
      // Quick sanity check: SQLite magic bytes
      if (fileData.length < 16 || fileData.toString("utf8", 0, 6) !== "SQLite") {
        throw new Error("Not a valid SQLite file");
      }
    } catch {
      const backup = dbPath + ".bak." + Date.now();
      try { fs.renameSync(dbPath, backup); } catch {}
      fileData = null;
    }
  }
  // Also remove any leftover WAL/SHM files from old runs
  for (const ext of ["-wal", "-shm"]) {
    const f = dbPath + ext;
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
  db = new SQL.Database(fileData);

  db.run("PRAGMA foreign_keys = ON");
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS refinery_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station_id INTEGER,
      station_name TEXT NOT NULL,
      system_name TEXT,
      method TEXT,
      started_at TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      finishes_at TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_materials (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES refinery_jobs(id) ON DELETE CASCADE,
      commodity_id INTEGER,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'SCU',
      yield_percent REAL
    );
  `);
  save();
}

function save() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// ── Query helpers ─────────────────────────────────────────────────────────────

function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as Parameters<typeof stmt.bind>[0]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  return all<T>(sql, params)[0];
}

function run(sql: string, params: unknown[] = []) {
  db.run(sql, params as Parameters<typeof db.run>[1]);
  save();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

function requireUser(token: string): string {
  const userId = sessions.get(token);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function getJobMaterials(jobId: string): JobMaterial[] {
  return all("SELECT * FROM job_materials WHERE job_id = ?", [jobId]).map((r) => ({
    id: r.id as string,
    commodityId: r.commodity_id as number | null,
    name: r.name as string,
    quantity: r.quantity as number,
    unit: r.unit as string,
    yieldPercent: r.yield_percent as number | null,
  }));
}

function rowToJob(r: Record<string, unknown>): Job {
  return {
    id: r.id as string,
    stationId: r.station_id as number | null,
    stationName: r.station_name as string,
    systemName: r.system_name as string | null,
    method: r.method as string | null,
    startedAt: r.started_at as string,
    durationSec: r.duration_sec as number,
    finishesAt: r.finishes_at as string,
    status: r.status as string,
    note: r.note as string | null,
    materials: getJobMaterials(r.id as string),
  };
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpc() {
  // Local-only auth: auto-create a single user on first launch
  ipcMain.handle("auth:getOrCreateLocal", () => {
    let row = get("SELECT id, username FROM users WHERE id = 'local'");
    if (!row) {
      run("INSERT INTO users (id, username, password_hash) VALUES ('local', 'Pilot', '')", []);
      row = get("SELECT id, username FROM users WHERE id = 'local'")!;
    }
    const token = uid();
    sessions.set(token, "local");
    return { token, user: { id: "local", username: row.username as string, avatarUrl: null } as User };
  });

  ipcMain.handle("jobs:list", (_, token: string) => {
    const userId = requireUser(token);
    return all("SELECT * FROM refinery_jobs WHERE user_id = ? ORDER BY created_at DESC", [userId]).map(rowToJob);
  });

  ipcMain.handle("jobs:create", (_, token: string, data: Omit<Job, "id">) => {
    const userId = requireUser(token);
    const jobId = uid();
    run(
      `INSERT INTO refinery_jobs (id,user_id,station_id,station_name,system_name,method,started_at,duration_sec,finishes_at,status,note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [jobId, userId, data.stationId ?? null, data.stationName, data.systemName ?? null,
       data.method ?? null, data.startedAt, data.durationSec, data.finishesAt,
       data.status ?? "running", data.note ?? null]
    );
    for (const m of data.materials ?? []) {
      run("INSERT INTO job_materials (id,job_id,commodity_id,name,quantity,unit,yield_percent) VALUES (?,?,?,?,?,?,?)",
        [uid(), jobId, m.commodityId ?? null, m.name, m.quantity, m.unit ?? "SCU", m.yieldPercent ?? null]);
    }
    return rowToJob(get("SELECT * FROM refinery_jobs WHERE id = ?", [jobId])!);
  });

  ipcMain.handle("jobs:update", (_, token: string, id: string, data: { status?: string; note?: string }) => {
    const userId = requireUser(token);
    if (data.status !== undefined) run("UPDATE refinery_jobs SET status=? WHERE id=? AND user_id=?", [data.status, id, userId]);
    if (data.note !== undefined) run("UPDATE refinery_jobs SET note=? WHERE id=? AND user_id=?", [data.note, id, userId]);
  });

  ipcMain.handle("jobs:delete", (_, token: string, id: string) => {
    const userId = requireUser(token);
    run("DELETE FROM refinery_jobs WHERE id=? AND user_id=?", [id, userId]);
  });

  // isSilent=true: NSIS /S flag (no wizard), isForceRunAfter=true: relaunch app after install
  ipcMain.handle("install-update", () => { autoUpdater.quitAndInstall(true, true); });

  ipcMain.handle("update:check", async () => {
    try { await autoUpdater.checkForUpdates(); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e) }; }
  });

  ipcMain.handle("app:version", () => app.getVersion());

  ipcMain.handle("app:isFirstRunAfterUpdate", () => !!settings.isFirstRunAfterUpdate);

  ipcMain.handle("titlebar:setColors", (_, color: string, symbolColor: string) => {
    try { mainWindow?.setTitleBarOverlay({ color, symbolColor }); } catch {}
  });

  ipcMain.handle("app:getZoom", () => settings.zoom ?? 1);
  ipcMain.handle("app:setZoom", (_e, factor: number) => {
    settings.zoom = Math.max(0.5, Math.min(2, factor));
    saveSettings();
    mainWindow?.webContents.setZoomFactor(settings.zoom);
  });

  ipcMain.handle("db:ping", () => {
    const row = get<{ result: number }>("SELECT 1 AS result");
    return row?.result === 1;
  });

  ipcMain.handle("patchnotes:fetch", async () => {
    type PatchItem = { title: string; link: string; date: string; channel: string };

    const HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    function parseCdata(s: string): string {
      return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    }
    function extractTag(block: string, tag: string): string {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? parseCdata(m[1].trim()) : "";
    }
    function channelFromTitle(title: string): string {
      const t = title.toUpperCase();
      if (t.includes("EPTU")) return "EPTU";
      if (t.includes("PTU"))  return "PTU";
      return "LIVE";
    }

    async function netGet(url: string, extraHeaders: Record<string,string> = {}, timeoutMs = 14000): Promise<string | null> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await net.fetch(url, {
          signal: controller.signal as AbortSignal,
          headers: { ...HEADERS, ...extraHeaders },
        });
        if (!res.ok) return null;
        return await res.text();
      } catch { return null; }
      finally { clearTimeout(timer); }
    }

    // Strategy 1: RSI Comm-Link Patch Notes RSS feeds
    const RSS_URLS = [
      "https://robertsspaceindustries.com/comm-link/patch-notes.rss",
      "https://robertsspaceindustries.com/comm-link/19.rss",
      "https://robertsspaceindustries.com/feed/19",
    ];
    for (const url of RSS_URLS) {
      const xml = await netGet(url, { Accept: "application/rss+xml,application/xml,text/xml,*/*" });
      if (!xml || !xml.includes("<item>")) continue;
      const items: PatchItem[] = [];
      const rx = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(xml)) !== null && items.length < 30) {
        const block = m[1];
        const title = extractTag(block, "title");
        if (!title.toLowerCase().includes("patch")) continue;
        const link  = extractTag(block, "link") || extractTag(block, "guid");
        const date  = extractTag(block, "pubDate") || extractTag(block, "dc:date");
        items.push({ title, link, date, channel: channelFromTitle(title) });
      }
      if (items.length > 0) return { ok: true, items };
    }

    // Strategy 2: Scrape the Patch Notes comm-link page
    const html = await netGet(
      "https://robertsspaceindustries.com/comm-link/patch-notes",
      { Accept: "text/html,application/xhtml+xml,*/*" }
    );
    if (html) {
      const items: PatchItem[] = [];
      const seen = new Set<string>();
      const linkRx = /href="(\/comm-link\/[^"#?]*patch[^"#?]*)"/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRx.exec(html)) !== null && items.length < 30) {
        const slug = m[1];
        if (seen.has(slug)) continue;
        seen.add(slug);
        const block = html.slice(Math.max(0, m.index - 200), m.index + 800);
        const hm = block.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
          || block.match(/title="([^"]+)"/i)
          || block.match(/alt="([^"]+)"/i);
        if (!hm) continue;
        const title = hm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (title.length < 8 || !title.toLowerCase().includes("patch")) continue;
        items.push({ title, link: `https://robertsspaceindustries.com${slug}`, date: "", channel: channelFromTitle(title) });
      }
      if (items.length > 0) return { ok: true, items };
    }

    return { ok: false, items: [] };
  });
}

// ── Window ───────────────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: "Citizen Hub",
    backgroundColor: "#060402",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#060402", symbolColor: "#e05010", height: 36 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  mainWindow.webContents.on("did-finish-load", () => {
    if (settings.zoom && settings.zoom !== 1) mainWindow?.webContents.setZoomFactor(settings.zoom);
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (!app.isPackaged) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
  }
}

// ── Auto-Updater ─────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-available", (info) =>
    mainWindow?.webContents.send("update-available", info.version));
  autoUpdater.on("update-downloaded", (info) =>
    mainWindow?.webContents.send("update-downloaded", info.version));
  autoUpdater.on("error", (err) =>
    mainWindow?.webContents.send("update-error", err.message));
  autoUpdater.on("update-not-available", () =>
    mainWindow?.webContents.send("update-not-available"));
  // Check quickly so result is visible on boot screen
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

// Single-instance lock — if another instance is already running, focus it and exit
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

process.on("uncaughtException", (err) => {
  // Only crash for startup errors; runtime errors (network, etc.) are logged but non-fatal
  const msg = String(err);
  console.error("[uncaughtException]", msg);
  if (msg.includes("SQLITE") || msg.includes("Cannot read") || msg.includes("Cannot set")) {
    dialog.showErrorBox("Citizen Hub – Fatal Error", msg);
    app.exit(1);
  }
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

app.whenReady().then(async () => {
  try {
    loadSettings();
    await initDb();
    registerIpc();
    await createWindow();
    if (app.isPackaged) setupAutoUpdater();
  } catch (err) {
    dialog.showErrorBox("Citizen Hub – Startup Error", String(err));
    app.exit(1);
  }
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", async () => { if (BrowserWindow.getAllWindows().length === 0) await createWindow(); });

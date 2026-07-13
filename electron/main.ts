import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
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
  const fileData = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = new SQL.Database(fileData);

  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
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

  ipcMain.handle("install-update", () => { autoUpdater.quitAndInstall(); });
}

// ── Window ───────────────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: "Citizen Hub",
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
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
  autoUpdater.on("update-available", () => mainWindow?.webContents.send("update-available"));
  autoUpdater.on("update-downloaded", () => mainWindow?.webContents.send("update-downloaded"));
  autoUpdater.on("error", () => {});
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  dialog.showErrorBox("Citizen Hub – Error", String(err));
  app.exit(1);
});

app.whenReady().then(async () => {
  try {
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

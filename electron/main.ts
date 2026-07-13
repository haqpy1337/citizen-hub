import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

// ── Types ────────────────────────────────────────────────────────────────────

interface User { id: string; username: string; avatarUrl: string | null }
interface JobMaterial { id: string; commodityId: number | null; name: string; quantity: number; unit: string; yieldPercent: number | null }
interface Job { id: string; stationId: number | null; stationName: string; systemName: string | null; method: string | null; startedAt: string; durationSec: number; finishesAt: string; status: string; note: string | null; materials: JobMaterial[] }

// ── Globals ──────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
const sessions = new Map<string, string>(); // token → userId

// ── Paths ────────────────────────────────────────────────────────────────────

function dataDir() {
  const d = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// ── Database ─────────────────────────────────────────────────────────────────

let db: ReturnType<typeof import("better-sqlite3")>;

function initDb() {
  // Dynamic require so electron-builder can find and unpack the native module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const dbPath = path.join(dataDir(), "citizen-hub.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

function requireUser(token: string): string {
  const userId = sessions.get(token);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function rowToJob(row: Record<string, unknown>, materials: JobMaterial[]): Job {
  return {
    id: row.id as string,
    stationId: row.station_id as number | null,
    stationName: row.station_name as string,
    systemName: row.system_name as string | null,
    method: row.method as string | null,
    startedAt: row.started_at as string,
    durationSec: row.duration_sec as number,
    finishesAt: row.finishes_at as string,
    status: row.status as string,
    note: row.note as string | null,
    materials,
  };
}

function getJobMaterials(jobId: string): JobMaterial[] {
  return (db.prepare("SELECT * FROM job_materials WHERE job_id = ?").all(jobId) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    commodityId: r.commodity_id as number | null,
    name: r.name as string,
    quantity: r.quantity as number,
    unit: r.unit as string,
    yieldPercent: r.yield_percent as number | null,
  }));
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpc() {
  // Auth
  ipcMain.handle("auth:register", async (_, username: string, password: string) => {
    if (!username?.trim() || !password) throw new Error("Username and password required");
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
    if (existing) throw new Error("Username already taken");
    const id = uid();
    const hash = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(id, username.trim(), hash);
    const token = uid();
    sessions.set(token, id);
    return { token, user: { id, username: username.trim(), avatarUrl: null } };
  });

  ipcMain.handle("auth:login", async (_, username: string, password: string) => {
    const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username?.trim()) as Record<string, unknown> | undefined;
    if (!row) throw new Error("Invalid username or password");
    const ok = await bcrypt.compare(password, row.password_hash as string);
    if (!ok) throw new Error("Invalid username or password");
    const token = uid();
    sessions.set(token, row.id as string);
    return { token, user: { id: row.id, username: row.username, avatarUrl: row.avatar_url } as User };
  });

  ipcMain.handle("auth:logout", (_, token: string) => {
    sessions.delete(token);
  });

  ipcMain.handle("auth:me", (_, token: string) => {
    const userId = sessions.get(token);
    if (!userId) return null;
    const row = db.prepare("SELECT id, username, avatar_url FROM users WHERE id = ?").get(userId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id, username: row.username, avatarUrl: row.avatar_url } as User;
  });

  // Jobs
  ipcMain.handle("jobs:list", (_, token: string) => {
    const userId = requireUser(token);
    const rows = db.prepare("SELECT * FROM refinery_jobs WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Record<string, unknown>[];
    return rows.map((r) => rowToJob(r, getJobMaterials(r.id as string)));
  });

  ipcMain.handle("jobs:create", (_, token: string, data: Omit<Job, "id">) => {
    const userId = requireUser(token);
    const jobId = uid();
    db.prepare(`INSERT INTO refinery_jobs (id, user_id, station_id, station_name, system_name, method, started_at, duration_sec, finishes_at, status, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      jobId, userId, data.stationId ?? null, data.stationName, data.systemName ?? null,
      data.method ?? null, data.startedAt, data.durationSec, data.finishesAt,
      data.status ?? "running", data.note ?? null
    );
    for (const m of data.materials ?? []) {
      db.prepare("INSERT INTO job_materials (id, job_id, commodity_id, name, quantity, unit, yield_percent) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        uid(), jobId, m.commodityId ?? null, m.name, m.quantity, m.unit ?? "SCU", m.yieldPercent ?? null
      );
    }
    return rowToJob(
      db.prepare("SELECT * FROM refinery_jobs WHERE id = ?").get(jobId) as Record<string, unknown>,
      getJobMaterials(jobId)
    );
  });

  ipcMain.handle("jobs:update", (_, token: string, id: string, data: Partial<Pick<Job, "status" | "note">>) => {
    const userId = requireUser(token);
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.status !== undefined) { sets.push("status = ?"); vals.push(data.status); }
    if (data.note !== undefined) { sets.push("note = ?"); vals.push(data.note); }
    if (!sets.length) return;
    vals.push(id, userId);
    db.prepare(`UPDATE refinery_jobs SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...vals);
  });

  ipcMain.handle("jobs:delete", (_, token: string, id: string) => {
    const userId = requireUser(token);
    db.prepare("DELETE FROM refinery_jobs WHERE id = ? AND user_id = ?").run(id, userId);
  });

  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall();
  });
}

// ── Window ───────────────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Citizen Hub",
    backgroundColor: "#0a0812",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  const isDev = !app.isPackaged;
  if (isDev) {
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
  autoUpdater.on("error", () => {}); // suppress in production
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
    initDb();
    registerIpc();
    await createWindow();
    if (app.isPackaged) setupAutoUpdater();
  } catch (err) {
    dialog.showErrorBox("Citizen Hub – Startup Error", String(err));
    app.exit(1);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) await createWindow();
});

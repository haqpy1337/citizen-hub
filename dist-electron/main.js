"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const http = __importStar(require("http"));
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
// ── Globals ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let isInstallingUpdate = false;
const sessions = new Map(); // token → userId
let db;
let dbPath;
let settingsPath;
let settings = {};
function loadSettings() {
    settingsPath = path.join(electron_1.app.getPath("userData"), "settings.json");
    try {
        settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    }
    catch {
        settings = {};
    }
    // Detect version change (= first run after update)
    const current = electron_1.app.getVersion();
    if (settings.lastVersion && settings.lastVersion !== current) {
        settings.isFirstRunAfterUpdate = true;
    }
    else {
        settings.isFirstRunAfterUpdate = false;
    }
    settings.lastVersion = current;
    saveSettings();
}
function saveSettings() {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings));
    }
    catch { }
}
// ── Paths ────────────────────────────────────────────────────────────────────
function dataDir() {
    const d = path.join(electron_1.app.getPath("userData"), "data");
    fs.mkdirSync(d, { recursive: true });
    return d;
}
// ── Database ─────────────────────────────────────────────────────────────────
async function initDb() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const initSqlJs = require("sql.js");
    // asar:false — all files land under resources/app, no .unpacked directory
    const wasmPath = electron_1.app.isPackaged
        ? path.join(process.resourcesPath, "app", "node_modules", "sql.js", "dist", "sql-wasm.wasm")
        : path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    dbPath = path.join(dataDir(), "citizen-hub.db");
    // Try to open existing DB; recover from corruption by renaming and starting fresh
    let fileData = null;
    if (fs.existsSync(dbPath)) {
        try {
            fileData = fs.readFileSync(dbPath);
            // Quick sanity check: SQLite magic bytes
            if (fileData.length < 16 || fileData.toString("utf8", 0, 6) !== "SQLite") {
                throw new Error("Not a valid SQLite file");
            }
        }
        catch {
            const backup = dbPath + ".bak." + Date.now();
            try {
                fs.renameSync(dbPath, backup);
            }
            catch { }
            fileData = null;
        }
    }
    // Also remove any leftover WAL/SHM files from old runs
    for (const ext of ["-wal", "-shm"]) {
        const f = dbPath + ext;
        try {
            if (fs.existsSync(f))
                fs.unlinkSync(f);
        }
        catch { }
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
function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}
function get(sql, params = []) {
    return all(sql, params)[0];
}
function run(sql, params = []) {
    db.run(sql, params);
    save();
}
// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID(); }
function requireUser(token) {
    const userId = sessions.get(token);
    if (!userId)
        throw new Error("Not authenticated");
    return userId;
}
function getJobMaterials(jobId) {
    return all("SELECT * FROM job_materials WHERE job_id = ?", [jobId]).map((r) => ({
        id: r.id,
        commodityId: r.commodity_id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        yieldPercent: r.yield_percent,
    }));
}
function rowToJob(r) {
    return {
        id: r.id,
        stationId: r.station_id,
        stationName: r.station_name,
        systemName: r.system_name,
        method: r.method,
        startedAt: r.started_at,
        durationSec: r.duration_sec,
        finishesAt: r.finishes_at,
        status: r.status,
        note: r.note,
        materials: getJobMaterials(r.id),
    };
}
// ── HTTP helpers (shared by IPC handlers) ────────────────────────────────────
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};
async function netGet(url, extraHeaders = {}, timeoutMs = 14000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await electron_1.net.fetch(url, {
            signal: controller.signal,
            headers: { ...HEADERS, ...extraHeaders },
        });
        if (!res.ok)
            return null;
        return await res.text();
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
// ── IPC Handlers ─────────────────────────────────────────────────────────────
function registerIpc() {
    // Local-only auth: auto-create a single user on first launch
    electron_1.ipcMain.handle("auth:getOrCreateLocal", () => {
        let row = get("SELECT id, username FROM users WHERE id = 'local'");
        if (!row) {
            run("INSERT INTO users (id, username, password_hash) VALUES ('local', 'Pilot', '')", []);
            row = get("SELECT id, username FROM users WHERE id = 'local'");
        }
        const token = uid();
        sessions.set(token, "local");
        return { token, user: { id: "local", username: row.username, avatarUrl: null } };
    });
    electron_1.ipcMain.handle("jobs:list", (_, token) => {
        const userId = requireUser(token);
        return all("SELECT * FROM refinery_jobs WHERE user_id = ? ORDER BY created_at DESC", [userId]).map(rowToJob);
    });
    electron_1.ipcMain.handle("jobs:create", (_, token, data) => {
        const userId = requireUser(token);
        const jobId = uid();
        run(`INSERT INTO refinery_jobs (id,user_id,station_id,station_name,system_name,method,started_at,duration_sec,finishes_at,status,note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [jobId, userId, data.stationId ?? null, data.stationName, data.systemName ?? null,
            data.method ?? null, data.startedAt, data.durationSec, data.finishesAt,
            data.status ?? "running", data.note ?? null]);
        for (const m of data.materials ?? []) {
            run("INSERT INTO job_materials (id,job_id,commodity_id,name,quantity,unit,yield_percent) VALUES (?,?,?,?,?,?,?)", [uid(), jobId, m.commodityId ?? null, m.name, m.quantity, m.unit ?? "SCU", m.yieldPercent ?? null]);
        }
        return rowToJob(get("SELECT * FROM refinery_jobs WHERE id = ?", [jobId]));
    });
    electron_1.ipcMain.handle("jobs:update", (_, token, id, data) => {
        const userId = requireUser(token);
        if (data.status !== undefined)
            run("UPDATE refinery_jobs SET status=? WHERE id=? AND user_id=?", [data.status, id, userId]);
        if (data.note !== undefined)
            run("UPDATE refinery_jobs SET note=? WHERE id=? AND user_id=?", [data.note, id, userId]);
    });
    electron_1.ipcMain.handle("jobs:delete", (_, token, id) => {
        const userId = requireUser(token);
        run("DELETE FROM refinery_jobs WHERE id=? AND user_id=?", [id, userId]);
    });
    // Graceful update install: set flag so window-all-closed doesn't call app.quit(),
    // close window, then run installer after the window is fully gone.
    electron_1.ipcMain.handle("install-update", () => {
        isInstallingUpdate = true;
        electron_1.app.releaseSingleInstanceLock();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.once("closed", () => {
                setTimeout(() => electron_updater_1.autoUpdater.quitAndInstall(true, true), 400);
            });
            mainWindow.close();
        }
        else {
            setTimeout(() => electron_updater_1.autoUpdater.quitAndInstall(true, true), 400);
        }
    });
    electron_1.ipcMain.handle("update:check", async () => {
        try {
            await electron_updater_1.autoUpdater.checkForUpdates();
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: String(e) };
        }
    });
    electron_1.ipcMain.handle("app:version", () => electron_1.app.getVersion());
    electron_1.ipcMain.handle("app:isFirstRunAfterUpdate", () => !!settings.isFirstRunAfterUpdate);
    electron_1.ipcMain.handle("titlebar:setColors", (_, color, symbolColor) => {
        try {
            mainWindow?.setTitleBarOverlay({ color, symbolColor, height: 36 });
        }
        catch { }
    });
    electron_1.ipcMain.handle("window:expand", () => {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        mainWindow.setResizable(true);
        mainWindow.setMinimumSize(900, 600);
        mainWindow.setSize(1280, 800);
        mainWindow.center();
    });
    electron_1.ipcMain.handle("app:getZoom", () => settings.zoom ?? 1);
    electron_1.ipcMain.handle("app:setZoom", (_e, factor) => {
        settings.zoom = Math.max(0.5, Math.min(2, factor));
        saveSettings();
        mainWindow?.webContents.setZoomFactor(settings.zoom);
    });
    electron_1.ipcMain.handle("db:ping", () => {
        const row = get("SELECT 1 AS result");
        return row?.result === 1;
    });
    electron_1.ipcMain.handle("patchnotes:fetch", async () => {
        function parseCdata(s) {
            return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
        }
        function extractTag(block, tag) {
            const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
            return m ? parseCdata(m[1].trim()) : "";
        }
        function channelFromTitle(title) {
            const t = title.toUpperCase();
            if (t.includes("EPTU"))
                return "EPTU";
            if (t.includes("PTU"))
                return "PTU";
            return "LIVE";
        }
        // Strategy 1: RSI Comm-Link Patch Notes RSS feeds
        const RSS_URLS = [
            "https://robertsspaceindustries.com/comm-link/patch-notes.rss",
            "https://robertsspaceindustries.com/comm-link/19.rss",
            "https://robertsspaceindustries.com/feed/19",
        ];
        for (const url of RSS_URLS) {
            const xml = await netGet(url, { Accept: "application/rss+xml,application/xml,text/xml,*/*" });
            if (!xml || !xml.includes("<item>"))
                continue;
            const items = [];
            const rx = /<item>([\s\S]*?)<\/item>/g;
            let m;
            while ((m = rx.exec(xml)) !== null && items.length < 30) {
                const block = m[1];
                const title = extractTag(block, "title");
                if (!title.toLowerCase().includes("patch"))
                    continue;
                const link = extractTag(block, "link") || extractTag(block, "guid");
                const date = extractTag(block, "pubDate") || extractTag(block, "dc:date");
                items.push({ title, link, date, channel: channelFromTitle(title) });
            }
            if (items.length > 0)
                return { ok: true, items };
        }
        // Strategy 2: Scrape the Patch Notes comm-link page
        const html = await netGet("https://robertsspaceindustries.com/comm-link/patch-notes", { Accept: "text/html,application/xhtml+xml,*/*" });
        if (html) {
            const items = [];
            const seen = new Set();
            const linkRx = /href="(\/comm-link\/[^"#?]*patch[^"#?]*)"/gi;
            let m;
            while ((m = linkRx.exec(html)) !== null && items.length < 30) {
                const slug = m[1];
                if (seen.has(slug))
                    continue;
                seen.add(slug);
                const block = html.slice(Math.max(0, m.index - 200), m.index + 800);
                const hm = block.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
                    || block.match(/title="([^"]+)"/i)
                    || block.match(/alt="([^"]+)"/i);
                if (!hm)
                    continue;
                const title = hm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
                if (title.length < 8 || !title.toLowerCase().includes("patch"))
                    continue;
                items.push({ title, link: `https://robertsspaceindustries.com${slug}`, date: "", channel: channelFromTitle(title) });
            }
            if (items.length > 0)
                return { ok: true, items };
        }
        return { ok: false, items: [] };
    });
    // "This Week in Star Citizen" — scrapes latest article from transmission page
    electron_1.ipcMain.handle("twisk:fetch", async () => {
        // 1. Load the transmission index page to find the latest TWISK article link
        const indexHtml = await netGet("https://robertsspaceindustries.com/en/comm-link/transmission/");
        if (!indexHtml)
            return { ok: false, item: null };
        // Find TWISK article links — look for "this-week-in-star-citizen" slugs
        const slugRe = /href="(\/en\/comm-link\/[^"]*this-week-in-star-citizen[^"]*)"/gi;
        const slugs = [];
        let sm;
        while ((sm = slugRe.exec(indexHtml)) !== null) {
            const s = sm[1].split("?")[0];
            if (!slugs.includes(s))
                slugs.push(s);
        }
        // Also try generic article links from this page and pick newest-looking one
        if (slugs.length === 0) {
            const genericRe = /href="(\/en\/comm-link\/transmission\/\d+[^"]*)"/gi;
            let gm;
            while ((gm = genericRe.exec(indexHtml)) !== null) {
                const s = gm[1].split("?")[0];
                if (!slugs.includes(s))
                    slugs.push(s);
            }
        }
        if (slugs.length === 0)
            return { ok: false, item: null };
        // 2. Load the first (newest) article
        const articleUrl = slugs[0].startsWith("http") ? slugs[0] : `https://robertsspaceindustries.com${slugs[0]}`;
        const articleHtml = await netGet(articleUrl);
        if (!articleHtml)
            return { ok: false, item: null };
        // Extract title
        const titleM = articleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
            || articleHtml.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleM ? titleM[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "This Week in Star Citizen";
        // Extract date
        const dateM = articleHtml.match(/datetime="([^"]+)"/i)
            || articleHtml.match(/"datePublished"\s*:\s*"([^"]+)"/i);
        const date = dateM ? dateM[1] : "";
        // Extract featured image
        const imgM = articleHtml.match(/<meta property="og:image" content="([^"]+)"/i)
            || articleHtml.match(/class="[^"]*hero[^"]*"[^>]*src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : null;
        // Extract description/summary (og:description or first paragraph)
        const descM = articleHtml.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
            || articleHtml.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";
        const item = { title, link: articleUrl, date, imageUrl, description };
        return { ok: true, item };
    });
}
// ── Window ───────────────────────────────────────────────────────────────────
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 660, height: 580, minWidth: 660, minHeight: 580,
        resizable: false,
        title: "Citizen Hub",
        backgroundColor: "#060402",
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        titleBarOverlay: { color: "#060402", symbolColor: "#060402", height: 1 },
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => { electron_1.shell.openExternal(url); return { action: "deny" }; });
    mainWindow.webContents.on("did-finish-load", () => {
        if (settings.zoom && settings.zoom !== 1)
            mainWindow?.webContents.setZoomFactor(settings.zoom);
    });
    mainWindow.once("ready-to-show", () => mainWindow?.show());
    // Fallback: show after 8 s if ready-to-show never fires (e.g. slow first load)
    setTimeout(() => { if (mainWindow && !mainWindow.isVisible())
        mainWindow.show(); }, 8000);
    mainWindow.webContents.on("did-fail-load", () => { if (mainWindow && !mainWindow.isVisible())
        mainWindow.show(); });
    if (!electron_1.app.isPackaged) {
        await mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
    }
    else {
        // Serve renderer via local HTTP to avoid file:// protocol issues on Windows
        const rendererDir = path.join(__dirname, "../dist-renderer");
        const port = await serveRenderer(rendererDir);
        await mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);
    }
}
function serveRenderer(dir) {
    const MIME = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".json": "application/json",
    };
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const urlPath = (req.url ?? "/").split("?")[0];
            const filePath = path.join(dir, urlPath === "/" ? "index.html" : urlPath);
            const ext = path.extname(filePath).toLowerCase();
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    // SPA fallback — serve index.html for unknown routes
                    fs.readFile(path.join(dir, "index.html"), (e2, html) => {
                        if (e2) {
                            res.writeHead(404);
                            res.end("Not found");
                            return;
                        }
                        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                        res.end(html);
                    });
                    return;
                }
                res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
                res.end(data);
            });
        });
        server.listen(0, "127.0.0.1", () => {
            const addr = server.address();
            if (!addr || typeof addr === "string") {
                reject(new Error("bad server address"));
                return;
            }
            resolve(addr.port);
        });
        server.on("error", reject);
    });
}
// ── Auto-Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
    electron_updater_1.autoUpdater.autoDownload = true;
    // Don't auto-install on quit — we control install via the "install-update" IPC
    // to ensure releaseSingleInstanceLock() runs first
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
    electron_updater_1.autoUpdater.on("update-available", (info) => mainWindow?.webContents.send("update-available", info.version));
    electron_updater_1.autoUpdater.on("update-downloaded", (info) => mainWindow?.webContents.send("update-downloaded", info.version));
    electron_updater_1.autoUpdater.on("error", (err) => mainWindow?.webContents.send("update-error", err.message));
    electron_updater_1.autoUpdater.on("update-not-available", () => mainWindow?.webContents.send("update-not-available"));
    // Check quickly so result is visible on boot screen
    setTimeout(() => electron_updater_1.autoUpdater.checkForUpdates().catch(() => { }), 3000);
    setInterval(() => electron_updater_1.autoUpdater.checkForUpdates().catch(() => { }), 4 * 60 * 60 * 1000);
}
// ── App lifecycle ─────────────────────────────────────────────────────────────
// Single-instance lock — if another instance is already running, focus it and exit.
// Give existing instance 800ms to respond before hard-exiting; this prevents the lock
// from permanently blocking startup if the previous instance crashed without releasing it.
if (!electron_1.app.requestSingleInstanceLock()) {
    process.exit(0);
}
else {
    electron_1.app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
process.on("uncaughtException", (err) => {
    // Only crash for startup errors; runtime errors (network, etc.) are logged but non-fatal
    const msg = String(err);
    console.error("[uncaughtException]", msg);
    if (msg.includes("SQLITE") || msg.includes("Cannot read") || msg.includes("Cannot set")) {
        electron_1.dialog.showErrorBox("Citizen Hub – Fatal Error", msg);
        electron_1.app.exit(1);
    }
});
process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
});
electron_1.app.whenReady().then(async () => {
    try {
        loadSettings();
        await initDb();
        registerIpc();
        await createWindow();
        if (electron_1.app.isPackaged)
            setupAutoUpdater();
    }
    catch (err) {
        electron_1.dialog.showErrorBox("Citizen Hub – Startup Error", String(err));
        electron_1.app.exit(1);
    }
});
electron_1.app.on("window-all-closed", () => {
    // Skip quit if we're about to run the installer — quitAndInstall handles the exit
    if (!isInstallingUpdate && process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("activate", async () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
    await createWindow(); });

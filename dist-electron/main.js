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
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
let mainWindow = null;
let nextServer = null;
const PORT = 3421;
function getAppDataPath() {
    return path.join(electron_1.app.getPath("userData"), "data");
}
function startNextServer() {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(electron_1.app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."), "app", "server.js");
        const env = {
            ...process.env,
            PORT: String(PORT),
            NODE_ENV: "production",
            DATABASE_URL: `file:${path.join(getAppDataPath(), "citizen-hub.db")}`,
        };
        nextServer = (0, child_process_1.spawn)(process.execPath, [serverPath], { env, stdio: "pipe" });
        nextServer.stdout?.on("data", (data) => {
            const msg = data.toString();
            if (msg.includes("started server") || msg.includes("listening")) {
                resolve();
            }
        });
        nextServer.stderr?.on("data", (data) => {
            console.error("[Next]", data.toString());
        });
        nextServer.on("error", reject);
        // Fallback: poll until server responds
        const start = Date.now();
        const poll = setInterval(async () => {
            if (Date.now() - start > 30000) {
                clearInterval(poll);
                reject(new Error("Next.js server did not start in time"));
                return;
            }
            try {
                await fetch(`http://localhost:${PORT}/api/auth/me`);
                clearInterval(poll);
                resolve();
            }
            catch {
                // not ready yet
            }
        }, 300);
    });
}
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: "deny" };
    });
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });
    await mainWindow.loadURL(`http://localhost:${PORT}`);
}
function setupAutoUpdater() {
    electron_updater_1.autoUpdater.autoDownload = true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    electron_updater_1.autoUpdater.on("update-available", () => {
        mainWindow?.webContents.send("update-available");
    });
    electron_updater_1.autoUpdater.on("update-downloaded", () => {
        mainWindow?.webContents.send("update-downloaded");
    });
    // Check for updates 5 seconds after launch, then every 4 hours
    setTimeout(() => electron_updater_1.autoUpdater.checkForUpdates(), 5000);
    setInterval(() => electron_updater_1.autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}
electron_1.app.whenReady().then(async () => {
    try {
        await startNextServer();
        await createWindow();
        if (electron_1.app.isPackaged)
            setupAutoUpdater();
    }
    catch (err) {
        console.error("Failed to start:", err);
        electron_1.app.quit();
    }
});
electron_1.app.on("window-all-closed", () => {
    nextServer?.kill();
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("activate", async () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
    }
});

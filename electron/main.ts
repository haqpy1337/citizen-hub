import { app, BrowserWindow, shell, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcess } from "child_process";

// Prevent crash loops from unhandled errors
process.on("uncaughtException", (err) => {
  dialog.showErrorBox("Citizen Hub – Error", String(err));
  app.exit(1);
});

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
const PORT = 3421;

function getAppDataPath(): string {
  return path.join(app.getPath("userData"), "data");
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const appDir = app.isPackaged
      ? path.join(process.resourcesPath, "app")
      : path.join(__dirname, "..");

    const serverPath = path.join(appDir, "server.js");

    const dbPath = path.join(getAppDataPath(), "citizen-hub.db").replace(/\\/g, "/");

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      DATABASE_URL: `file:${dbPath}`,
      // Next.js standalone needs to know where its files are
      __NEXT_PRIVATE_STANDALONE_CONFIG: "1",
    };

    nextServer = spawn(process.execPath, [serverPath], {
      env,
      cwd: appDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServer.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      // Next.js 14 outputs "started server on" or "Listening on"
      if (
        msg.includes("started server") ||
        msg.includes("Listening") ||
        msg.includes("listening") ||
        msg.includes("ready")
      ) {
        resolve();
      }
    });

    // Don't suppress stderr — write to a log file instead
    const logPath = path.join(app.getPath("userData"), "server.log");
    const logStream = fs.createWriteStream(logPath, { flags: "a" });
    nextServer.stderr?.pipe(logStream);
    nextServer.stdout?.pipe(logStream);

    nextServer.on("error", reject);
    nextServer.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`server.js exited with code ${code}`));
      }
    });

    // Poll until server responds
    const start = Date.now();
    const poll = setInterval(async () => {
      if (Date.now() - start > 45000) {
        clearInterval(poll);
        reject(new Error("Next.js server did not start within 45s"));
        return;
      }
      try {
        const res = await fetch(`http://localhost:${PORT}/api/auth/me`);
        if (res.status < 500) {
          clearInterval(poll);
          resolve();
        }
      } catch {
        // not ready yet
      }
    }, 500);
  });
}

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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Loading screen while server starts
  mainWindow.loadURL(
    `data:text/html,<!DOCTYPE html><html><head><style>
      body{margin:0;background:#0a0812;display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Segoe UI',sans-serif}
      .spinner{width:40px;height:40px;border:3px solid rgba(16,185,129,.2);border-top-color:#10b981;border-radius:50%;animation:spin .8s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      p{color:#6b7280;margin-top:16px;font-size:14px}
      div{text-align:center}
    </style></head><body><div><div class="spinner"></div><p>Starting Citizen Hub…</p></div></body></html>`
  );
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-available", () => {
    mainWindow?.webContents.send("update-available");
  });
  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update-downloaded");
  });
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

app.whenReady().then(async () => {
  fs.mkdirSync(getAppDataPath(), { recursive: true });

  await createWindow();

  try {
    await startNextServer();
    mainWindow?.loadURL(`http://localhost:${PORT}`);
    if (app.isPackaged) setupAutoUpdater();
  } catch (err) {
    const logPath = path.join(app.getPath("userData"), "server.log");
    dialog.showErrorBox(
      "Citizen Hub – Startup Failed",
      `The server could not start.\n\n${String(err)}\n\nLog: ${logPath}`
    );
    app.exit(1);
  }
});

app.on("window-all-closed", () => {
  nextServer?.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

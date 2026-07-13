import { app, BrowserWindow, shell } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as http from "http";
import { spawn, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
const PORT = 3421;

function getAppDataPath(): string {
  return path.join(app.getPath("userData"), "data");
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(
      app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."),
      "app",
      "server.js"
    );

    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      DATABASE_URL: `file:${path.join(getAppDataPath(), "citizen-hub.db")}`,
    };

    nextServer = spawn(process.execPath, [serverPath], { env, stdio: "pipe" });

    nextServer.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("started server") || msg.includes("listening")) {
        resolve();
      }
    });

    nextServer.stderr?.on("data", (data: Buffer) => {
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
      } catch {
        // not ready yet
      }
    }, 300);
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

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  await mainWindow.loadURL(`http://localhost:${PORT}`);
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

  // Check for updates 5 seconds after launch, then every 4 hours
  setTimeout(() => autoUpdater.checkForUpdates(), 5000);
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    await createWindow();
    if (app.isPackaged) setupAutoUpdater();
  } catch (err) {
    console.error("Failed to start:", err);
    app.quit();
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

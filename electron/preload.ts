import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  auth: {
    getOrCreateLocal: () => ipcRenderer.invoke("auth:getOrCreateLocal"),
  },
  jobs: {
    list: (token: string) => ipcRenderer.invoke("jobs:list", token),
    create: (token: string, data: unknown) =>
      ipcRenderer.invoke("jobs:create", token, data),
    update: (token: string, id: string, data: unknown) =>
      ipcRenderer.invoke("jobs:update", token, id, data),
    delete: (token: string, id: string) =>
      ipcRenderer.invoke("jobs:delete", token, id),
  },
  onUpdateAvailable: (cb: (version: string) => void) =>
    ipcRenderer.on("update-available", (_e, version) => cb(version)),
  onUpdateDownloaded: (cb: (version: string) => void) =>
    ipcRenderer.on("update-downloaded", (_e, version) => cb(version)),
  onUpdateError: (cb: (msg: string) => void) =>
    ipcRenderer.on("update-error", (_e, msg) => cb(msg)),
  onUpdateNotAvailable: (cb: () => void) =>
    ipcRenderer.on("update-not-available", cb),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  fetchNews: () => ipcRenderer.invoke("news:fetch"),
  fetchPatchNotes: () => ipcRenderer.invoke("patchnotes:fetch"),
  fetchTwisk: () => ipcRenderer.invoke("twisk:fetch"),
  fetchServerStatus: () => ipcRenderer.invoke("serverstatus:fetch"),
  isFirstRunAfterUpdate: () => ipcRenderer.invoke("app:isFirstRunAfterUpdate"),
  setTitlebarColors: (color: string, symbolColor: string) => ipcRenderer.invoke("titlebar:setColors", color, symbolColor),
  expandWindow:   () => ipcRenderer.invoke("window:expand"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window:maximize"),
  closeWindow:    () => ipcRenderer.invoke("window:close"),
  getVersion: () => ipcRenderer.invoke("app:version"),
  getZoom: () => ipcRenderer.invoke("app:getZoom"),
  setZoom: (factor: number) => ipcRenderer.invoke("app:setZoom", factor),
  dbPing: () => ipcRenderer.invoke("db:ping"),
});

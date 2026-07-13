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
  getVersion: () => ipcRenderer.invoke("app:version"),
});

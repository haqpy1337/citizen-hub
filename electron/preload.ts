import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  auth: {
    register: (username: string, password: string) =>
      ipcRenderer.invoke("auth:register", username, password),
    login: (username: string, password: string) =>
      ipcRenderer.invoke("auth:login", username, password),
    logout: (token: string) => ipcRenderer.invoke("auth:logout", token),
    me: (token: string) => ipcRenderer.invoke("auth:me", token),
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
  onUpdateAvailable: (cb: () => void) =>
    ipcRenderer.on("update-available", cb),
  onUpdateDownloaded: (cb: () => void) =>
    ipcRenderer.on("update-downloaded", cb),
  installUpdate: () => ipcRenderer.invoke("install-update"),
});

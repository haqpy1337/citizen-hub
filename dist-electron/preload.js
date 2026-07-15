"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("api", {
    auth: {
        getOrCreateLocal: () => electron_1.ipcRenderer.invoke("auth:getOrCreateLocal"),
    },
    jobs: {
        list: (token) => electron_1.ipcRenderer.invoke("jobs:list", token),
        create: (token, data) => electron_1.ipcRenderer.invoke("jobs:create", token, data),
        update: (token, id, data) => electron_1.ipcRenderer.invoke("jobs:update", token, id, data),
        delete: (token, id) => electron_1.ipcRenderer.invoke("jobs:delete", token, id),
    },
    onUpdateAvailable: (cb) => electron_1.ipcRenderer.on("update-available", (_e, version) => cb(version)),
    onUpdateDownloaded: (cb) => electron_1.ipcRenderer.on("update-downloaded", (_e, version) => cb(version)),
    onUpdateError: (cb) => electron_1.ipcRenderer.on("update-error", (_e, msg) => cb(msg)),
    onUpdateNotAvailable: (cb) => electron_1.ipcRenderer.on("update-not-available", cb),
    installUpdate: () => electron_1.ipcRenderer.invoke("install-update"),
    checkForUpdates: () => electron_1.ipcRenderer.invoke("update:check"),
    fetchNews: () => electron_1.ipcRenderer.invoke("news:fetch"),
    fetchPatchNotes: () => electron_1.ipcRenderer.invoke("patchnotes:fetch"),
    fetchTwisk: () => electron_1.ipcRenderer.invoke("twisk:fetch"),
    isFirstRunAfterUpdate: () => electron_1.ipcRenderer.invoke("app:isFirstRunAfterUpdate"),
    setTitlebarColors: (color, symbolColor) => electron_1.ipcRenderer.invoke("titlebar:setColors", color, symbolColor),
    expandWindow: () => electron_1.ipcRenderer.invoke("window:expand"),
    getVersion: () => electron_1.ipcRenderer.invoke("app:version"),
    getZoom: () => electron_1.ipcRenderer.invoke("app:getZoom"),
    setZoom: (factor) => electron_1.ipcRenderer.invoke("app:setZoom", factor),
    dbPing: () => electron_1.ipcRenderer.invoke("db:ping"),
});

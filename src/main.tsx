import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Restore theme before first paint to avoid flash
const savedTheme = localStorage.getItem("ch-theme");
if (savedTheme) document.documentElement.classList.add(`theme-${savedTheme}`);

// UI scale is restored via webContents.setZoomFactor() in main process (settings.json)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

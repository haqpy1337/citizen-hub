import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Restore design before first paint to avoid flash
const savedDesign = localStorage.getItem("hma-design");
if (savedDesign && savedDesign !== "mole") document.documentElement.classList.add(`theme-${savedDesign}`);

// UI scale is restored via webContents.setZoomFactor() in main process (settings.json)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Restore theme before first paint to avoid flash
const savedTheme = localStorage.getItem("ch-theme");
if (savedTheme) document.documentElement.classList.add(`theme-${savedTheme}`);

// Restore UI scale
const savedScale = localStorage.getItem("ch-ui-scale");
if (savedScale) {
  const s = parseFloat(savedScale);
  if (!isNaN(s)) (document.documentElement as HTMLElement).style.zoom = String(s);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

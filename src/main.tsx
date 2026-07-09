import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorMonitoring } from "./lib/error-monitor";
import { registerPWA } from "./pwa/register";

// Initialize error monitoring before rendering
initErrorMonitoring();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA service worker with continuous update polling (prod only)
registerPWA();


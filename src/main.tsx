import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

import { initErrorMonitoring } from "./lib/error-monitor";
import { registerPWA } from "./pwa/register";

import "./services";
import "./plugins";

import ErrorBoundary from "./components/errors/ErrorBoundary";


// Initialize monitoring before React starts
initErrorMonitoring();


const root =
document.getElementById("root");


if (!root) {
  throw new Error(
    "Root element not found"
  );
}


createRoot(root).render(

<React.StrictMode>

<ErrorBoundary>

<App />

</ErrorBoundary>

</React.StrictMode>

);


// Register service worker
registerPWA();

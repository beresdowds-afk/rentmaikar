import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// vite-plugin-pwa intentionally removed: the app-shell service worker was
// serving stale landing-page HTML. public/sw.js is now a kill-switch worker
// that evicts the old registration on first visit. push-sw.js (web push) is
// unrelated and kept as-is.
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Never let a proxy/CDN or browser hold onto the app shell — stale HTML was
    // serving an outdated landing page in preview.
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

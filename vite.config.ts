import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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

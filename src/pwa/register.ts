// src/pwa/register.ts
//
// Registers the cleanup service worker in production only.
// The cleanup worker removes obsolete caches left behind by previous
// Workbox/PWA deployments, then unregisters itself.
//
// It NEVER forces a page reload. Instead it notifies React when cleanup
// finishes so the application can decide whether and when to refresh.

const CLEANUP_SW = "/sw.js";

export async function registerPWA(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    console.info("[PWA] Development mode - service worker disabled.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(CLEANUP_SW, {
      updateViaCache: "none",
    });

    console.info("[PWA] Cleanup service worker registered.");

    registration.addEventListener("updatefound", () => {
      console.info("[PWA] Cleanup worker update detected.");
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (!event.data) return;

      switch (event.data.type) {
        case "CACHE_CLEANUP_COMPLETE":
          console.info("[PWA] Cache cleanup complete.");
          break;

        case "CACHE_CLEANUP_FAILED":
          console.error("[PWA] Cache cleanup failed.", event.data.error);
          break;

        default:
          break;
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.info("[PWA] Service worker controller changed.");
    });

  } catch (err) {
    console.error("[PWA] Registration failed.", err);
  }
}

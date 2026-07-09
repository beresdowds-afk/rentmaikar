// Guarded service-worker registration with continuous update polling.
// Uses vite-plugin-pwa's virtual module. Safe no-op in dev / Lovable preview.

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" || host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => r.active?.scriptURL.endsWith("/sw.js"))
        .map((r) => r.unregister())
    );
  } catch {
    /* ignore */
  }
}

export async function registerPWA(): Promise<void> {
  if (isRefusedContext()) {
    await unregisterAppSW();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    // vite-plugin-pwa virtual module
    const { registerSW } = await import("virtual:pwa-register");

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // autoUpdate mode: force apply immediately so every PWA stays current
        updateSW(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        // Continuous update poll — every hour + on tab focus + on network reconnect
        const check = () => {
          registration.update().catch(() => { /* ignore transient errors */ });
        };
        setInterval(check, UPDATE_INTERVAL_MS);
        window.addEventListener("focus", check);
        window.addEventListener("online", check);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      },
      onRegisterError(err) {
        console.warn("PWA SW registration failed:", err);
      },
    });
  } catch (err) {
    console.warn("PWA registration skipped:", err);
  }
}

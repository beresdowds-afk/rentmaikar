// App-shell PWA disabled. A kill-switch service worker at /sw.js evicts any
// previously installed Workbox registration for returning visitors. The
// separate push-sw.js (web-push messaging) is untouched.

export async function registerPWA(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    // Register the same /sw.js path browsers already have cached. The new
    // worker's activate handler wipes its own Workbox caches and then calls
    // self.registration.unregister(), so it self-destructs after one cycle.
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* ignore — nothing to clean up */
  }
}

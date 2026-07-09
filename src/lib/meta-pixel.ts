// Meta Pixel helper — no-ops until VITE_META_PIXEL_ID is set and the
// user has granted messaging/cookie consent. Consent flag matches the
// existing `rentmaikar_message_consent` localStorage key used elsewhere.

const PIXEL_ID = (import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined;
const CONSENT_KEYS = ["rentmaikar_message_consent", "rentmaikar_cookie_consent"];

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return CONSENT_KEYS.some((k) => {
      const v = window.localStorage.getItem(k);
      return v === "accepted" || v === "true" || v === "1";
    });
  } catch {
    return false;
  }
}

let loaded = false;
function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  if (!PIXEL_ID || !hasConsent()) return;
  // Standard Meta Pixel bootstrap
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq?.("init", PIXEL_ID);
  loaded = true;
}

export function trackPageView(): void {
  ensureLoaded();
  if (!loaded || !window.fbq) return;
  window.fbq("track", "PageView");
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  ensureLoaded();
  if (!loaded || !window.fbq) return;
  window.fbq("track", name, params);
}

export const isMetaPixelConfigured = () => Boolean(PIXEL_ID);

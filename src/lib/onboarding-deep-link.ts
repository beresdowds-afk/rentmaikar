// Deep-link helpers that work for both web (react-router) and native
// Capacitor shells (iOS/Android). Native deep links arrive via the Capacitor
// `App.appUrlOpen` event; we translate them into an in-app react-router push
// by dispatching a same-origin history event.

export const ONBOARDING_DEEP_LINK_SCHEME = 'rentmaikar://onboarding';

function inCapacitor(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error – Capacitor injects a global at runtime.
    !!(window.Capacitor?.isNativePlatform?.() ?? false)
  );
}

/** Convert a deep-link URL (e.g. `rentmaikar://onboarding?step=documents`)
 *  into an in-app pathname a react-router listener can handle. */
export function deepLinkToPath(url: string): string {
  try {
    // URL parses `rentmaikar://onboarding?step=x` — host = "onboarding".
    const u = new URL(url);
    const host = u.host || u.pathname.replace(/^\/+/, '').split('/')[0];
    if (host === 'onboarding') {
      const search = u.search || '';
      return `/onboarding-redirect${search}`;
    }
    // Fallback: treat as normal path.
    return u.pathname + u.search;
  } catch {
    return '/';
  }
}

/** Register a global capacitor `appUrlOpen` listener that routes native
 *  deep links to the correct react-router path. Returns a cleanup fn. */
export async function installOnboardingDeepLinkListener(
  navigate: (path: string) => void,
): Promise<() => void> {
  if (!inCapacitor()) return () => {};
  try {
    // @ts-expect-error – optional native peer, resolved at runtime only.
    const mod = await import(/* @vite-ignore */ '@capacitor/app');
    const App = (mod as { App?: { addListener?: Function } }).App;
    if (!App?.addListener) return () => {};
    const handle = await App.addListener(
      'appUrlOpen',
      (evt: { url: string }) => {
        const path = deepLinkToPath(evt.url);
        navigate(path);
      },
    );
    return () => handle?.remove?.();
  } catch {
    return () => {};
  }
}

/** Build a shareable deep link that opens the onboarding step in the mobile
 *  app if installed, otherwise the same path on the web. */
export function buildOnboardingDeepLink(
  role: 'driver' | 'owner' | null,
  step: 'documents' | 'verification' | 'email' | 'root',
): { web: string; native: string } {
  const base = role === 'owner' ? '/owner/onboarding' : '/driver/onboarding';
  const web = step === 'email'
    ? '/verify-email'
    : step === 'root'
      ? base
      : `${base}?step=${step}`;
  const native = step === 'email'
    ? `${ONBOARDING_DEEP_LINK_SCHEME}?step=email`
    : `${ONBOARDING_DEEP_LINK_SCHEME}?step=${step}&role=${role ?? 'driver'}`;
  return { web, native };
}

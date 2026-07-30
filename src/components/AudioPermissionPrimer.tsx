import { useEffect, useRef } from "react";
import { ensureMediaPermissions } from "@/lib/media-permissions";
import { isAutomationMode } from "@/lib/test-mode";

/**
 * Requests microphone/speaker access on the first user gesture so training
 * playback and in-app calls work without extra clicks.
 *
 * Behavior: silently probes on mount, then re-attempts on each user gesture
 * until permission is granted. Once granted we stop listening. If the user
 * denies, we back off silently — feature-specific screens (training, calls)
 * will prompt again via ensureMediaPermissions when the user opts in.
 *
 * Skipped entirely in automated/headless sessions: `getUserMedia` never
 * settles there and the retry-on-gesture listeners keep the main thread busy,
 * which stalls `page.waitForLoadState` and screenshots in Playwright runs.
 */
export default function AudioPermissionPrimer() {
  const grantedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAutomationMode()) return;


    const tryGrant = async (silent: boolean) => {
      if (grantedRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const ok = await ensureMediaPermissions({ silent });
        if (ok) {
          grantedRef.current = true;
          cleanup();
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    const onGesture = () => {
      void tryGrant(false);
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
    };

    void tryGrant(true);
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchstart", onGesture);

    return cleanup;
  }, []);

  return null;
}

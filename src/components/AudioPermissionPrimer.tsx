import { useEffect, useRef } from "react";

/**
 * Requests microphone/audio access on the first user gesture so drivers can
 * play training audio and every user can join VoIP calls without extra clicks.
 * - Runs a single time per session (or until granted).
 * - Silent on failure: user can retry from a call/training screen.
 */
export default function AudioPermissionPrimer() {
  const askedRef = useRef(false);

  useEffect(() => {
    const KEY = "rentmaikar_audio_primed";
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY) === "1") return;

    const request = async () => {
      if (askedRef.current) return;
      askedRef.current = true;
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        sessionStorage.setItem(KEY, "1");
      } catch {
        // Deny or unsupported — leave for feature-specific prompts.
      } finally {
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", request);
      window.removeEventListener("keydown", request);
      window.removeEventListener("touchstart", request);
    };

    window.addEventListener("pointerdown", request, { once: true });
    window.addEventListener("keydown", request, { once: true });
    window.addEventListener("touchstart", request, { once: true });

    return cleanup;
  }, []);

  return null;
}

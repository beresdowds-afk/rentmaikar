/**
 * Request microphone (and implicitly speaker) access on demand.
 * Used by training playback and in-app calls so audio features work reliably.
 *
 * Safe to call repeatedly: quickly returns when permission is already granted
 * without re-prompting; only prompts the user when browser state is 'prompt'
 * or unknown.
 */
export async function ensureMediaPermissions(options?: { silent?: boolean }): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;

  // Fast path: check Permissions API when available.
  try {
    const perms = (navigator as unknown as { permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> } }).permissions;
    if (perms?.query) {
      const status = await perms.query({ name: "microphone" as PermissionName });
      if (status.state === "granted") return true;
      if (status.state === "denied" && options?.silent) return false;
    }
  } catch {
    // Not all browsers implement Permissions API for microphone — fall through.
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    // Nudge the audio output pipeline so speakers are unlocked for playback.
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        if (ctx.state === "suspended") await ctx.resume();
        await ctx.close();
      }
    } catch {
      // ignore — playback will still prompt on real use.
    }
    return true;
  } catch {
    return false;
  }
}

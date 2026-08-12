/// <reference lib="webworker" />
/**
 * Live-sync scheduler worker.
 *
 * Browsers aggressively throttle `setInterval` on background tabs and on
 * installed PWAs that are not in the foreground, which is exactly when a
 * suspended app drifts out of sync. A dedicated worker keeps its own timers
 * running on a separate thread, so the main thread receives reliable ticks it
 * can turn into cache refreshes and app-update checks.
 *
 * This is NOT a service worker: it never intercepts fetches and never caches
 * anything, so it does not interfere with the kill-switch `public/sw.js`.
 */

export type LiveSyncTick =
  | { type: "heartbeat"; at: number }
  | { type: "version-check"; at: number };

export type LiveSyncCommand =
  | { type: "start"; heartbeatMs?: number; versionCheckMs?: number }
  | { type: "stop" };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let versionTimer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (versionTimer) clearInterval(versionTimer);
  heartbeatTimer = null;
  versionTimer = null;
}

function start(heartbeatMs: number, versionCheckMs: number) {
  stop();
  heartbeatTimer = setInterval(() => {
    ctx.postMessage({ type: "heartbeat", at: Date.now() } satisfies LiveSyncTick);
  }, heartbeatMs);
  versionTimer = setInterval(() => {
    ctx.postMessage({ type: "version-check", at: Date.now() } satisfies LiveSyncTick);
  }, versionCheckMs);
}

ctx.onmessage = (event: MessageEvent<LiveSyncCommand>) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "start") {
    start(data.heartbeatMs ?? 60_000, data.versionCheckMs ?? 5 * 60_000);
  } else if (data.type === "stop") {
    stop();
  }
};

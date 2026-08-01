import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRegion } from "@/contexts/RegionContext";
import { useRealtimeSound, shouldChime } from "@/hooks/useRealtimeSound";

/**
 * Global realtime sync worker. Subscribes to a curated set of tables and
 * invalidates matching react-query caches whenever a row changes so that PWA
 * installs and native mobile builds mirror the live website state.
 *
 * Realtime alone is not enough for installed apps: a PWA can be suspended for
 * hours, miss every websocket frame, and resume with stale data. The worker
 * therefore layers three recovery paths on top of the subscription:
 *   1. websocket postgres_changes  → instant invalidation while connected
 *   2. visibility/focus/online     → full refetch when the app is resumed
 *   3. periodic heartbeat          → refetch when realtime is silently down
 *
 * Only tables that were added to `supabase_realtime` in the accompanying
 * migration will emit events. Silent no-op otherwise.
 */
/** `alert: true` marks a table whose changes are worth an audible cue. */
const TABLES: Array<{ table: string; keys: string[]; alert?: boolean }> = [
  { table: "driver_proxy_billing_accounts", keys: ["proxy-billing", "proxy-accounts"] },
  { table: "proxy_billing_audit_log", keys: ["proxy-audit"] },
  { table: "push_devices", keys: ["push-devices"] },
  { table: "inbox_messages", keys: ["inbox", "inbox-messages"], alert: true },
  { table: "inbox_conversations", keys: ["inbox", "inbox-conversations"] },
  { table: "unified_message_log", keys: ["unified-messages"] },
  { table: "invoices", keys: ["invoices", "billing"], alert: true },
  { table: "receipts", keys: ["receipts", "billing"] },
  { table: "payments", keys: ["payments", "billing"], alert: true },
  { table: "rentals", keys: ["rentals"] },
  { table: "legal_agreements", keys: ["legal-agreements", "agreements"] },
  { table: "vehicle_incidents", keys: ["vehicle-incidents", "incidents"], alert: true },
  { table: "region_definitions", keys: ["allowed-regions", "regions"] },
  { table: "contact_settings", keys: ["contact-settings", "regions"] },
  { table: "platform_company_info", keys: ["company-info", "regions"] },
  { table: "profiles", keys: ["profile", "my-region"] },
];

/** Broadcast channel name used to fan a refresh out to every open tab/window. */
const SYNC_BROADCAST = "rentmaikar-live-sync";

/** How often to force a refetch when realtime frames are not arriving. */
const HEARTBEAT_MS = 60_000;

export function useRealtimeSync(enabled: boolean = true) {
  const qc = useQueryClient();
  const { country } = useRegion();
  const { play } = useRealtimeSound();

  useEffect(() => {
    if (!enabled) return;

    let lastEventAt = Date.now();

    const invalidate = (keys: string[]) => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    };

    // Full refetches are expensive and visibly re-render the whole tree, so a
    // rapid burst of focus/visibility/online events must not stack up.
    let lastFullRefreshAt = 0;
    const MIN_FULL_REFRESH_GAP_MS = 15_000;

    const refreshAll = () => {
      const now = Date.now();
      if (now - lastFullRefreshAt < MIN_FULL_REFRESH_GAP_MS) return;
      lastFullRefreshAt = now;
      lastEventAt = now;
      qc.invalidateQueries();
    };


    // 1. Realtime subscription
    const channel = supabase.channel("global-sync");
    for (const { table, keys, alert } of TABLES) {
      channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table },
        () => {
          lastEventAt = Date.now();
          invalidate(keys);
          // Audible cue only for meaningful tables, and only when the user
          // opted in for the active region (see sound-settings defaults).
          if (alert && shouldChime(country)) play();
        },
      );
    }
    channel.subscribe();


    // 2. Resume paths — an installed PWA regains focus / connectivity.
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshAll();
    };
    const onOnline = () => refreshAll();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onOnline);

    // 3. Cross-window fan-out so multiple installs/tabs stay in step.
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(SYNC_BROADCAST);
      bc.onmessage = (event) => {
        if (event.data?.type === "refresh") qc.invalidateQueries();
      };
    }

    // 4. Heartbeat — catches a silently dead websocket.
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastEventAt < HEARTBEAT_MS) return;
      refreshAll();
    }, HEARTBEAT_MS);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(heartbeat);
      bc?.close();
      bc = null;
    };
  }, [enabled, qc, country, play]);
}

/** Ask every other open window/tab (and installed PWA instance) to refresh. */
export function broadcastLiveSync() {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const bc = new BroadcastChannel(SYNC_BROADCAST);
    bc.postMessage({ type: "refresh", at: Date.now() });
    bc.close();
  } catch {
    /* unsupported */
  }
}

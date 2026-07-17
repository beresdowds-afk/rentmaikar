import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Global realtime sync worker. Subscribes to a curated set of tables and
 * invalidates matching react-query caches whenever a row changes so that PWA
 * installs and native mobile builds mirror the live website state.
 *
 * Only tables that were added to `supabase_realtime` in the accompanying
 * migration will emit events. Silent no-op otherwise.
 */
const TABLES: Array<{ table: string; keys: string[] }> = [
  { table: "driver_proxy_billing_accounts", keys: ["proxy-billing", "proxy-accounts"] },
  { table: "proxy_billing_audit_log", keys: ["proxy-audit"] },
  { table: "push_devices", keys: ["push-devices"] },
  { table: "inbox_messages", keys: ["inbox", "inbox-messages"] },
  { table: "inbox_conversations", keys: ["inbox", "inbox-conversations"] },
  { table: "unified_message_log", keys: ["unified-messages"] },
  { table: "invoices", keys: ["invoices", "billing"] },
  { table: "receipts", keys: ["receipts", "billing"] },
  { table: "payments", keys: ["payments", "billing"] },
  { table: "rentals", keys: ["rentals"] },
  { table: "legal_agreements", keys: ["legal-agreements", "agreements"] },
  { table: "vehicle_incidents", keys: ["vehicle-incidents", "incidents"] },
];

export function useRealtimeSync(enabled: boolean = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel("global-sync");
    for (const { table, keys } of TABLES) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => { keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
      );
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, qc]);
}

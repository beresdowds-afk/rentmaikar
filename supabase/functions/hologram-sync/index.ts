import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hologram } from "../_shared/hologram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron-only endpoint
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!(cronSecret && provided === cronSecret) && bearer !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!hologram.isConfigured()) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "hologram_not_configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: sims } = await supabase
    .from("iot_sim_cards")
    .select("id, provider_sim_id")
    .eq("provider", "hologram")
    .not("provider_sim_id", "is", null)
    .limit(200);

  let updated = 0;
  for (const sim of sims || []) {
    const info = await hologram.getSim(sim.provider_sim_id as string);
    if (!info.ok) continue;
    const usage = await hologram.getSimUsage(sim.provider_sim_id as string);
    const state = (info.body?.data?.state as string) || null;
    const dataMb = usage.ok ? Number(usage.body?.data?.usage_mb || 0) : null;
    await supabase.from("iot_sim_cards").update({
      status: state || undefined,
      data_usage_mb: dataMb ?? undefined,
      last_session_at: new Date().toISOString(),
    }).eq("id", sim.id);
    updated++;
  }

  return new Response(JSON.stringify({ ok: true, updated }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

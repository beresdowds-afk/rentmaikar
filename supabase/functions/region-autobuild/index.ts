import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BuildRequest {
  country_name: string;
  country_code: string;
  currency: string;
  currency_symbol: string;
  phone_prefix: string;
  timezone?: string;
  primary_language?: string;
  sms_provider?: string;
  voice_provider?: string;
  whatsapp_provider?: string;
  payment_gateway?: string;
  support_hours?: string;
  whatsapp_number?: string;
  sms_number?: string;
  flag_emoji?: string;
  cultural_tone?: string;
}

const CONTENT_KEYS = ["hero", "category", "how_it_works", "features", "cta", "testimonials"] as const;

const prompt = (spec: BuildRequest, key: string) => {
  const base = `You are localizing a rideshare vehicle rental platform ("Rentmaikar") for a new region.
Region: ${spec.country_name} (${spec.country_code})
Currency: ${spec.currency} (${spec.currency_symbol})
Payment gateway: ${spec.payment_gateway ?? "paypal"}
Cultural tone: ${spec.cultural_tone ?? "trustworthy, community-oriented"}
Language: ${spec.primary_language ?? "en"}
Return STRICT JSON, no prose, no markdown fences.`;
  const schemas: Record<string, string> = {
    hero: `{"badge":"","headline":"","highlightedWord":"","description":"","primaryCta":"","secondaryCta":"","whatsappCta":"","smsCta":""}`,
    category: `{"sectionBadge":"","sectionTitle":"","sectionDescription":"","budget":{"title":"","description":"","priceLabel":"","minPriceLabel":""},"standard":{"title":"","description":"","priceLabel":"","minPriceLabel":""},"premium":{"title":"","description":"","priceLabel":"","minPriceLabel":""},"viewCta":""}`,
    how_it_works: `{"sectionBadge":"","sectionTitle":"","sectionDescription":"","steps":[{"title":"","description":""},{"title":"","description":""},{"title":"","description":""},{"title":"","description":""}]}`,
    features: `{"sectionBadge":"","sectionTitle":"","sectionDescription":"","features":[{"title":"","description":""},{"title":"","description":""},{"title":"","description":""},{"title":"","description":""},{"title":"","description":""},{"title":"","description":""}]}`,
    cta: `{"driver":{"title":"","description":"","cta":""},"owner":{"title":"","description":"","cta":""}}`,
    testimonials: `{"sectionTitle":"","testimonials":[{"name":"","location":"","platform":"","quote":"","earning":""},{"name":"","location":"","platform":"","quote":""},{"name":"","location":"","platform":"","quote":""}]}`,
  };
  return `${base}\nGenerate content for "${key}" matching this exact JSON schema (fill values, keep keys):\n${schemas[key]}\nUse realistic local names, cities, and rideshare platforms popular in ${spec.country_name}. Format prices with ${spec.currency_symbol}.`;
};

async function generateContent(spec: BuildRequest, key: string, apiKey: string): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You output STRICT JSON only. No markdown fences." },
        { role: "user", content: prompt(spec, key) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI ${key} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  let text: string = data?.choices?.[0]?.message?.content ?? "";
  text = text.trim().replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const spec: BuildRequest = await req.json();
    if (!spec.country_name || !spec.country_code || !spec.currency || !spec.currency_symbol || !spec.phone_prefix) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert region definition
    const { data: region, error: upsertErr } = await admin
      .from("region_definitions")
      .upsert({
        country_name: spec.country_name,
        country_code: spec.country_code.toUpperCase(),
        currency: spec.currency.toUpperCase(),
        currency_symbol: spec.currency_symbol,
        phone_prefix: spec.phone_prefix,
        timezone: spec.timezone,
        primary_language: spec.primary_language ?? "en",
        sms_provider: spec.sms_provider ?? "twilio",
        voice_provider: spec.voice_provider ?? "twilio",
        whatsapp_provider: spec.whatsapp_provider ?? "twilio",
        payment_gateway: spec.payment_gateway ?? "paypal",
        support_hours: spec.support_hours,
        whatsapp_number: spec.whatsapp_number,
        sms_number: spec.sms_number,
        flag_emoji: spec.flag_emoji,
        cultural_tone: spec.cultural_tone,
        status: "building",
        build_error: null,
        created_by: userData.user.id,
      }, { onConflict: "country_code" })
      .select()
      .single();
    if (upsertErr || !region) throw new Error(upsertErr?.message ?? "upsert failed");

    const log: any[] = [];
    try {
      for (const key of CONTENT_KEYS) {
        const started = Date.now();
        const content = await generateContent(spec, key, lovableKey);
        await admin.from("region_localized_content").upsert({
          region_id: region.id,
          content_key: key,
          content,
          generated_by: "ai:gemini-2.5-flash",
        }, { onConflict: "region_id,content_key" });
        log.push({ key, ms: Date.now() - started, ok: true });
      }
      await admin.from("region_definitions").update({ status: "ready", build_log: log }).eq("id", region.id);
    } catch (genErr: any) {
      log.push({ error: genErr.message });
      await admin.from("region_definitions").update({ status: "failed", build_error: genErr.message, build_log: log }).eq("id", region.id);
      throw genErr;
    }

    return new Response(JSON.stringify({ success: true, region_id: region.id, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

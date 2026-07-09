import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  subject_type: z.enum(["self", "referee"]),
  subject_ref: z.string().max(200).optional(),
  region: z.enum(["USA", "Nigeria", "US", "NG"]).optional(),
  fields: z.object({
    name_first: z.string().max(80).optional(),
    name_last: z.string().max(80).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    id_number: z.string().max(64).optional(),
    id_type: z.string().max(40).optional(),
    birthdate: z.string().max(20).optional(),
  }).partial().optional(),
});

const templateForRegion = (r?: string) => {
  const rr = (r ?? "").toUpperCase();
  if (rr.startsWith("NG") || rr === "NIGERIA") return Deno.env.get("PERSONA_TEMPLATE_ID_NG");
  return Deno.env.get("PERSONA_TEMPLATE_ID_US") ?? Deno.env.get("PERSONA_TEMPLATE_ID");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("PERSONA_API_KEY");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const templateId = templateForRegion(parsed.data.region);

    if (!apiKey || !templateId) {
      // Provider not yet configured — record the intent so the UI can queue it.
      const { data, error } = await supa.from("persona_inquiries").insert({
        user_id: userData.user.id,
        subject_type: parsed.data.subject_type,
        subject_ref: parsed.data.subject_ref ?? null,
        region: parsed.data.region ?? null,
        status: "created",
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ inquiry: data, provider_configured: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://withpersona.com/api/v1/inquiries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Persona-Version": "2023-01-05",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "inquiry-template-id": templateId,
            "reference-id": `${parsed.data.subject_type}:${parsed.data.subject_ref ?? userData.user.id}`,
            fields: {
              "name-first": parsed.data.fields?.name_first,
              "name-last": parsed.data.fields?.name_last,
              "email-address": parsed.data.fields?.email,
              "phone-number": parsed.data.fields?.phone,
              "identification-number": parsed.data.fields?.id_number,
              "birthdate": parsed.data.fields?.birthdate,
            },
          },
        },
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Persona error", detail: body }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const inquiryId = body?.data?.id;
    const { data: row, error } = await supa.from("persona_inquiries").insert({
      user_id: userData.user.id,
      subject_type: parsed.data.subject_type,
      subject_ref: parsed.data.subject_ref ?? null,
      region: parsed.data.region ?? null,
      inquiry_id: inquiryId,
      template_id: templateId,
      status: "pending",
      raw_payload: body,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({
      inquiry: row,
      hosted_url: `https://withpersona.com/verify?inquiry-id=${inquiryId}`,
      provider_configured: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

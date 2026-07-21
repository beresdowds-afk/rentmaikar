import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  personaRoleAttributes,
  templateForRole,
  userRoleTagForRole,
  type PersonaSubjectRole,
} from "../_shared/persona-templates.ts";

const Body = z.object({
  subject_type: z.enum(["self", "referee", "proxy"]),
  subject_role: z.enum(["driver", "referee", "owner", "support_staff", "admin_assistant", "proxy"]).optional(),
  subject_ref: z.string().max(200).optional(),
  region: z.string().max(40).optional(),
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

const PERSONA_BASE = "https://withpersona.com/api/v1";
const PERSONA_VERSION = "2023-01-05";

function normalizeCountry(r?: string): string {
  const rr = (r ?? "").toUpperCase().trim();
  if (rr.startsWith("NG") || rr === "NIGERIA") return "NG";
  if (rr.startsWith("US") || rr === "USA" || rr === "UNITED STATES") return "US";
  return rr || "US";
}

async function resolveTemplate(
  supa: any,
  country: string,
  subjectRole?: PersonaSubjectRole,
): Promise<{ template_id: string | null; env_id: string | null }> {
  // 1. Universal per-role template (highest priority, region-agnostic)
  const roleTpl = templateForRole(subjectRole ?? null);
  const envId = Deno.env.get("PERSONA_ENVIRONMENT_ID") ?? null;
  if (roleTpl) return { template_id: roleTpl, env_id: envId };

  // 2. DB region template
  const { data } = await supa
    .from("persona_region_templates")
    .select("inquiry_template_id, environment_id, is_active")
    .eq("country_code", country)
    .eq("is_active", true)
    .maybeSingle();
  if (data?.inquiry_template_id) {
    return { template_id: data.inquiry_template_id, env_id: data.environment_id ?? envId };
  }
  // 3. Env fallbacks
  const envKey = country === "NG" ? "PERSONA_TEMPLATE_ID_NG" : "PERSONA_TEMPLATE_ID_US";
  return {
    template_id: Deno.env.get(envKey)
      ?? Deno.env.get("PERSONA_TEMPLATE_ID")
      ?? Deno.env.get("PERSONA_MASTER_TEMPLATE_ID")
      ?? null,
    env_id: envId,
  };
}

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
    const country = normalizeCountry(parsed.data.region);
    const { template_id, env_id } = await resolveTemplate(supa, country, parsed.data.subject_role);

    if (!apiKey || !template_id) {
      const { data, error } = await supa.from("persona_inquiries").insert({
        user_id: userData.user.id,
        subject_type: parsed.data.subject_type,
        subject_ref: parsed.data.subject_ref ?? null,
        region: country,
        status: "created",
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ inquiry: data, provider_configured: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleAttrs = personaRoleAttributes(parsed.data.subject_role);
    const userRoleTag = userRoleTagForRole(parsed.data.subject_role);

    // Create inquiry
    const res = await fetch(`${PERSONA_BASE}/inquiries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Persona-Version": PERSONA_VERSION,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "inquiry-template-id": template_id,
            "reference-id": `${userRoleTag ?? parsed.data.subject_type}:${parsed.data.subject_ref ?? userData.user.id}`,
            tags: roleAttrs.tags,
            fields: {
              ...roleAttrs.fields,
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
    const inquiryId = body?.data?.id as string;

    // Generate a session token for embedded resume
    let sessionToken: string | null = null;
    try {
      const st = await fetch(`${PERSONA_BASE}/inquiries/${inquiryId}/resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Persona-Version": PERSONA_VERSION,
        },
      });
      const stBody = await st.json();
      sessionToken = stBody?.meta?.["session-token"] ?? stBody?.data?.attributes?.["session-token"] ?? null;
    } catch (_e) { /* non-fatal */ }

    const { data: row, error } = await supa.from("persona_inquiries").insert({
      user_id: userData.user.id,
      subject_type: parsed.data.subject_type,
      subject_ref: parsed.data.subject_ref ?? null,
      region: country,
      inquiry_id: inquiryId,
      template_id: template_id,
      status: "pending",
      raw_payload: { user_role: userRoleTag, subject_role: parsed.data.subject_role ?? null, response: body },
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({
      inquiry: row,
      inquiry_id: inquiryId,
      session_token: sessionToken,
      template_id,
      environment_id: env_id,
      hosted_url: `https://withpersona.com/verify?inquiry-id=${inquiryId}${env_id ? `&environment-id=${env_id}` : ""}`,
      provider_configured: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

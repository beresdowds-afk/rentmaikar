import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const keySid = Deno.env.get("TWILIO_API_KEY_SID") ?? "";
  const keySecret = Deno.env.get("TWILIO_API_KEY_SECRET") ?? "";
  const phone = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
  const wa = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "";

  const result: Record<string, unknown> = {
    accountSidPrefix: sid.slice(0, 6),
    apiKeySidPrefix: keySid.slice(0, 4),
  };

  const accRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
    headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
  });
  const acc = await accRes.json().catch(() => ({}));
  result.authToken = accRes.ok
    ? { ok: true, friendlyName: acc.friendly_name, status: acc.status, type: acc.type }
    : { ok: false, status: accRes.status, error: acc.message };

  const keyRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PageSize=50`,
    { headers: { Authorization: `Basic ${btoa(`${keySid}:${keySecret}`)}` } },
  );
  const keyBody = await keyRes.json().catch(() => ({}));
  const owned: string[] = (keyBody.incoming_phone_numbers ?? []).map((n: any) => n.phone_number);
  result.apiKey = keyRes.ok
    ? { ok: true, ownedNumbers: owned }
    : { ok: false, status: keyRes.status, error: keyBody.message };
  result.senders = {
    smsConfigured: phone,
    smsOwned: owned.includes(phone),
    whatsappConfigured: wa,
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

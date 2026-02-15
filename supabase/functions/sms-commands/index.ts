import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════
// SMS Keyword Map
// ═══════════════════════════════════════════════════════════

const SMS_KEYWORDS = [
  "PAY", "PAYMENT", "STATUS", "BALANCE", "HELP", "STOP",
  "DOC", "DOCS", "LOCATION", "DONE", "1", "2", "3", "4", "HUMAN",
] as const;

// ═══════════════════════════════════════════════════════════
// SMS Message Templates (160-char SMS-friendly)
// ═══════════════════════════════════════════════════════════

const SMS_TEMPLATES = {
  welcome: (name: string) =>
    `Rentmaikar: Hi ${name}! Reply PAY, STATUS, BALANCE, DOC, HELP, or STOP. Visit rentmaikar.lovable.app`,

  unregistered: () =>
    `Rentmaikar: We don't recognize this number. Register at rentmaikar.lovable.app to get started.`,

  paymentDue: (amount: string, vehicle: string, link: string) =>
    `Rentmaikar: ${amount} due for ${vehicle}. Pay now: ${link} Reply BALANCE for details.`,

  noPaymentDue: () =>
    `Rentmaikar: No outstanding payments. You're all caught up! Reply STATUS for rental info.`,

  rentalStatus: (vehicle: string, rate: string, freq: string) =>
    `Rentmaikar: Active rental - ${vehicle} at ${rate}/${freq}. Reply PAY to pay or BALANCE for breakdown.`,

  noRental: () =>
    `Rentmaikar: No active rental found. Browse vehicles at rentmaikar.lovable.app/catalogue`,

  balance: (amount: string) =>
    `Rentmaikar: Outstanding balance: ${amount}. Reply PAY to settle now.`,

  balanceClear: () =>
    `Rentmaikar: No outstanding balance. You're current! Reply STATUS for rental info.`,

  help: () =>
    `Rentmaikar: Commands - PAY: Pay now, STATUS: Rental info, BALANCE: Check due, DOC: Upload docs, STOP: Opt out. Call +1-608-384-3932`,

  docStatus: (pending: number, missing: number) =>
    `Rentmaikar: Docs - ${missing} missing, ${pending} pending review. Upload at rentmaikar.lovable.app/driver/dashboard`,

  docsComplete: () =>
    `Rentmaikar: All documents verified! No action needed.`,

  optOutConfirm: () =>
    `Rentmaikar: You've been opted out of SMS notifications. Reply START to re-subscribe. This is your last message.`,

  optIn: () =>
    `Rentmaikar: Welcome back! You've been re-subscribed to SMS notifications. Reply HELP for commands.`,

  locationReceived: () =>
    `Rentmaikar: Location received and recorded. Thank you!`,

  supportConnecting: () =>
    `Rentmaikar: Connecting you to support. An agent will respond shortly. Hours: 8AM-10PM daily. Call +1-608-384-3932`,

  done: () =>
    `Rentmaikar: Noted! Thank you for confirming. Have a great day!`,

  fallback: () =>
    `Rentmaikar: Command not recognized. Reply HELP for available commands or STOP to opt out.`,
};

// ═══════════════════════════════════════════════════════════
// SMS Sender (region-aware with retry)
// ═══════════════════════════════════════════════════════════

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const sendSMS = async (
  to: string,
  message: string,
  supabase?: ReturnType<typeof createClient>,
): Promise<{ provider: string; externalId?: string }> => {
  const isNigeria = to.startsWith("+234");
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await sleep(Math.pow(2, attempt) * 1000);

      if (isNigeria) {
        // ─── Termii ───
        const termiiApiKey = Deno.env.get("TERMII_API_KEY");
        const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "Rentmaikar";
        if (!termiiApiKey) throw new Error("Termii SMS not configured");

        const res = await fetch("https://api.ng.termii.com/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: to.replace("+", ""),
            from: termiiSenderId,
            sms: message,
            type: "plain",
            channel: "generic",
            api_key: termiiApiKey,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.code !== "ok") throw new Error(data.message || "Termii SMS failed");

        console.log(`[SMS] Sent via Termii to ${to} [attempt ${attempt + 1}]`);
        return { provider: "termii", externalId: data.message_id };
      }

      // ─── Twilio ───
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER") || "+16083843932";
      if (!accountSid || !authToken) throw new Error("Twilio SMS not configured");

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append("From", twilioPhone);
      formData.append("To", to);
      formData.append("Body", message);

      // Add status callback for delivery tracking
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (supabaseUrl) {
        formData.append("StatusCallback", `${supabaseUrl}/functions/v1/voip-status-callback`);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Twilio SMS failed");

      console.log(`[SMS] Sent via Twilio to ${to} [attempt ${attempt + 1}]`);
      return { provider: "twilio", externalId: data.sid };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[SMS] Attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  // Escalate failed delivery
  if (supabase) {
    await supabase.from("inbox_conversations").insert({
      user_phone: to,
      channel: "sms",
      subject: `⚠️ Failed SMS delivery (${MAX_RETRIES} attempts)`,
      status: "open",
      priority: "urgent",
      region: isNigeria ? "NIGERIA" : "USA",
    }).catch(e => console.error("[SMS Escalation]", e));
  }

  throw lastError || new Error("SMS delivery failed");
};

// ═══════════════════════════════════════════════════════════
// Opt-out Management
// ═══════════════════════════════════════════════════════════

const handleOptOut = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  phone: string,
): Promise<string> => {
  // Update profile to disable SMS notifications
  await supabase.from("profiles").update({
    notification_sms: false,
  }).eq("user_id", userId);

  // Log opt-out for compliance
  console.log(`[SMS Opt-Out] user=${userId} phone=${phone}`);

  return SMS_TEMPLATES.optOutConfirm();
};

const handleOptIn = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> => {
  await supabase.from("profiles").update({
    notification_sms: true,
  }).eq("user_id", userId);

  return SMS_TEMPLATES.optIn();
};

// ═══════════════════════════════════════════════════════════
// Payment Link Generator
// ═══════════════════════════════════════════════════════════

const generatePaymentLink = (driverId: string, amount: number, currency: string): string => {
  const baseUrl = "https://rentmaikar.lovable.app";
  const params = new URLSearchParams({
    driver: driverId, amount: amount.toString(), currency, ts: Date.now().toString(),
  });
  return `${baseUrl}/payment?${params.toString()}`;
};

// ═══════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { from, text, channel } = await req.json();
    const rawBody = (text || "").trim();
    const command = rawBody.toUpperCase();
    const region = from?.startsWith("+234") ? "NIGERIA" : "USA";

    console.log(`[SMS Command] From: ${from}, Body: ${command}, Region: ${region}`);

    // ─── Opt-in (START) before profile check ───
    if (command === "START") {
      const { data: profile } = await supabase
        .from("profiles").select("user_id").eq("phone", from).single();
      if (profile) {
        const msg = await handleOptIn(supabase, profile.user_id);
        await sendSMS(from, msg, supabase);
      }
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ─── Find user ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, notification_sms")
      .eq("phone", from)
      .single();

    if (!profile) {
      await sendSMS(from, SMS_TEMPLATES.unregistered(), supabase);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const firstName = profile.full_name?.split(" ")[0] || "there";
    const currSymbol = region === "NIGERIA" ? "₦" : "$";

    // ─── Check opt-out status (except for STOP/START/HELP) ───
    if (profile.notification_sms === false && !["STOP", "START", "HELP"].includes(command)) {
      // User has opted out, don't send automated responses
      console.log(`[SMS] User ${profile.user_id} opted out, skipping response`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ─── Process keyword ───
    let responseMessage = "";

    switch (command) {
      case "PAY":
      case "PAYMENT": {
        const { data: defaultPayment } = await supabase
          .from("payment_defaults")
          .select("amount_due, currency, rental_id")
          .eq("driver_id", profile.user_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (defaultPayment) {
          const curr = defaultPayment.currency === "NGN" ? "₦" : "$";
          const amount = `${curr}${Number(defaultPayment.amount_due).toLocaleString()}`;
          const link = generatePaymentLink(profile.user_id, Number(defaultPayment.amount_due), defaultPayment.currency);

          // Get vehicle name
          const { data: rental } = await supabase
            .from("rentals").select("vehicle_id").eq("id", defaultPayment.rental_id).single();
          let vehicleName = "your vehicle";
          if (rental?.vehicle_id) {
            const { data: v } = await supabase
              .from("vehicles").select("make, model").eq("id", rental.vehicle_id).single();
            if (v) vehicleName = `${v.make} ${v.model}`;
          }

          responseMessage = SMS_TEMPLATES.paymentDue(amount, vehicleName, link);
        } else {
          responseMessage = SMS_TEMPLATES.noPaymentDue();
        }
        break;
      }

      case "STATUS": {
        const { data: rental } = await supabase
          .from("rentals")
          .select("vehicle_id, daily_rate, currency, payment_frequency")
          .eq("driver_id", profile.user_id)
          .eq("status", "active")
          .limit(1)
          .single();

        if (rental) {
          const { data: v } = await supabase
            .from("vehicles").select("make, model, year").eq("id", rental.vehicle_id).single();
          const vehicleName = v ? `${v.year} ${v.make} ${v.model}` : "your vehicle";
          const curr = rental.currency === "NGN" ? "₦" : "$";
          const rate = `${curr}${rental.daily_rate}`;
          const freq = rental.payment_frequency === "weekly" ? "week" : "day";
          responseMessage = SMS_TEMPLATES.rentalStatus(vehicleName, rate, freq);
        } else {
          responseMessage = SMS_TEMPLATES.noRental();
        }
        break;
      }

      case "BALANCE": {
        const { data: defaults } = await supabase
          .from("payment_defaults")
          .select("amount_due, currency")
          .eq("driver_id", profile.user_id)
          .eq("status", "active");

        const totalDue = defaults?.reduce((sum, d) => sum + Number(d.amount_due), 0) || 0;
        if (totalDue > 0) {
          const currency = defaults?.[0]?.currency || "USD";
          const curr = currency === "NGN" ? "₦" : "$";
          responseMessage = SMS_TEMPLATES.balance(`${curr}${totalDue.toLocaleString()}`);
        } else {
          responseMessage = SMS_TEMPLATES.balanceClear();
        }
        break;
      }

      case "DOC":
      case "DOCS": {
        const { data: userDocs } = await supabase
          .from("user_documents")
          .select("document_type, status")
          .eq("user_id", profile.user_id);

        const pending = userDocs?.filter(d => d.status === "pending").length || 0;
        const uploadedTypes = new Set(userDocs?.map(d => d.document_type) || []);
        const requiredDocs = region === "NIGERIA"
          ? ["driver_license", "nin", "bvn", "police_clearance"]
          : ["driver_license", "id_card"];
        const missing = requiredDocs.filter(d => !uploadedTypes.has(d)).length;

        if (missing === 0 && pending === 0) {
          responseMessage = SMS_TEMPLATES.docsComplete();
        } else {
          responseMessage = SMS_TEMPLATES.docStatus(pending, missing);
        }
        break;
      }

      case "HELP": {
        responseMessage = SMS_TEMPLATES.help();
        break;
      }

      case "STOP": {
        responseMessage = await handleOptOut(supabase, profile.user_id, from);
        break;
      }

      case "LOCATION": {
        responseMessage = SMS_TEMPLATES.locationReceived();
        break;
      }

      case "DONE": {
        responseMessage = SMS_TEMPLATES.done();
        break;
      }

      case "4":
      case "HUMAN": {
        responseMessage = SMS_TEMPLATES.supportConnecting();

        // Escalate to inbox
        await supabase.from("inbox_conversations").insert({
          user_id: profile.user_id,
          user_name: profile.full_name,
          user_phone: from,
          channel: "sms",
          subject: `SMS Support Request from ${firstName}`,
          status: "open",
          priority: "normal",
          region,
        });
        break;
      }

      default: {
        // Simple NLP fallback: check for payment/status/help keywords
        const lower = rawBody.toLowerCase();
        if (lower.includes("pay") || lower.includes("money") || lower.includes("owe")) {
          responseMessage = SMS_TEMPLATES.help() + " Reply PAY to pay now.";
        } else if (lower.includes("status") || lower.includes("car") || lower.includes("vehicle")) {
          responseMessage = SMS_TEMPLATES.help() + " Reply STATUS for rental info.";
        } else {
          responseMessage = SMS_TEMPLATES.fallback();
        }
        break;
      }
    }

    // ─── Send response ───
    await sendSMS(from, responseMessage, supabase);

    // ─── Log to unified_message_log ───
    await supabase.from("unified_message_log").insert([
      {
        user_id: profile.user_id,
        channel: "sms",
        direction: "inbound",
        content: rawBody,
        status: "received",
        metadata: { command, region, provider: region === "NIGERIA" ? "termii" : "twilio" },
      },
      {
        user_id: profile.user_id,
        channel: "sms",
        direction: "outbound",
        content: responseMessage,
        status: "sent",
        metadata: { command, region, type: "auto_response" },
      },
    ]).catch(e => console.error("[SMS Log]", e));

    return new Response("OK", { status: 200, headers: corsHeaders });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS Commands Error]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

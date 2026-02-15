import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  selfServiceMenuMessage,
  paymentLinkMessage,
  rentalStatusMessage,
  helpMessage,
} from "../_shared/whatsapp-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════
// Intent Classification Engine
// ═══════════════════════════════════════════════════════════

interface IntentResult {
  intent: string;
  confidence: number;
  originalText: string;
  context?: {
    userType?: string;
    hasActiveRental: boolean;
    hasPendingPayment: boolean;
    region: string;
  };
}

const INTENT_MAP: Record<string, { keywords: string[]; weight: number }> = {
  // Payment
  payment_make: { keywords: ["pay now", "make payment", "settle", "pay", "payment"], weight: 1.0 },
  payment_status: { keywords: ["payment status", "paid", "money", "balance", "due", "owe", "owing"], weight: 0.9 },
  payment_history: { keywords: ["history", "transactions", "receipt", "records"], weight: 0.8 },

  // Document
  document_upload: { keywords: ["upload", "send document", "submit", "docs"], weight: 0.9 },
  document_status: { keywords: ["document status", "verification", "approved", "pending document"], weight: 0.8 },
  police_report: { keywords: ["police", "report", "clearance", "nur"], weight: 0.9 },

  // Vehicle
  vehicle_status: { keywords: ["my car", "vehicle status", "track", "status"], weight: 0.8 },
  vehicle_problem: { keywords: ["problem", "issue", "breakdown", "fault", "not working"], weight: 0.9 },
  vehicle_list: { keywords: ["list vehicle", "add car", "register vehicle"], weight: 0.7 },

  // Rental
  rental_extend: { keywords: ["extend", "more days", "renew", "extension"], weight: 0.9 },
  rental_return: { keywords: ["return", "drop off", "end rental", "done"], weight: 0.8 },
  rental_available: { keywords: ["available cars", "what cars", "search", "browse"], weight: 0.7 },

  // Support
  support: { keywords: ["help", "support", "agent", "human", "talk to someone"], weight: 0.9 },
  emergency: { keywords: ["emergency", "urgent", "accident", "help me", "crash", "fire", "robbery", "attack", "ambulance", "hospital"], weight: 1.0 },
};

// Emergency keywords including Yoruba/Hausa terms
const EMERGENCY_KEYWORDS = [
  "accident", "crash", "police", "ambulance", "hospital",
  "fire", "robbery", "attack", "emergency", "help me",
  "ṣànǹ", "turai", "egba mi", "agbara", "hadari", // Yoruba/Hausa
];

const classifyIntent = (text: string, context: IntentResult["context"]): IntentResult => {
  const normalizedText = text.toLowerCase().trim();

  // Emergency check first (highest priority)
  const isEmergency = EMERGENCY_KEYWORDS.some(kw => normalizedText.includes(kw));
  if (isEmergency) {
    return { intent: "emergency", confidence: 1.0, originalText: text, context };
  }

  // Score each intent
  const scores: Record<string, number> = {};
  for (const [intent, config] of Object.entries(INTENT_MAP)) {
    let score = 0;
    let matches = 0;
    for (const keyword of config.keywords) {
      if (normalizedText.includes(keyword)) {
        matches++;
        score += config.weight / config.keywords.length;
      }
    }
    // Boost exact single-word matches
    if (config.keywords.includes(normalizedText)) {
      score += 0.5;
    }
    scores[intent] = score;
  }

  // Get best match
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestIntent, bestScore] = sorted[0];

  if (bestScore > 0) {
    return { intent: bestIntent, confidence: Math.min(bestScore, 1.0), originalText: text, context };
  }

  return { intent: "unknown", confidence: 0, originalText: text, context };
};

// Map classified intents to command actions
const intentToCommand = (intent: string): string | null => {
  const map: Record<string, string> = {
    payment_make: "PAY",
    payment_status: "BALANCE",
    payment_history: "BALANCE",
    document_upload: "DOCS",
    document_status: "STATUS",
    police_report: "3",
    vehicle_status: "STATUS",
    vehicle_problem: "3",
    vehicle_list: "STATUS",
    rental_extend: "STATUS",
    rental_return: "DONE",
    rental_available: "1",
    support: "HUMAN",
    emergency: "EMERGENCY",
  };
  return map[intent] || null;
};

// ═══════════════════════════════════════════════════════════
// Region-aware WhatsApp message sender
// ═══════════════════════════════════════════════════════════

const sendWhatsAppMessage = async (to: string, message: string) => {
  const isNigeria = to.startsWith("+234") || to.startsWith("234");

  if (isNigeria) {
    const termiiApiKey = Deno.env.get("TERMII_API_KEY");
    const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "Rentmaikar";
    if (!termiiApiKey) throw new Error("Termii credentials not configured for Nigeria");

    const cleanPhone = to.startsWith("+") ? to.replace("+", "") : to;
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: cleanPhone, from: termiiSenderId, sms: message,
        type: "plain", channel: "whatsapp", api_key: termiiApiKey,
      }),
    });
    if (!response.ok) throw new Error(`Termii error: ${await response.text()}`);
    return response.json();
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!accountSid || !authToken || !fromNumber) throw new Error("Twilio credentials not configured");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append("To", `whatsapp:${to}`);
  formData.append("From", `whatsapp:${fromNumber}`);
  formData.append("Body", message);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
  if (!response.ok) throw new Error(`Twilio error: ${await response.text()}`);
  return response.json();
};

const generatePaymentLink = (driverId: string, amount: number, currency: string): string => {
  const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") ||
    "https://rentmaikar.lovable.app";
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

    // Parse incoming webhook (form data from Twilio or JSON from Termii)
    let from = "";
    let rawBody = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      from = formData.get("From")?.toString().replace("whatsapp:", "") || "";
      rawBody = formData.get("Body")?.toString().trim() || "";
    } else {
      const jsonData = await req.json();
      from = jsonData.from || jsonData.mobile || jsonData.phone || "";
      rawBody = (jsonData.text || jsonData.body || jsonData.message || "").trim();
      if (from && !from.startsWith("+")) {
        from = from.startsWith("234") ? `+${from}` : `+234${from}`;
      }
    }

    const body = rawBody.toUpperCase();
    const region = from.startsWith("+234") ? "NIGERIA" : "USA";

    console.log(`[WhatsApp Command] From: ${from}, Body: ${body}, Region: ${region}`);

    // Find user by phone number
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .eq("phone", from)
      .single();

    if (!profile) {
      await sendWhatsAppMessage(from,
        `👋 Welcome to Rentmaikar!\n\nWe don't recognize this number. Please register at https://rentmaikar.lovable.app to get started.`
      );
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ─── Build user context for intent classification ───
    const { data: activeRental } = await supabase
      .from("rentals")
      .select("id")
      .eq("driver_id", profile.user_id)
      .eq("status", "active")
      .limit(1)
      .single();

    const { data: pendingPayment } = await supabase
      .from("payment_defaults")
      .select("id")
      .eq("driver_id", profile.user_id)
      .eq("status", "active")
      .limit(1)
      .single();

    const userContext: IntentResult["context"] = {
      hasActiveRental: !!activeRental,
      hasPendingPayment: !!pendingPayment,
      region,
    };

    // ─── Determine command: exact match first, then intent classification ───
    let command = body;
    let intentResult: IntentResult | null = null;

    const exactCommands = [
      "PAY", "PAYMENT", "STATUS", "BALANCE", "HELP", "SUPPORT",
      "OK", "DONE", "1", "BOOKING", "2", "3", "4", "HUMAN",
    ];

    if (!exactCommands.includes(body)) {
      // No exact match — classify intent from natural language
      intentResult = classifyIntent(rawBody, userContext);
      console.log(`[Intent] ${intentResult.intent} (confidence: ${intentResult.confidence})`);

      if (intentResult.confidence >= 0.3) {
        const mappedCommand = intentToCommand(intentResult.intent);
        if (mappedCommand) {
          command = mappedCommand;
        }
      }
    }

    // ─── Process command ───
    let responseMessage = "";

    switch (command) {
      case "PAY":
      case "PAYMENT": {
        const { data: defaultPayment } = await supabase
          .from("payment_defaults")
          .select("*")
          .eq("driver_id", profile.user_id)
          .eq("status", "active")
          .single();

        if (defaultPayment) {
          const paymentUrl = generatePaymentLink(
            profile.user_id, defaultPayment.amount_due, defaultPayment.currency
          );
          responseMessage = paymentLinkMessage({
            amount: defaultPayment.amount_due,
            currency: defaultPayment.currency as "USD" | "NGN",
            paymentUrl,
          });
        } else {
          responseMessage = `✅ No Outstanding Payments\n\nYou're all caught up! No pending payments found.`;
        }
        break;
      }

      case "STATUS": {
        const { data: negotiation } = await supabase
          .from("price_negotiations")
          .select("*")
          .eq("driver_id", profile.user_id)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (negotiation) {
          const weeklyRate = negotiation.final_daily_rate ? negotiation.final_daily_rate * 7 : 0;
          responseMessage = rentalStatusMessage({
            vehicleName: `${negotiation.vehicle_make} ${negotiation.vehicle_model}`,
            status: "Active",
            nextPaymentDue: "Weekly",
            amount: weeklyRate,
            currency: negotiation.currency as "USD" | "NGN",
          });
        } else {
          responseMessage = `📊 No Active Rental\n\nYou don't have an active rental at the moment.\n\nVisit https://rentmaikar.lovable.app to browse available vehicles.`;
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
        const currency = defaults?.[0]?.currency || "USD";

        if (totalDue > 0) {
          responseMessage = `💰 Payment Balance\n\nTotal outstanding: ${currency === "NGN" ? "₦" : "$"}${totalDue.toLocaleString()}\n\nReply *PAY* to make payment.`;
        } else {
          responseMessage = `💰 Payment Balance\n\n✅ You have no outstanding balance!\n\nKeep up the great work! 🎉`;
        }
        break;
      }

      case "HELP":
      case "SUPPORT": {
        responseMessage = helpMessage();
        break;
      }

      case "OK":
      case "DONE": {
        responseMessage = `✅ Noted!\n\nThank you for confirming. Have a great day! 🚗`;
        break;
      }

      case "1":
      case "BOOKING": {
        responseMessage = `📋 Booking Support\n\nFor booking issues, please:\n1. Check your dashboard for booking details\n2. Reply *STATUS* to view current rental\n\nOr visit: https://rentmaikar.lovable.app/driver/dashboard`;
        break;
      }

      case "2": {
        responseMessage = `💳 Payment Support\n\nReply *PAY* to make a payment\nReply *BALANCE* to check your balance\n\nFor payment disputes, please email support@rentmaikar.com`;
        break;
      }

      case "3": {
        responseMessage = `🚗 Vehicle Support\n\nFor vehicle issues:\n• Mechanical problems - Call your designated support line\n• Accidents - Report immediately via the app\n• IoT device issues - Reply *IOT*`;
        break;
      }

      case "EMERGENCY": {
        // High-priority emergency escalation
        responseMessage = `🚨 EMERGENCY DETECTED\n\nWe are routing your message to an agent immediately.\n\nIf you are in danger, please call:\n🇺🇸 USA: 911\n🇳🇬 Nigeria: 112 or 199\n\nA support agent will contact you shortly.`;

        await supabase.from("inbox_conversations").insert({
          user_id: profile.user_id,
          user_name: profile.full_name,
          user_phone: from,
          channel: "whatsapp",
          subject: `🚨 EMERGENCY: ${rawBody.substring(0, 80)}`,
          status: "open",
          priority: "urgent",
          region,
        });
        break;
      }

      case "4":
      case "HUMAN": {
        responseMessage = `👤 Connecting to Support\n\nA support agent will respond shortly.\n\nIn the meantime, please describe your issue in a message.\n\nSupport hours: 8AM - 10PM daily`;

        await supabase.from("inbox_conversations").insert({
          user_id: profile.user_id,
          user_name: profile.full_name,
          user_phone: from,
          channel: "whatsapp",
          subject: "Support Request via WhatsApp",
          status: "open",
          priority: "normal",
          region,
        });
        break;
      }

      case "DOCS": {
        responseMessage = `📄 Document Upload\n\nTo upload documents:\n1. Visit your dashboard: https://rentmaikar.lovable.app/driver/dashboard\n2. Go to the Documents section\n3. Upload your required files\n\nOr send the document as an attachment in this chat.`;
        break;
      }

      default: {
        // If intent was classified but below threshold, or truly unknown
        if (intentResult && intentResult.confidence > 0 && intentResult.confidence < 0.3) {
          responseMessage = `🤔 I'm not sure I understood that.\n\nDid you mean one of these?\n\n• *PAY* - Make a payment\n• *STATUS* - Check rental status\n• *BALANCE* - View balance\n• *HELP* - Get support\n\nOr reply *4* to talk to a human.`;
        } else {
          responseMessage = selfServiceMenuMessage();
        }
        break;
      }
    }

    await sendWhatsAppMessage(from, responseMessage);

    // Log the intent classification for analytics
    if (intentResult) {
      console.log(`[Intent Log] user=${profile.user_id} intent=${intentResult.intent} confidence=${intentResult.confidence} command=${command} region=${region}`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[WhatsApp Commands Error]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

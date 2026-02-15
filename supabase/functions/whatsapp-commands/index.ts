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
// Document Helpers
// ═══════════════════════════════════════════════════════════

const DOCUMENT_LABELS: Record<string, string> = {
  driver_license: "Driver's License",
  nin: "National ID (NIN)",
  bvn: "Bank Verification Number (BVN)",
  police_clearance: "Police Clearance Certificate",
  id_card: "Government-Issued ID",
  insurance: "Vehicle Insurance",
  registration: "Vehicle Registration",
  road_worthiness: "Road Worthiness Certificate",
  proof_of_ownership: "Proof of Ownership",
  vin: "Vehicle Identification Number (VIN)",
  inspection_certificate: "Vehicle Inspection Certificate",
};

const formatDocumentType = (type: string): string =>
  DOCUMENT_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const getDocumentExpiryDays = (docType: string, country: string): number | null => {
  const expiryMap: Record<string, Record<string, number>> = {
    driver_license: { US: 365 * 4, NG: 365 * 3 },
    insurance: { US: 365, NG: 365 },
    road_worthiness: { NG: 365 },
    police_clearance: { NG: 90 },
    inspection_certificate: { US: 365 },
  };
  return expiryMap[docType]?.[country] || null;
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

      // ─── Internal payment completion webhook ───
      if (jsonData.action === "payment_completed") {
        const { userId, rentalId, transactionId, status, amount, currency } = jsonData;
        console.log(`[Payment Completion] user=${userId} rental=${rentalId} txn=${transactionId}`);

        // Update payment default to resolved
        if (rentalId) {
          await supabase.from("payment_defaults")
            .update({ status: "resolved", resolved_at: new Date().toISOString() })
            .eq("rental_id", rentalId)
            .eq("driver_id", userId)
            .eq("status", "active");
        }

        // Record payment
        const { data: rental } = await supabase.from("rentals")
          .select("owner_id, vehicle_id")
          .eq("id", rentalId)
          .single();

        if (rental) {
          await supabase.from("payments").insert({
            driver_id: userId,
            owner_id: rental.owner_id,
            vehicle_id: rental.vehicle_id,
            rental_id: rentalId,
            amount: amount || 0,
            currency: currency || "USD",
            status: status || "completed",
            transaction_id: transactionId,
            payment_method: "whatsapp_flow",
            processed_at: new Date().toISOString(),
          });
        }

        // Send confirmation to driver
        const { data: driverProfile } = await supabase.from("profiles")
          .select("phone, full_name").eq("user_id", userId).single();

        if (driverProfile?.phone) {
          const curr = (currency || "USD") === "NGN" ? "₦" : "$";
          await sendWhatsAppMessage(driverProfile.phone, [
            `✅ *Payment Received*`,
            ``,
            `Amount: ${curr}${Number(amount || 0).toLocaleString()}`,
            `Transaction: ${transactionId}`,
            `Date: ${new Date().toLocaleDateString()}`,
            ``,
            `Thank you for your payment! 🎉`,
          ].join("\n"));
        }

        // Notify owner
        if (rental) {
          const { data: ownerProfile } = await supabase.from("profiles")
            .select("phone, full_name").eq("user_id", rental.owner_id).single();

          if (ownerProfile?.phone) {
            const curr = (currency || "USD") === "NGN" ? "₦" : "$";
            await sendWhatsAppMessage(ownerProfile.phone, [
              `💰 *Payment Received for Your Vehicle*`,
              ``,
              `Driver: ${driverProfile?.full_name || "N/A"}`,
              `Amount: ${curr}${Number(amount || 0).toLocaleString()}`,
              `Transaction: ${transactionId}`,
              ``,
              `Your payout will be processed according to your schedule.`,
            ].join("\n"));
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // ─── Internal document upload handler ───
      if (jsonData.action === "document_uploaded") {
        const { userId, documentType, fileUrl, metadata } = jsonData;
        console.log(`[Document Upload] user=${userId} type=${documentType}`);

        const { data: userProfile } = await supabase.from("profiles")
          .select("phone, full_name").eq("user_id", userId).single();

        // Determine region-specific document requirements
        const isNigeria = userProfile?.phone?.startsWith("+234");
        const expiryDays = getDocumentExpiryDays(documentType, isNigeria ? "NG" : "US");

        // Check if document record exists, update or insert
        const { data: existingDoc } = await supabase.from("user_documents")
          .select("id")
          .eq("user_id", userId)
          .eq("document_type", documentType)
          .limit(1)
          .single();

        const docData = {
          user_id: userId,
          document_type: documentType,
          file_url: fileUrl,
          status: "pending" as const,
          uploaded_at: new Date().toISOString(),
          metadata: metadata || {},
        };

        if (existingDoc) {
          await supabase.from("user_documents")
            .update({ ...docData })
            .eq("id", existingDoc.id);
        } else {
          await supabase.from("user_documents").insert(docData);
        }

        // Send confirmation to user
        if (userProfile?.phone) {
          const docLabel = formatDocumentType(documentType);
          await sendWhatsAppMessage(userProfile.phone, [
            `📄 *Document Received*`,
            ``,
            `Type: ${docLabel}`,
            `Status: ⏳ Pending Review`,
            ``,
            `Our team will verify your document within 24-48 hours.`,
            expiryDays ? `\n📅 This document expires in ${expiryDays} days after verification.` : "",
            ``,
            `_Reply *STATUS* to check document status._`,
          ].filter(Boolean).join("\n"));
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // ─── Internal document verification result ───
      if (jsonData.action === "document_verified" || jsonData.action === "document_rejected") {
        const { userId, documentType, reason, expiryDate } = jsonData;
        const isVerified = jsonData.action === "document_verified";

        const { data: userProfile } = await supabase.from("profiles")
          .select("phone, full_name").eq("user_id", userId).single();

        if (userProfile?.phone) {
          const docLabel = formatDocumentType(documentType);

          if (isVerified) {
            await sendWhatsAppMessage(userProfile.phone, [
              `✅ *Document Verified*`,
              ``,
              `Type: ${docLabel}`,
              expiryDate ? `Expires: ${new Date(expiryDate).toLocaleDateString()}` : "",
              ``,
              `Your ${docLabel} has been approved! ✨`,
            ].filter(Boolean).join("\n"));
          } else {
            await sendWhatsAppMessage(userProfile.phone, [
              `❌ *Document Rejected*`,
              ``,
              `Type: ${docLabel}`,
              `Reason: ${reason || "Does not meet requirements"}`,
              ``,
              `Please re-upload a valid document.`,
              `Supported formats: PDF, JPG, PNG (Max 10MB)`,
              ``,
              `👉 Upload at: https://rentmaikar.lovable.app/driver/dashboard`,
              `Or send the file directly in this chat.`,
            ].join("\n"));
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

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
        // Look for active payment defaults first
        const { data: defaultPayment } = await supabase
          .from("payment_defaults")
          .select("*, rental_id")
          .eq("driver_id", profile.user_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (defaultPayment) {
          // Get rental & vehicle details for the interactive payment message
          const { data: rental } = await supabase
            .from("rentals")
            .select("id, vehicle_id, daily_rate, currency")
            .eq("id", defaultPayment.rental_id)
            .single();

          const vehicleLabel = rental?.vehicle_id
            ? (await supabase.from("vehicles").select("make, model, year").eq("id", rental.vehicle_id).single()).data
            : null;

          const vehicleName = vehicleLabel
            ? `${vehicleLabel.year} ${vehicleLabel.make} ${vehicleLabel.model}`
            : "your vehicle";

          const curr = defaultPayment.currency === "NGN" ? "₦" : "$";
          const amount = Number(defaultPayment.amount_due);
          const paymentUrl = generatePaymentLink(
            profile.user_id, amount, defaultPayment.currency
          );

          // Interactive-style payment message with structured sections
          responseMessage = [
            `💳 *Secure Payment*`,
            ``,
            `Complete payment of ${curr}${amount.toLocaleString()} for ${vehicleName}.`,
            ``,
            `📋 *Payment Details*`,
            `• Amount: ${curr}${amount.toLocaleString()}`,
            `• Vehicle: ${vehicleName}`,
            `• Frequency: ${defaultPayment.payment_frequency || "Daily"}`,
            `• Hours Overdue: ${defaultPayment.hours_overdue || 0}h`,
            ``,
            `🔒 Secured by ${defaultPayment.currency === "NGN" ? "Paystack" : "PayPal"}`,
            ``,
            `👉 Pay now: ${paymentUrl}`,
            ``,
            `_Reply *BALANCE* to see full breakdown or *4* for help._`,
          ].join("\n");
        } else {
          // Check for upcoming payments even if not overdue
          const { data: activeRentalForPay } = await supabase
            .from("rentals")
            .select("id, daily_rate, currency, vehicle_id, payment_frequency")
            .eq("driver_id", profile.user_id)
            .eq("status", "active")
            .limit(1)
            .single();

          if (activeRentalForPay) {
            const curr = activeRentalForPay.currency === "NGN" ? "₦" : "$";
            const paymentUrl = generatePaymentLink(
              profile.user_id, activeRentalForPay.daily_rate, activeRentalForPay.currency
            );
            responseMessage = [
              `✅ *No Overdue Payments*`,
              ``,
              `You're all caught up! 🎉`,
              ``,
              `Want to make an early payment?`,
              `• ${activeRentalForPay.payment_frequency === "weekly" ? "Weekly" : "Daily"} rate: ${curr}${activeRentalForPay.daily_rate.toLocaleString()}`,
              ``,
              `👉 Pay ahead: ${paymentUrl}`,
            ].join("\n");
          } else {
            responseMessage = `✅ No Outstanding Payments\n\nYou're all caught up! No pending payments or active rentals found.`;
          }
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
        // Query user's pending/missing documents
        const { data: userDocs } = await supabase
          .from("user_documents")
          .select("document_type, status")
          .eq("user_id", profile.user_id);

        const pendingDocs = userDocs?.filter(d => d.status === "pending") || [];
        const rejectedDocs = userDocs?.filter(d => d.status === "rejected") || [];
        const uploadedTypes = new Set(userDocs?.map(d => d.document_type) || []);

        // Determine required docs by region
        const requiredDocs = region === "NIGERIA"
          ? ["driver_license", "nin", "bvn", "police_clearance"]
          : ["driver_license", "id_card"];

        const missingDocs = requiredDocs.filter(d => !uploadedTypes.has(d));

        const lines = [`📄 *Document Upload Center*`, ``];

        if (missingDocs.length > 0) {
          lines.push(`⚠️ *Missing Documents:*`);
          missingDocs.forEach(d => lines.push(`  • ${formatDocumentType(d)}`));
          lines.push(``);
        }

        if (pendingDocs.length > 0) {
          lines.push(`⏳ *Pending Review:*`);
          pendingDocs.forEach(d => lines.push(`  • ${formatDocumentType(d.document_type)}`));
          lines.push(``);
        }

        if (rejectedDocs.length > 0) {
          lines.push(`❌ *Needs Re-upload:*`);
          rejectedDocs.forEach(d => lines.push(`  • ${formatDocumentType(d.document_type)}`));
          lines.push(``);
        }

        if (missingDocs.length === 0 && pendingDocs.length === 0 && rejectedDocs.length === 0) {
          lines.push(`✅ All documents are verified!`);
        } else {
          lines.push(
            `📎 *How to upload:*`,
            `1. Send the file directly in this chat`,
            `2. Or visit: https://rentmaikar.lovable.app/driver/dashboard`,
            ``,
            `Supported: PDF, JPG, PNG (Max 10MB)`,
          );
        }

        responseMessage = lines.join("\n");
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

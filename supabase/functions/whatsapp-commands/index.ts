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

// ─── Region-aware WhatsApp message sender ───
const sendWhatsAppMessage = async (to: string, message: string) => {
  const isNigeria = to.startsWith("+234") || to.startsWith("234");

  if (isNigeria) {
    // ─── TERMII (Nigeria +234) ───
    const termiiApiKey = Deno.env.get("TERMII_API_KEY");
    const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "Rentmaikar";

    if (!termiiApiKey) {
      throw new Error("Termii credentials not configured for Nigeria");
    }

    const cleanPhone = to.startsWith("+") ? to.replace("+", "") : to;

    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: cleanPhone,
        from: termiiSenderId,
        sms: message,
        type: "plain",
        channel: "whatsapp",
        api_key: termiiApiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Termii error: ${error}`);
    }

    return response.json();
  }

  // ─── TWILIO (USA / Default) ───
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio credentials not configured");
  }

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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }

  return response.json();
};

const generatePaymentLink = (driverId: string, amount: number, currency: string): string => {
  const baseUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 
                  "https://rentmaikar.lovable.app";
  const params = new URLSearchParams({
    driver: driverId,
    amount: amount.toString(),
    currency,
    ts: Date.now().toString(),
  });
  return `${baseUrl}/payment?${params.toString()}`;
};

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
    let body = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      // Twilio webhook (form data)
      const formData = await req.formData();
      from = formData.get("From")?.toString().replace("whatsapp:", "") || "";
      body = formData.get("Body")?.toString().trim().toUpperCase() || "";
    } else {
      // Termii webhook (JSON)
      const jsonData = await req.json();
      from = jsonData.from || jsonData.mobile || jsonData.phone || "";
      body = (jsonData.text || jsonData.body || jsonData.message || "").trim().toUpperCase();
      // Normalize Nigerian numbers to international format
      if (from && !from.startsWith("+")) {
        from = from.startsWith("234") ? `+${from}` : `+234${from}`;
      }
    }

    console.log(`[WhatsApp Command] From: ${from}, Body: ${body}`);

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

    // Process commands
    let responseMessage = "";

    switch (body) {
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
            profile.user_id, 
            defaultPayment.amount_due, 
            defaultPayment.currency
          );
          responseMessage = paymentLinkMessage({
            amount: defaultPayment.amount_due,
            currency: defaultPayment.currency as 'USD' | 'NGN',
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
            currency: negotiation.currency as 'USD' | 'NGN',
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
          responseMessage = `💰 Payment Balance\n\nTotal outstanding: ${currency === 'NGN' ? '₦' : '$'}${totalDue.toLocaleString()}\n\nReply *PAY* to make payment.`;
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

      case "4":
      case "HUMAN": {
        responseMessage = `👤 Connecting to Support\n\nA support agent will respond shortly.\n\nIn the meantime, please describe your issue in a message.\n\nSupport hours: 8AM - 10PM daily`;
        
        const region = from.startsWith("+234") ? "NIGERIA" : "USA";
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

      default: {
        responseMessage = selfServiceMenuMessage();
        break;
      }
    }

    await sendWhatsAppMessage(from, responseMessage);

    return new Response("OK", {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: any) {
    console.error("[WhatsApp Commands Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

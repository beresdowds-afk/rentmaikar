import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, messageContent, channel, recipientPhone } = await req.json();

    if (!conversationId || !messageContent || !channel || !recipientPhone) {
      throw new Error("Missing required fields: conversationId, messageContent, channel, recipientPhone");
    }

    // ─── Look up conversation region & forwarding number ───
    const { data: conversation } = await supabase
      .from("inbox_conversations")
      .select("region")
      .eq("id", conversationId)
      .single();

    let forwardingFrom: string | null = null;
    if (conversation?.region) {
      const { data: region } = await supabase
        .from("platform_regions")
        .select("forwarding_sms, forwarding_whatsapp")
        .eq("code", conversation.region)
        .single();

      if (region) {
        forwardingFrom = channel === "whatsapp" ? region.forwarding_whatsapp : region.forwarding_sms;
      }
    }

    // ─── Determine provider based on phone region ───
    const isNigeria = recipientPhone.startsWith("+234");
    let messageSid = "";
    let messageStatus = "";

    if (isNigeria) {
      // ─── TERMII (Nigeria +234) ───
      const termiiApiKey = Deno.env.get("TERMII_API_KEY");
      const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "Rentmaikar";

      if (!termiiApiKey) {
        throw new Error("TERMII_API_KEY is not configured for Nigeria messaging");
      }

      const isWhatsApp = channel === "whatsapp";
      const termiiChannel = isWhatsApp ? "whatsapp" : "generic";
      // Use forwarding sender ID if available
      const senderId = forwardingFrom || termiiSenderId;

      console.log(`Sending ${channel} via Termii to ${recipientPhone} from ${senderId}`);

      const termiiResponse = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientPhone.replace("+", ""),
          from: senderId,
          sms: messageContent,
          type: "plain",
          channel: termiiChannel,
          api_key: termiiApiKey,
        }),
      });

      const termiiData = await termiiResponse.json();

      if (!termiiResponse.ok || termiiData.code !== "ok") {
        console.error("Termii API error:", termiiData);
        throw new Error(`Termii API error: ${termiiData.message || "Unknown error"}`);
      }

      messageSid = termiiData.message_id || `termii_${Date.now()}`;
      messageStatus = "sent";
      console.log("Message sent via Termii:", messageSid);
    } else {
      // ─── TWILIO (USA / Default) ───
      const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
      const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
      const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        throw new Error("Twilio credentials not configured");
      }

      let toNumber = recipientPhone;
      // Use forwarding number as "from" if configured, otherwise default provider number
      let fromNumber = forwardingFrom || TWILIO_PHONE_NUMBER;

      if (channel === "whatsapp") {
        toNumber = recipientPhone.startsWith("whatsapp:") ? recipientPhone : `whatsapp:${recipientPhone}`;
        fromNumber = `whatsapp:${forwardingFrom || TWILIO_PHONE_NUMBER}`;
      }

      console.log(`Sending ${channel} via Twilio to ${toNumber} from ${fromNumber}${forwardingFrom ? ' (forwarding)' : ''}`);

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append("To", toNumber);
      formData.append("From", fromNumber);
      formData.append("Body", messageContent);

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const twilioData = await twilioResponse.json();

      if (!twilioResponse.ok) {
        console.error("Twilio API error:", twilioData);
        throw new Error(`Twilio API error: ${twilioData.message || twilioData.error_message || "Unknown error"}`);
      }

      messageSid = twilioData.sid;
      messageStatus = twilioData.status;
      console.log("Message sent via Twilio:", messageSid);
    }

    // Update the message in the database with external_id
    const provider = isNigeria ? "termii" : "twilio";
    const { error: updateError } = await supabase
      .from("inbox_messages")
      .update({
        external_id: messageSid,
        metadata: {
          provider,
          status: messageStatus,
          sent_at: new Date().toISOString(),
          sent_from: forwardingFrom || (isNigeria ? "default_termii" : "default_twilio"),
          is_forwarding_number: !!forwardingFrom,
        },
      })
      .eq("conversation_id", conversationId)
      .eq("content", messageContent)
      .eq("sender_type", "admin")
      .is("external_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (updateError) {
      console.warn("Failed to update message with external ID:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid,
        status: messageStatus,
        provider,
        sentFrom: forwardingFrom || "default",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send reply error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

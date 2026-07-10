import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guards.ts";
import { whatchimp } from "../_shared/whatchimp-client.ts";
import { manychat } from "../_shared/manychat-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _authError = requireServiceRole(req);
  if (_authError) return _authError;


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, messageContent, channel, recipientPhone } = await req.json();

    if (!conversationId || !messageContent || !channel) {
      throw new Error("Missing required fields: conversationId, messageContent, channel");
    }

    // ─── Look up conversation region + metadata (needed for social routing) ───
    const { data: conversation } = await supabase
      .from("inbox_conversations")
      .select("region, metadata, channel")
      .eq("id", conversationId)
      .single();

    // ─── Social channels (Instagram / Facebook Messenger) → ManyChat ───
    if (channel === "instagram" || channel === "facebook_messenger") {
      const subscriberId = (conversation?.metadata as Record<string, unknown> | null)?.manychat_subscriber_id as string | undefined;
      if (!subscriberId) throw new Error("ManyChat subscriber_id missing on conversation");
      if (!manychat.isConfigured()) throw new Error("ManyChat not configured (MANYCHAT_API_TOKEN missing)");
      const result = await manychat.sendMessage(subscriberId, messageContent);
      if (!result.ok) throw new Error(`ManyChat send failed: ${JSON.stringify(result)}`);
      await supabase.from("inbox_messages").update({
        external_id: `manychat_${Date.now()}`,
        metadata: { provider: "manychat", sent_at: new Date().toISOString() },
      }).eq("conversation_id", conversationId).eq("content", messageContent).eq("sender_type", "admin")
        .is("external_id", null).order("created_at", { ascending: false }).limit(1);
      return new Response(JSON.stringify({ success: true, provider: "manychat" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipientPhone) throw new Error("recipientPhone required for phone-based channels");

    let forwardingFrom: string | null = null;
    let regionWhatsappProvider: string | null = null;
    if (conversation?.region) {
      const { data: region } = await supabase
        .from("platform_regions")
        .select("forwarding_sms, forwarding_whatsapp")
        .eq("code", conversation.region)
        .single();
      if (region) forwardingFrom = channel === "whatsapp" ? region.forwarding_whatsapp : region.forwarding_sms;

      const { data: commProv } = await supabase
        .from("communication_providers")
        .select("whatsapp_provider")
        .eq("region_code", conversation.region)
        .maybeSingle();
      regionWhatsappProvider = commProv?.whatsapp_provider ?? null;
    }

    // ─── WhatsApp: honor per-region provider preference (Whatchimp / Twilio / Termii) ───
    const isNigeria = recipientPhone.startsWith("+234");
    let messageSid = "";
    let messageStatus = "";

    if (channel === "whatsapp" && regionWhatsappProvider === "whatchimp" && whatchimp.isConfigured()) {
      const result = await whatchimp.sendMessage({ to: recipientPhone, body: messageContent });
      if (!result.ok) throw new Error(`Whatchimp send failed: ${JSON.stringify(result)}`);
      messageSid = result.messageId;
      messageStatus = "sent";
      await supabase.from("inbox_messages").update({
        external_id: messageSid,
        metadata: { provider: "whatchimp", status: messageStatus, sent_at: new Date().toISOString() },
      }).eq("conversation_id", conversationId).eq("content", messageContent).eq("sender_type", "admin")
        .is("external_id", null).order("created_at", { ascending: false }).limit(1);
      return new Response(JSON.stringify({ success: true, provider: "whatchimp", messageSid }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

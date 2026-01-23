import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID) {
      throw new Error("TWILIO_ACCOUNT_SID is not configured");
    }
    if (!TWILIO_AUTH_TOKEN) {
      throw new Error("TWILIO_AUTH_TOKEN is not configured");
    }
    if (!TWILIO_PHONE_NUMBER) {
      throw new Error("TWILIO_PHONE_NUMBER is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, messageContent, channel, recipientPhone } = await req.json();

    if (!conversationId || !messageContent || !channel || !recipientPhone) {
      throw new Error("Missing required fields: conversationId, messageContent, channel, recipientPhone");
    }

    // Format the phone number based on channel
    let toNumber = recipientPhone;
    let fromNumber = TWILIO_PHONE_NUMBER;

    if (channel === "whatsapp") {
      // Add whatsapp: prefix for WhatsApp messages
      toNumber = recipientPhone.startsWith("whatsapp:") ? recipientPhone : `whatsapp:${recipientPhone}`;
      fromNumber = `whatsapp:${TWILIO_PHONE_NUMBER}`;
    }

    console.log(`Sending ${channel} message to ${toNumber} from ${fromNumber}`);

    // Send message via Twilio API
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

    console.log("Twilio message sent successfully:", twilioData.sid);

    // Update the message in the database with external_id
    const { error: updateError } = await supabase
      .from("inbox_messages")
      .update({
        external_id: twilioData.sid,
        metadata: {
          twilio_status: twilioData.status,
          sent_at: new Date().toISOString(),
        },
      })
      .eq("conversation_id", conversationId)
      .eq("content", messageContent)
      .eq("sender_type", "admin")
      .is("external_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (updateError) {
      console.warn("Failed to update message with Twilio SID:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
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

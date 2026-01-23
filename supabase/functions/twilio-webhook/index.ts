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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook payload (form-urlencoded)
    const formData = await req.formData();
    
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;
    const accountSid = formData.get("AccountSid") as string;
    const numMedia = formData.get("NumMedia") as string;
    
    // Determine channel type (SMS or WhatsApp)
    const channel = from?.startsWith("whatsapp:") ? "whatsapp" : "sms";
    
    // Clean phone number (remove whatsapp: prefix if present)
    const cleanFrom = from?.replace("whatsapp:", "");
    const cleanTo = to?.replace("whatsapp:", "");
    
    // Determine region based on phone number
    // +1 = USA, +234 = Nigeria
    let region = "USA";
    if (cleanFrom?.startsWith("+234") || cleanTo?.startsWith("+234")) {
      region = "Nigeria";
    }

    console.log("Received message:", {
      from: cleanFrom,
      to: cleanTo,
      channel,
      region,
      body: body?.substring(0, 50) + "...",
      messageSid,
    });

    // Check if there's an existing conversation with this phone number
    const { data: existingConversation, error: findError } = await supabase
      .from("inbox_conversations")
      .select("*")
      .eq("user_phone", cleanFrom)
      .eq("channel", channel)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;

    if (existingConversation) {
      // Update existing conversation
      conversationId = existingConversation.id;
      
      await supabase
        .from("inbox_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
      
      console.log("Updated existing conversation:", conversationId);
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from("inbox_conversations")
        .insert({
          channel,
          region,
          user_phone: cleanFrom,
          status: "open",
          priority: "normal",
          subject: `New ${channel.toUpperCase()} message from ${cleanFrom}`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        throw createError;
      }

      conversationId = newConversation.id;
      console.log("Created new conversation:", conversationId);
    }

    // Add the message to the conversation
    const { error: messageError } = await supabase
      .from("inbox_messages")
      .insert({
        conversation_id: conversationId,
        channel,
        content: body || "",
        sender_type: "user",
        sender_name: cleanFrom,
        external_id: messageSid,
        metadata: {
          accountSid,
          numMedia: parseInt(numMedia || "0"),
          rawFrom: from,
          rawTo: to,
        },
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
      throw messageError;
    }

    console.log("Message saved successfully");

    // Return TwiML response (empty response to acknowledge receipt)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml",
        },
      }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);
    
    // Still return success to Twilio to prevent retries
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml",
        },
      }
    );
  }
});

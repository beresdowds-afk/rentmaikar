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

    // Parse incoming Termii webhook (JSON payload)
    const payload = await req.json();

    // Termii inbound webhook fields vary by event type
    const from = payload.from || payload.mobile || payload.phone || "";
    const body = payload.text || payload.body || payload.message || "";
    const messageId = payload.message_id || payload.id || "";
    const channel = payload.channel || "sms"; // 'sms' or 'whatsapp'

    // Normalize Nigerian phone number to international format
    let cleanFrom = from;
    if (cleanFrom && !cleanFrom.startsWith("+")) {
      cleanFrom = cleanFrom.startsWith("234") ? `+${cleanFrom}` : `+234${cleanFrom}`;
    }

    const inboundChannel = channel === "whatsapp" ? "whatsapp" : "sms";

    console.log("Termii inbound message:", {
      from: cleanFrom,
      channel: inboundChannel,
      body: body?.substring(0, 50) + "...",
      messageId,
    });

    // ─── Check for WhatsApp self-service commands ───
    const upperBody = (body || "").trim().toUpperCase();
    const isCommand = ["PAY", "PAYMENT", "STATUS", "BALANCE", "HELP", "SUPPORT",
      "OK", "DONE", "1", "BOOKING", "2", "3", "4", "HUMAN", "DOCS", "RULES", "IOT"].includes(upperBody);

    if (inboundChannel === "whatsapp" && isCommand) {
      // Forward to whatsapp-commands function for processing
      console.log(`Forwarding WhatsApp command "${upperBody}" to whatsapp-commands`);

      const commandResponse = await fetch(
        `${supabaseUrl}/functions/v1/whatsapp-commands`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            from: cleanFrom,
            text: body,
            channel: "whatsapp",
          }),
        }
      );

      console.log("whatsapp-commands response:", commandResponse.status);
      return new Response(JSON.stringify({ success: true, routed: "whatsapp-commands" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Route to Unified Inbox ───
    // Check for existing conversation
    const { data: existingConversation } = await supabase
      .from("inbox_conversations")
      .select("*")
      .eq("user_phone", cleanFrom)
      .eq("channel", inboundChannel)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;

    if (existingConversation) {
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
      const { data: newConversation, error: createError } = await supabase
        .from("inbox_conversations")
        .insert({
          channel: inboundChannel,
          region: "NIGERIA",
          user_phone: cleanFrom,
          status: "open",
          priority: "normal",
          subject: `New ${inboundChannel.toUpperCase()} message from ${cleanFrom}`,
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

    // Save the message
    const { error: messageError } = await supabase
      .from("inbox_messages")
      .insert({
        conversation_id: conversationId,
        channel: inboundChannel,
        content: body || "",
        sender_type: "user",
        sender_name: cleanFrom,
        external_id: messageId,
        metadata: {
          provider: "termii",
          region: "NIGERIA",
          raw_payload: payload,
        },
      });

    if (messageError) {
      console.error("Error saving message:", messageError);
      throw messageError;
    }

    console.log("Termii message saved successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Termii webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 200, // Return 200 to prevent retries
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

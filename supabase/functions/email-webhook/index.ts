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

    // Parse email webhook payload
    // This handles Resend's inbound email webhook format
    const payload = await req.json();
    
    console.log("Received email webhook payload:", JSON.stringify(payload, null, 2));

    // Extract email data from Resend webhook
    const {
      from,
      to,
      subject,
      text,
      html,
      headers,
      attachments,
    } = payload;

    // Get sender email (handle both string and array formats)
    const senderEmail = Array.isArray(from) ? from[0] : from;
    const recipientEmail = Array.isArray(to) ? to[0] : to;
    
    // Extract sender name from email format "Name <email@domain.com>"
    let senderName = senderEmail;
    const emailMatch = senderEmail.match(/^(.+?)\s*<(.+)>$/);
    if (emailMatch) {
      senderName = emailMatch[1].trim();
    }

    // Determine region based on recipient email domain
    let region = "USA";
    if (recipientEmail?.includes("ng.") || recipientEmail?.includes(".ng")) {
      region = "Nigeria";
    }

    // Use text content, or strip HTML if only HTML is available
    let messageContent = text || "";
    if (!messageContent && html) {
      // Basic HTML stripping
      messageContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    console.log("Processing email from:", senderEmail, "subject:", subject);

    // Check if there's an existing conversation with this email
    const { data: existingConversation, error: findError } = await supabase
      .from("inbox_conversations")
      .select("*")
      .eq("user_email", senderEmail)
      .eq("channel", "email")
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;

    if (existingConversation && !findError) {
      // Update existing conversation
      conversationId = existingConversation.id;
      
      await supabase
        .from("inbox_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "open",
          updated_at: new Date().toISOString(),
          subject: subject || existingConversation.subject,
        })
        .eq("id", conversationId);
      
      console.log("Updated existing conversation:", conversationId);
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from("inbox_conversations")
        .insert({
          channel: "email",
          region,
          user_email: senderEmail,
          user_name: senderName,
          status: "open",
          priority: "normal",
          subject: subject || "No subject",
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

    // Extract message ID from headers if available
    const messageId = headers?.["message-id"] || headers?.["Message-ID"] || null;

    // Add the message to the conversation
    const { error: messageError } = await supabase
      .from("inbox_messages")
      .insert({
        conversation_id: conversationId,
        channel: "email",
        content: messageContent,
        sender_type: "user",
        sender_name: senderName,
        sender_id: null,
        external_id: messageId,
        metadata: {
          subject,
          from: senderEmail,
          to: recipientEmail,
          has_attachments: attachments?.length > 0,
          attachment_count: attachments?.length || 0,
        },
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
      throw messageError;
    }

    console.log("Email message saved successfully");

    return new Response(
      JSON.stringify({ success: true, conversationId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Email webhook error:", error);
    
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

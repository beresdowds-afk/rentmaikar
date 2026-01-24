import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_CONFIG, formatSenderEmail } from "../_shared/email-config.ts";
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, messageContent, recipientEmail, subject } = await req.json();

    if (!conversationId || !messageContent || !recipientEmail) {
      throw new Error("Missing required fields: conversationId, messageContent, recipientEmail");
    }

    // Get conversation details for context
    const { data: conversation } = await supabase
      .from("inbox_conversations")
      .select("subject, region")
      .eq("id", conversationId)
      .single();

    const emailSubject = subject || 
      (conversation?.subject ? `Re: ${conversation.subject}` : "Reply from Rentmaikar Support");

    // Use centralized email config
    const fromEmail = formatSenderEmail('support');

    console.log(`Sending email to ${recipientEmail} from ${EMAIL_CONFIG.support}`);

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f97316; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Rentmaikar</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <div style="white-space: pre-wrap; line-height: 1.6;">${messageContent.replace(/\n/g, '<br>')}</div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                This is a reply from Rentmaikar Support. Please reply to this email if you need further assistance.
              </p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              <p>© ${new Date().getFullYear()} Rentmaikar. All rights reserved.</p>
              <p>Vehicle rentals for rideshare drivers</p>
            </div>
          </div>
        `,
        text: messageContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    // Update the message with external_id
    await supabase
      .from("inbox_messages")
      .update({
        external_id: emailResult.id,
        metadata: {
          email_status: "sent",
          sent_at: new Date().toISOString(),
        },
      })
      .eq("conversation_id", conversationId)
      .eq("content", messageContent)
      .eq("sender_type", "admin")
      .is("external_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send email reply error:", error);
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

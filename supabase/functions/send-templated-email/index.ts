import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  EMAIL_TEMPLATES, 
  type EmailTemplateName, 
  type TemplateData 
} from "../_shared/email-templates.ts";
import { formatSenderEmail } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTemplatedEmailRequest {
  to: string;
  template: EmailTemplateName;
  data: TemplateData;
  senderType?: 'noreply' | 'support' | 'admin';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body: SendTemplatedEmailRequest = await req.json();

    // Validate request
    if (!body.to || !body.template) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, template" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get template function
    const templateFn = EMAIL_TEMPLATES[body.template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown template: ${body.template}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate email content
    const emailContent = templateFn(body.data || {});
    const senderType = body.senderType || 'noreply';
    const fromEmail = formatSenderEmail(senderType);

    console.log(`[SendTemplatedEmail] Sending ${body.template} to ${body.to}`);

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [body.to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResponse = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log(`[SendTemplatedEmail] Email sent successfully:`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.id,
        template: body.template 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SendTemplatedEmail] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

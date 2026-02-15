import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_CONFIG, formatSenderEmail } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Email Queue Routing ───
const EMAIL_QUEUES: Record<string, { queue: string; priority: string; category: string }> = {
  "support@rentmaikar.com":   { queue: "support",   priority: "normal",  category: "support_request" },
  "payments@rentmaikar.com":  { queue: "payments",  priority: "high",    category: "payment_query" },
  "documents@rentmaikar.com": { queue: "documents", priority: "normal",  category: "document_upload" },
  "admin@rentmaikar.com":     { queue: "admin",     priority: "high",    category: "admin_inquiry" },
  "legal@rentmaikar.com":     { queue: "legal",     priority: "high",    category: "legal" },
  "privacy@rentmaikar.com":   { queue: "legal",     priority: "high",    category: "legal" },
  "dpo@rentmaikar.com":       { queue: "legal",     priority: "high",    category: "legal" },
  "nigeria@rentmaikar.com":   { queue: "support",   priority: "normal",  category: "support_request" },
  "usa@rentmaikar.com":       { queue: "support",   priority: "normal",  category: "support_request" },
  "noreply@rentmaikar.com":   { queue: "automated", priority: "low",     category: "auto_reply" },
};

// ─── Content-Based Classification ───
interface ClassificationResult {
  category: string;
  confidence: number;
  urgency: "low" | "normal" | "high" | "urgent";
}

function classifyEmailContent(subject: string, body: string): ClassificationResult {
  const combined = `${subject} ${body}`.toUpperCase();

  // Complaint / Urgent
  const complaintPatterns = [
    /COMPLAIN/i, /TERRIBLE/i, /UNACCEPTABLE/i, /ANGRY/i, /WORST/i, /LAWYER/i,
    /SUE/i, /BBB/i, /ATTORNEY/i, /REFUND/i, /SCAM/i, /FRAUD/i, /STOLEN/i,
  ];
  if (complaintPatterns.some(p => p.test(combined))) {
    return { category: "complaint", confidence: 0.9, urgency: "urgent" };
  }

  // Emergency / Accident
  if (/ACCIDENT|CRASH|EMERGENCY|TOWED|POLICE\s*REPORT/i.test(combined)) {
    return { category: "emergency", confidence: 0.95, urgency: "urgent" };
  }

  // Legal
  if (/LEGAL|SUBPOENA|COURT\s*ORDER|GDPR|DATA\s*REQUEST|PRIVACY/i.test(combined)) {
    return { category: "legal", confidence: 0.85, urgency: "high" };
  }

  // Payment related
  if (/PAYMENT|INVOICE|RECEIPT|CHARGE|BILLING|REFUND|BALANCE|PAYOUT/i.test(combined)) {
    return { category: "payment_query", confidence: 0.85, urgency: "normal" };
  }

  // Document related
  if (/DOCUMENT|LICENSE|INSURANCE|REGISTRATION|UPLOAD|EXPIRED|RENEWAL/i.test(combined)) {
    return { category: "document_upload", confidence: 0.8, urgency: "normal" };
  }

  // Vehicle / Rental
  if (/VEHICLE|CAR|RENTAL|BOOKING|PICKUP|RETURN|EXTEND/i.test(combined)) {
    return { category: "support_request", confidence: 0.75, urgency: "normal" };
  }

  // General inquiry
  return { category: "general_inquiry", confidence: 0.5, urgency: "low" };
}

// ─── Auto-Acknowledgment Templates ───
function getAcknowledgmentHtml(category: string, senderName: string, ticketId: string): { subject: string; html: string } {
  const name = senderName.split(/[<@]/)[0].trim() || "there";

  const templates: Record<string, { subject: string; body: string }> = {
    complaint: {
      subject: `We've received your concern [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>We take your concerns very seriously. A senior support specialist has been assigned to your case and will respond within <strong>2 hours</strong>.</p>
        <p>Your reference number: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    emergency: {
      subject: `URGENT: Your emergency report [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>We've received your emergency report and our team has been <strong>immediately notified</strong>. If you need immediate assistance, please call our emergency line.</p>
        <p>Reference: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    legal: {
      subject: `Legal inquiry received [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>Your legal inquiry has been forwarded to our legal team. We will respond within <strong>24-48 hours</strong>.</p>
        <p>Reference: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    payment_query: {
      subject: `Payment inquiry received [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>We've received your payment-related inquiry. Our billing team will review and respond within <strong>24 hours</strong>.</p>
        <p>Reference: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    document_upload: {
      subject: `Document submission received [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>We've received your document submission. Our verification team will review it within <strong>1-2 business days</strong>.</p>
        <p>Reference: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    support_request: {
      subject: `We received your message [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>Thank you for reaching out. A support agent will respond within <strong>24 hours</strong>.</p>
        <p>Reference: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    general_inquiry: {
      subject: `Thanks for contacting Rentmaikar [#${ticketId.slice(0, 8)}]`,
      body: `<p>Hi ${name},</p>
        <p>We received your email and will get back to you as soon as possible.</p>
        <p>Reference: <strong>#${ticketId.slice(0, 8)}</strong></p>`,
    },
    auto_reply: {
      subject: `Auto-reply received`,
      body: ``, // No acknowledgment for noreply bounces
    },
  };

  const t = templates[category] || templates.general_inquiry;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚗 Rentmaikar</h1>
      </div>
      <div style="padding: 32px; background: #fff; border: 1px solid #e2e8f0;">
        ${t.body}
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 13px;">
          Please do not change the subject line when replying so we can track your conversation.
        </p>
      </div>
      <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-radius: 0 0 12px 12px;">
        <p>© ${new Date().getFullYear()} Rentmaikar. All rights reserved.</p>
        <p>Email: ${EMAIL_CONFIG.support}</p>
      </div>
    </div>`;

  return { subject: t.subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Email webhook received:", JSON.stringify(payload).slice(0, 500));

    const { from, to, subject, text, html: htmlBody, headers: emailHeaders, attachments } = payload;

    // ─── Sender parsing ───
    const senderEmail = Array.isArray(from) ? from[0] : from;
    const recipientEmail = (Array.isArray(to) ? to[0] : to)?.toLowerCase() || "";
    let senderName = senderEmail;
    const emailMatch = senderEmail.match(/^(.+?)\s*<(.+)>$/);
    if (emailMatch) senderName = emailMatch[1].trim();

    // ─── Queue routing by recipient ───
    const queueInfo = EMAIL_QUEUES[recipientEmail] || { queue: "support", priority: "normal", category: "support_request" };

    // Skip processing auto-replies / noreply bounces
    if (queueInfo.category === "auto_reply") {
      console.log("Ignoring auto-reply/noreply bounce from:", senderEmail);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Region detection ───
    let region = "USA";
    if (recipientEmail.includes("nigeria") || recipientEmail.includes(".ng") || senderEmail.includes("+234")) {
      region = "Nigeria";
    }

    // ─── Content extraction ───
    let messageContent = text || "";
    if (!messageContent && htmlBody) {
      messageContent = htmlBody
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // ─── Content-based classification (overrides queue default if higher confidence) ───
    const classification = classifyEmailContent(subject || "", messageContent);
    const finalCategory = classification.confidence > 0.7 ? classification.category : queueInfo.category;
    const finalPriority = classification.urgency === "urgent" ? "urgent" :
      classification.urgency === "high" ? "high" : queueInfo.priority;

    console.log(`Email classified: queue=${queueInfo.queue}, category=${finalCategory}, priority=${finalPriority}`);

    // ─── Find or create conversation ───
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
      conversationId = existingConversation.id;
      await supabase
        .from("inbox_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "open",
          priority: finalPriority,
          updated_at: new Date().toISOString(),
          subject: subject || existingConversation.subject,
        })
        .eq("id", conversationId);
      console.log("Updated conversation:", conversationId);
    } else {
      const { data: newConv, error: createError } = await supabase
        .from("inbox_conversations")
        .insert({
          channel: "email",
          region,
          user_email: senderEmail,
          user_name: senderName,
          status: "open",
          priority: finalPriority,
          subject: subject || "No subject",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      conversationId = newConv.id;
      console.log("Created conversation:", conversationId);
    }

    // ─── Attachment handling ───
    const attachmentUrls: string[] = [];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const { filename, content, contentType } = attachment;
          if (!content || !filename) continue;

          // Decode base64 attachment content
          const binaryData = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
          const filePath = `email-attachments/${conversationId}/${Date.now()}-${filename}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, binaryData, { contentType: contentType || "application/octet-stream" });

          if (uploadError) {
            console.warn("Attachment upload failed:", filename, uploadError.message);
          } else {
            const { data: urlData } = supabase.storage
              .from("chat-attachments")
              .getPublicUrl(filePath);
            attachmentUrls.push(urlData.publicUrl);
            console.log("Uploaded attachment:", filename);
          }
        } catch (e) {
          console.warn("Attachment processing error:", e);
        }
      }
    }

    // ─── Save message ───
    const messageId = emailHeaders?.["message-id"] || emailHeaders?.["Message-ID"] || null;
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
          queue: queueInfo.queue,
          category: finalCategory,
          classification_confidence: classification.confidence,
          priority: finalPriority,
          has_attachments: attachmentUrls.length > 0,
          attachment_count: attachmentUrls.length,
          attachment_urls: attachmentUrls,
        },
      });

    if (messageError) throw messageError;
    console.log("Email message saved successfully");

    // ─── Send auto-acknowledgment ───
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && finalCategory !== "auto_reply") {
      try {
        const ack = getAcknowledgmentHtml(finalCategory, senderName, conversationId);
        if (ack.subject) {
          const ackResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: formatSenderEmail("support"),
              to: [senderEmail.includes("<") ? senderEmail.match(/<(.+)>/)?.[1] || senderEmail : senderEmail],
              subject: ack.subject,
              html: ack.html,
            }),
          });

          if (ackResponse.ok) {
            console.log("Auto-acknowledgment sent for category:", finalCategory);
          } else {
            const errText = await ackResponse.text();
            console.warn("Ack email failed:", errText);
          }
        }
      } catch (ackErr) {
        console.warn("Auto-acknowledgment error:", ackErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, conversationId, category: finalCategory, priority: finalPriority }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Email webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

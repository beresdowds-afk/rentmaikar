import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_CONFIG, formatSenderEmail } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Attachment Validation ───
const ATTACHMENT_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB per file
  maxFiles: 10,
  allowedTypes: [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
  ],
  documentTypes: {
    "application/pdf": "document",
    "image/jpeg": "image", "image/png": "image", "image/gif": "image", "image/webp": "image",
    "application/msword": "document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
    "application/vnd.ms-excel": "spreadsheet", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
    "text/plain": "text", "text/csv": "spreadsheet",
  } as Record<string, string>,
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
  subCategory: string;
  confidence: number;
  urgency: "low" | "normal" | "high" | "urgent";
  requiresTicket: boolean;
  documentType: string | null;
}

function classifyEmailContent(subject: string, body: string, hasAttachments: boolean): ClassificationResult {
  const combined = `${subject} ${body}`.toUpperCase();

  // Emergency / Accident — highest priority
  if (/ACCIDENT|CRASH|EMERGENCY|TOWED|POLICE\s*REPORT|HIT\s*AND\s*RUN/i.test(combined)) {
    return { category: "emergency", subCategory: "incident", confidence: 0.95, urgency: "urgent", requiresTicket: true, documentType: null };
  }

  // Complaint / Escalation
  if (/COMPLAIN|TERRIBLE|UNACCEPTABLE|ANGRY|WORST|LAWYER|SUE|BBB|ATTORNEY|SCAM|FRAUD|STOLEN|DISSATISFIED|DISGUSTED/i.test(combined)) {
    return { category: "complaint", subCategory: "escalation", confidence: 0.9, urgency: "urgent", requiresTicket: true, documentType: null };
  }

  // Legal
  if (/LEGAL|SUBPOENA|COURT\s*ORDER|GDPR|DATA\s*REQUEST|PRIVACY\s*REQUEST|NDPR|CCPA|DELETE\s*MY\s*DATA/i.test(combined)) {
    return { category: "legal", subCategory: "inquiry", confidence: 0.85, urgency: "high", requiresTicket: true, documentType: null };
  }

  // Refund-specific (payment sub-category)
  if (/REFUND|OVERCHARG|DOUBLE\s*CHARGE|WRONG\s*AMOUNT|DISPUTE/i.test(combined)) {
    return { category: "payment_query", subCategory: "refund", confidence: 0.9, urgency: "high", requiresTicket: true, documentType: null };
  }

  // Payment general
  if (/PAYMENT|INVOICE|RECEIPT|CHARGE|BILLING|BALANCE|PAYOUT|WITHDRAW/i.test(combined)) {
    return { category: "payment_query", subCategory: "general", confidence: 0.85, urgency: "normal", requiresTicket: true, documentType: null };
  }

  // Document upload (especially with attachments)
  if (hasAttachments && /DOCUMENT|LICENSE|INSURANCE|REGISTRATION|UPLOAD|EXPIRED|RENEWAL|ATTACH/i.test(combined)) {
    return { category: "document_upload", subCategory: "submission", confidence: 0.9, urgency: "normal", requiresTicket: true, documentType: "user_document" };
  }
  if (/DOCUMENT|LICENSE|INSURANCE|REGISTRATION|EXPIRED|RENEWAL/i.test(combined)) {
    return { category: "document_upload", subCategory: "inquiry", confidence: 0.8, urgency: "normal", requiresTicket: true, documentType: null };
  }

  // Vehicle / Rental
  if (/VEHICLE|CAR|RENTAL|BOOKING|PICKUP|RETURN|EXTEND|MILEAGE|KEY|IGNITION/i.test(combined)) {
    return { category: "support_request", subCategory: "vehicle", confidence: 0.75, urgency: "normal", requiresTicket: true, documentType: null };
  }

  // IoT / Tracking
  if (/TRACKER|GPS|IoT|DEVICE|TRACKING|LOCATION|TELEMETRY/i.test(combined)) {
    return { category: "support_request", subCategory: "iot", confidence: 0.8, urgency: "normal", requiresTicket: true, documentType: null };
  }

  // Account issues
  if (/ACCOUNT|LOGIN|PASSWORD|RESET|VERIFY|EMAIL\s*CHANGE|PROFILE/i.test(combined)) {
    return { category: "support_request", subCategory: "account", confidence: 0.75, urgency: "normal", requiresTicket: true, documentType: null };
  }

  // General inquiry
  return { category: "general_inquiry", subCategory: "general", confidence: 0.5, urgency: "low", requiresTicket: false, documentType: null };
}

// ─── Auto-Reply Detection ───
function isAutoReply(headers: Record<string, string> | null, subject: string): boolean {
  if (!headers) return false;
  // Check standard auto-reply headers
  if (headers["auto-submitted"] && headers["auto-submitted"] !== "no") return true;
  if (headers["x-auto-response-suppress"]) return true;
  if (headers["precedence"] === "bulk" || headers["precedence"] === "junk") return true;
  // Check subject for auto-reply patterns
  if (/^(Auto:|Automatic reply|Out of office|OOO:)/i.test(subject)) return true;
  return false;
}

// ─── Estimated Response Time ───
function getEstimatedResponseTime(priority: string): string {
  switch (priority) {
    case "urgent": return "2 hours";
    case "high": return "4 hours";
    case "normal": return "24 hours";
    default: return "48 hours";
  }
}

// ─── Auto-Acknowledgment Templates ───
function getAcknowledgmentHtml(
  category: string,
  senderName: string,
  ticketId: string,
  attachmentsSummary: { accepted: number; rejected: string[] },
  responseTime: string,
): { subject: string; html: string } {
  const name = senderName.split(/[<@]/)[0].trim() || "there";
  const ref = ticketId.slice(0, 8).toUpperCase();

  // Attachment status section
  let attachmentHtml = "";
  if (attachmentsSummary.accepted > 0 || attachmentsSummary.rejected.length > 0) {
    attachmentHtml = `<div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:16px 0;">
      <strong>📎 Attachments:</strong><br/>`;
    if (attachmentsSummary.accepted > 0) {
      attachmentHtml += `<span style="color:#16a34a;">✓ ${attachmentsSummary.accepted} file(s) received successfully</span><br/>`;
    }
    for (const reason of attachmentsSummary.rejected) {
      attachmentHtml += `<span style="color:#dc2626;">✗ ${reason}</span><br/>`;
    }
    attachmentHtml += `</div>`;
  }

  const templates: Record<string, { subject: string; body: string }> = {
    complaint: {
      subject: `We've received your concern [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>We take your concerns very seriously. A senior support specialist has been assigned to your case and will respond within <strong>${responseTime}</strong>.</p>
        <p>Your reference number: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
    },
    emergency: {
      subject: `URGENT: Your emergency report [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>We've received your emergency report and our team has been <strong>immediately notified</strong>.</p>
        <p>If you need immediate assistance, please call:</p>
        <ul>
          <li>🇺🇸 USA: <strong>+1 (608) 384-3932</strong></li>
          <li>🇳🇬 Nigeria: <strong>+234 803 555 0123</strong></li>
        </ul>
        <p>Reference: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
    },
    legal: {
      subject: `Legal inquiry received [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>Your legal inquiry has been forwarded to our legal team at <strong>${EMAIL_CONFIG.legal}</strong>. We will respond within <strong>${responseTime}</strong>.</p>
        <p>Reference: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
    },
    payment_query: {
      subject: `Payment inquiry received [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>We've received your payment-related inquiry. Our billing team will review and respond within <strong>${responseTime}</strong>.</p>
        <p>Reference: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
    },
    document_upload: {
      subject: `Document submission received [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>We've received your document submission. Our verification team will review it within <strong>1-2 business days</strong>.</p>
        <p>Reference: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
    },
    support_request: {
      subject: `We received your message [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>Thank you for reaching out. A support agent will respond within <strong>${responseTime}</strong>.</p>
        <p>Reference: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
    },
    general_inquiry: {
      subject: `Thanks for contacting Rentmaikar [#${ref}]`,
      body: `<p>Hi ${name},</p>
        <p>We received your email and will get back to you as soon as possible.</p>
        <p>Reference: <strong>#${ref}</strong></p>
        ${attachmentHtml}`,
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
    const senderRaw = Array.isArray(from) ? from[0] : from;
    const recipientEmail = (Array.isArray(to) ? to[0] : to)?.toLowerCase() || "";
    let senderName = senderRaw;
    let senderAddress = senderRaw;
    const emailMatch = senderRaw.match(/^(.+?)\s*<(.+)>$/);
    if (emailMatch) {
      senderName = emailMatch[1].trim();
      senderAddress = emailMatch[2].trim();
    }

    // ─── Auto-reply / bounce detection ───
    if (isAutoReply(emailHeaders, subject || "")) {
      console.log("Ignoring auto-reply from:", senderAddress);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "auto_reply" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Queue routing by recipient ───
    const queueInfo = EMAIL_QUEUES[recipientEmail] || { queue: "support", priority: "normal", category: "support_request" };

    if (queueInfo.category === "auto_reply") {
      console.log("Ignoring noreply bounce from:", senderAddress);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Multi-recipient routing (handle CC / multiple To) ───
    const allRecipients = Array.isArray(to) ? to.map((t: string) => t.toLowerCase()) : [recipientEmail];
    const queuesHit = allRecipients
      .map((addr: string) => EMAIL_QUEUES[addr])
      .filter(Boolean);
    // Use highest priority queue if multiple matched
    const effectiveQueue = queuesHit.sort((a: typeof queueInfo, b: typeof queueInfo) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    })[0] || queueInfo;

    // ─── Region detection ───
    let region = "USA";
    if (recipientEmail.includes("nigeria") || recipientEmail.includes(".ng")) {
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

    // ─── Look up sender in profiles ───
    let userId: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("email", senderAddress)
      .limit(1)
      .single();
    if (profile) {
      userId = profile.user_id;
      if (!senderName || senderName === senderAddress) {
        senderName = profile.full_name || senderName;
      }
    }

    // ─── Content classification ───
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
    const classification = classifyEmailContent(subject || "", messageContent, !!hasAttachments);
    const finalCategory = classification.confidence > 0.7 ? classification.category : effectiveQueue.category;
    const finalPriority = classification.urgency === "urgent" ? "urgent" :
      classification.urgency === "high" ? "high" : effectiveQueue.priority;

    console.log(`Email classified: queue=${effectiveQueue.queue}, category=${finalCategory}, sub=${classification.subCategory}, priority=${finalPriority}, user=${userId || "unknown"}`);

    // ─── Find or create conversation ───
    const { data: existingConversation, error: findError } = await supabase
      .from("inbox_conversations")
      .select("*")
      .eq("user_email", senderAddress)
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
          user_id: userId || existingConversation.user_id,
        })
        .eq("id", conversationId);
      console.log("Updated conversation:", conversationId);
    } else {
      const { data: newConv, error: createError } = await supabase
        .from("inbox_conversations")
        .insert({
          channel: "email",
          region,
          user_email: senderAddress,
          user_name: senderName,
          user_id: userId,
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

    // ─── Attachment processing with validation ───
    interface ProcessedAttachment {
      filename: string;
      status: "accepted" | "rejected";
      reason?: string;
      url?: string;
      contentType?: string;
      size?: number;
      fileType?: string;
    }

    const processedAttachments: ProcessedAttachment[] = [];
    const attachmentUrls: string[] = [];

    if (hasAttachments) {
      const files = attachments.slice(0, ATTACHMENT_CONFIG.maxFiles);
      if (attachments.length > ATTACHMENT_CONFIG.maxFiles) {
        processedAttachments.push({
          filename: `(${attachments.length - ATTACHMENT_CONFIG.maxFiles} extra files)`,
          status: "rejected",
          reason: `Maximum ${ATTACHMENT_CONFIG.maxFiles} files allowed`,
        });
      }

      for (const attachment of files) {
        try {
          const { filename, content, contentType, size } = attachment;
          if (!content || !filename) continue;

          // Size validation
          const estimatedSize = size || Math.ceil(content.length * 0.75); // base64 to bytes estimate
          if (estimatedSize > ATTACHMENT_CONFIG.maxSizeBytes) {
            processedAttachments.push({
              filename,
              status: "rejected",
              reason: `File too large (max ${ATTACHMENT_CONFIG.maxSizeBytes / 1024 / 1024}MB)`,
            });
            console.warn(`Attachment rejected (too large): ${filename} (${estimatedSize} bytes)`);
            continue;
          }

          // Type validation
          const mimeType = (contentType || "application/octet-stream").split(";")[0].trim();
          if (!ATTACHMENT_CONFIG.allowedTypes.includes(mimeType)) {
            processedAttachments.push({
              filename,
              status: "rejected",
              reason: `File type not allowed: ${mimeType}`,
            });
            console.warn(`Attachment rejected (type): ${filename} (${mimeType})`);
            continue;
          }

          // Decode and upload
          const binaryData = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
          const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
          const filePath = `email-attachments/${conversationId}/${Date.now()}-${sanitizedFilename}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, binaryData, { contentType: mimeType });

          if (uploadError) {
            processedAttachments.push({ filename, status: "rejected", reason: `Upload failed: ${uploadError.message}` });
            console.warn("Upload failed:", filename, uploadError.message);
          } else {
            const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
            attachmentUrls.push(urlData.publicUrl);
            const fileType = ATTACHMENT_CONFIG.documentTypes[mimeType] || "other";
            processedAttachments.push({
              filename, status: "accepted", url: urlData.publicUrl,
              contentType: mimeType, size: estimatedSize, fileType,
            });
            console.log(`Attachment accepted: ${filename} (${fileType})`);
          }
        } catch (e) {
          console.warn("Attachment processing error:", e);
        }
      }
    }

    // ─── Save message ───
    const messageIdHeader = emailHeaders?.["message-id"] || emailHeaders?.["Message-ID"] || null;
    const { error: messageError } = await supabase
      .from("inbox_messages")
      .insert({
        conversation_id: conversationId,
        channel: "email",
        content: messageContent,
        sender_type: "user",
        sender_name: senderName,
        sender_id: userId,
        external_id: messageIdHeader,
        metadata: {
          subject,
          from: senderAddress,
          to: recipientEmail,
          all_recipients: allRecipients,
          queue: effectiveQueue.queue,
          category: finalCategory,
          sub_category: classification.subCategory,
          classification_confidence: classification.confidence,
          priority: finalPriority,
          requires_ticket: classification.requiresTicket,
          document_type: classification.documentType,
          has_attachments: attachmentUrls.length > 0,
          attachment_count: attachmentUrls.length,
          attachment_urls: attachmentUrls,
          attachments_detail: processedAttachments,
        },
      });

    if (messageError) throw messageError;

    // ─── Log to unified_message_log ───
    try {
      await supabase.from("unified_message_log").insert({
        user_id: userId,
        user_name: senderName,
        region,
        provider: "resend",
        direction: "inbound",
        message_type: finalCategory,
        message_body: messageContent.slice(0, 2000),
        delivery_status: "delivered",
        provider_message_id: messageIdHeader,
        conversation_id: conversationId,
        template_name: null,
        language: "en",
        metadata: { queue: effectiveQueue.queue, sub_category: classification.subCategory, attachments: processedAttachments.length },
      });
    } catch (logErr) {
      console.warn("Unified log insert error:", logErr);
    }

    console.log("Email message saved successfully");

    // ─── Notify support team for urgent/high priority ───
    if (finalPriority === "urgent" || finalPriority === "high") {
      try {
        await supabase.from("admin_daily_tasks").insert({
          category: finalCategory === "emergency" ? "incident" : "support",
          title: `${finalPriority.toUpperCase()} email: ${(subject || "No subject").slice(0, 80)}`,
          description: `From ${senderName} (${senderAddress}). Category: ${finalCategory}/${classification.subCategory}. Conversation: ${conversationId}`,
          priority: finalPriority === "urgent" ? "critical" : "high",
          source_table: "inbox_conversations",
          source_id: conversationId,
        });
        console.log("Admin task created for priority email");
      } catch (taskErr) {
        console.warn("Admin task creation error:", taskErr);
      }
    }

    // ─── Send auto-acknowledgment ───
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const responseTime = getEstimatedResponseTime(finalPriority);
        const attachmentsSummary = {
          accepted: processedAttachments.filter(a => a.status === "accepted").length,
          rejected: processedAttachments.filter(a => a.status === "rejected").map(a => `${a.filename}: ${a.reason}`),
        };
        const ack = getAcknowledgmentHtml(finalCategory, senderName, conversationId, attachmentsSummary, responseTime);
        if (ack.subject) {
          // Use the appropriate from address based on category
          const fromType = finalCategory === "legal" ? "legal" :
            finalCategory === "payment_query" ? "payments" : "support";

          const ackResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: formatSenderEmail(fromType as keyof typeof EMAIL_CONFIG),
              to: [senderAddress],
              subject: ack.subject,
              html: ack.html,
            }),
          });

          if (ackResponse.ok) {
            const ackResult = await ackResponse.json();
            console.log("Auto-acknowledgment sent:", ackResult.id);
            // Log outbound ack
            try {
              await supabase.from("unified_message_log").insert({
                user_id: userId,
                user_name: senderName,
                region,
                provider: "resend",
                direction: "outbound",
                message_type: "auto_acknowledgment",
                message_body: `Auto-ack for ${finalCategory} [#${conversationId.slice(0, 8)}]`,
                delivery_status: "sent",
                provider_message_id: ackResult.id,
                conversation_id: conversationId,
                template_name: `ack_${finalCategory}`,
                language: "en",
              });
            } catch (_) { /* non-critical */ }
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
      JSON.stringify({
        success: true,
        conversationId,
        category: finalCategory,
        subCategory: classification.subCategory,
        priority: finalPriority,
        attachments: {
          accepted: processedAttachments.filter(a => a.status === "accepted").length,
          rejected: processedAttachments.filter(a => a.status === "rejected").length,
        },
        userId,
      }),
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

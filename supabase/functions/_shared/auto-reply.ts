// Shared auto-reply engine for the unified inbox.
// Evaluates admin-configured keyword rules against an inbound message and,
// when a rule matches, sends the configured reply on the same channel.

type AnySupabase = any;

interface AutoReplyContext {
  conversationId: string;
  content: string;
  channel: string; // sms | whatsapp | email
  region?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
}

interface AutoReplyRule {
  id: string;
  name: string;
  keywords: string[];
  match_type: string; // any | all | exact
  canned_reply_id: string | null;
  reply_body: string | null;
  channel: string | null;
  region: string | null;
  priority: number;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  trigger_count: number;
}

function matches(rule: AutoReplyRule, text: string): boolean {
  const haystack = (text || "").toLowerCase().trim();
  if (!haystack) return false;
  const keywords = (rule.keywords || [])
    .map((k) => (k || "").toLowerCase().trim())
    .filter(Boolean);
  if (keywords.length === 0) return false;

  switch (rule.match_type) {
    case "exact":
      return keywords.some((k) => haystack === k);
    case "all":
      return keywords.every((k) => haystack.includes(k));
    case "any":
    default:
      return keywords.some((k) => haystack.includes(k));
  }
}

/**
 * Returns true when an auto-reply was sent.
 * Never throws — auto-reply failures must not break webhook ingestion.
 */
export async function maybeAutoReply(
  supabase: AnySupabase,
  ctx: AutoReplyContext,
): Promise<boolean> {
  try {
    const { data: rules, error } = await supabase
      .from("inbox_auto_reply_rules")
      .select(
        "id,name,keywords,match_type,canned_reply_id,reply_body,channel,region,priority,cooldown_minutes,last_triggered_at,trigger_count",
      )
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (error || !rules || rules.length === 0) return false;

    const now = Date.now();
    const rule = (rules as AutoReplyRule[]).find((r) => {
      if (r.channel && r.channel !== ctx.channel) return false;
      if (r.region && ctx.region && r.region !== ctx.region) return false;
      if (r.last_triggered_at && r.cooldown_minutes > 0) {
        const elapsedMin = (now - new Date(r.last_triggered_at).getTime()) / 60000;
        if (elapsedMin < r.cooldown_minutes) return false;
      }
      return matches(r, ctx.content);
    });

    if (!rule) return false;

    let body = rule.reply_body || "";
    if (!body && rule.canned_reply_id) {
      const { data: canned } = await supabase
        .from("inbox_canned_replies")
        .select("body")
        .eq("id", rule.canned_reply_id)
        .maybeSingle();
      body = canned?.body || "";
    }
    if (!body.trim()) return false;

    await supabase.from("inbox_messages").insert({
      conversation_id: ctx.conversationId,
      channel: ctx.channel,
      content: body,
      sender_type: "admin",
      sender_name: "Rentmaikar Auto-Reply",
      is_read: true,
      metadata: { auto_reply_rule_id: rule.id, auto_reply_rule_name: rule.name },
    });

    await supabase
      .from("inbox_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", ctx.conversationId);

    // Deliver on the originating channel.
    try {
      if ((ctx.channel === "sms" || ctx.channel === "whatsapp") && ctx.recipientPhone) {
        await supabase.functions.invoke("send-inbox-reply", {
          body: {
            conversationId: ctx.conversationId,
            messageContent: body,
            channel: ctx.channel,
            recipientPhone: ctx.recipientPhone,
            skipPersist: true,
          },
        });
      } else if (ctx.channel === "email" && ctx.recipientEmail) {
        await supabase.functions.invoke("send-email-reply", {
          body: {
            conversationId: ctx.conversationId,
            messageContent: body,
            recipientEmail: ctx.recipientEmail,
            skipPersist: true,
          },
        });
      }
    } catch (deliveryErr) {
      console.error("[auto-reply] delivery failed", deliveryErr);
    }

    await supabase
      .from("inbox_auto_reply_rules")
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: (rule.trigger_count || 0) + 1,
      })
      .eq("id", rule.id);

    return true;
  } catch (err) {
    console.error("[auto-reply] failed", err);
    return false;
  }
}

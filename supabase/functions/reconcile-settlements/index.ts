// deno-lint-ignore-file no-explicit-any
/**
 * Webhook-driven settlement reconciliation.
 *
 * For every completed payment it verifies the full downstream chain:
 *   subscription activation → wallet ledger entries → invoice → receipt →
 *   settlement audit row.
 *
 * Anything missing is repaired (re-run settlement, re-activate subscription),
 * then re-verified. Whatever is still broken raises an admin notification that
 * names the precise reason. When a subscription payment verifies clean, the
 * driver/owner gets the receipt email plus an activation confirmation with the
 * invoice link — exactly once per payment.
 *
 * Callers:
 *   - PSP webhooks (paystack/paypal/opay) right after settlement, with
 *     `x-internal-secret: CRON_SECRET` and `{ payment_id }`
 *   - the reconciliation cron / admin UI with `{ since_hours, limit }`
 */
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({
  payment_id: z.string().uuid().optional(),
  since_hours: z.number().int().min(1).max(720).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  repair: z.boolean().optional(),
  notify: z.boolean().optional(),
});

const APP_URL = "https://rentmaikar.com";

interface Report {
  payment_id: string;
  ok: boolean;
  issues: string[];
  repaired: string[];
  purpose?: string;
}

async function isAdmin(supa: any, userId: string) {
  const { data } = await supa.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: any) => r.role === "admin" || r.role === "admin_assistant");
}

async function verify(supa: any, paymentId: string) {
  const { data, error } = await supa.rpc("verify_payment_settlement", { _payment_id: paymentId });
  if (error) throw new Error(`verify failed: ${error.message}`);
  return data as { ok: boolean; issues: string[]; skipped?: boolean; [k: string]: any };
}

async function notifyAdmins(supa: any, payment: any, issues: string[]) {
  const { data: admins } = await supa.from("user_roles").select("user_id").eq("role", "admin");
  const reason = issues.join(", ");
  const rows = (admins ?? []).map((a: any) => ({
    recipient_id: a.user_id,
    kind: payment.purpose?.startsWith("subscription_")
      ? "subscription_settlement_incomplete"
      : "payment_settlement_incomplete",
    title: payment.purpose?.startsWith("subscription_")
      ? "Subscription payment settled but not fully provisioned"
      : "Payment settled but settlement records are incomplete",
    body: `Payment ${payment.id} (${payment.currency} ${payment.amount}, ${payment.purpose}) failed reconciliation: ${reason}`,
    related_user_id: payment.driver_id,
    metadata: {
      payment_id: payment.id,
      user_id: payment.driver_id,
      purpose: payment.purpose,
      plan_id: payment.subscription_plan_id,
      issues,
      reason,
    },
  }));
  if (rows.length) await supa.from("admin_notifications").insert(rows);
}

/** Resolve the payer's email address. */
async function payerEmail(supa: any, userId: string): Promise<{ email?: string; name?: string; region?: string }> {
  const { data: p } = await supa
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (p?.email) return { email: p.email, name: p.full_name ?? undefined };
  const { data: u } = await supa.auth.admin.getUserById(userId);
  return { email: u?.user?.email ?? undefined, name: p?.full_name ?? undefined };
}

/** One-shot guard so retries never re-send the same confirmation. */
async function alreadySent(supa: any, paymentId: string) {
  const { data } = await supa
    .from("admin_audit_log")
    .select("id")
    .eq("action", "subscription_confirmation_sent")
    .eq("target_table", "payments")
    .eq("target_id", paymentId)
    .maybeSingle();
  return Boolean(data);
}

async function sendConfirmation(supa: any, payment: any, report: any) {
  if (await alreadySent(supa, payment.id)) return;

  const { email, name, region } = await payerEmail(supa, payment.driver_id);
  if (!email) return;

  const { data: plan } = payment.subscription_plan_id
    ? await supa.from("subscription_plans").select("name, plan_type, billing_interval")
        .eq("id", payment.subscription_plan_id).maybeSingle()
    : { data: null };

  const { data: sub } = report.subscription_id
    ? await supa.from("user_subscriptions").select("started_at, expires_at")
        .eq("id", report.subscription_id).maybeSingle()
    : { data: null };

  const period = sub
    ? `${new Date(sub.started_at).toLocaleDateString()} – ${sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "ongoing"}`
    : "active now";

  // 1. Receipt email (renders and mails the receipt document).
  try {
    await supa.functions.invoke("billing-portal", {
      headers: { "x-internal-secret": Deno.env.get("CRON_SECRET") ?? "" },
      body: { action: "auto_send_receipt_for_payment", payment_id: payment.id },
    });
  } catch (e) {
    console.error("[reconcile-settlements] receipt email failed", payment.id, e);
  }

  // 2. Activation confirmation with the invoice link.
  const body = [
    `${name ? name + "," : "Hello,"} your ${plan?.name ?? "subscription"} is now active.`,
    `Amount paid: ${payment.currency} ${Number(payment.amount).toFixed(2)}.`,
    `Coverage period: ${period}.`,
    report.invoice_id ? `Invoice reference: ${report.invoice_id}.` : "",
    "Your invoice and receipt are available in your billing history.",
  ].filter(Boolean).join(" ");

  const { error } = await supa.functions.invoke("send-outbound-email", {
    body: {
      action: "send",
      to: email,
      templateName: "event_notification",
      category: "payment",
      priority: "high",
      country: region,
      data: {
        title: `${plan?.name ?? "Subscription"} activated`,
        body,
        category: "subscription_activation",
        status: "active",
        recordId: report.invoice_id ?? payment.id,
        deepLink: `${APP_URL}/billing`,
      },
    },
  });
  if (error) {
    console.error("[reconcile-settlements] confirmation email failed", payment.id, error);
    return;
  }

  await supa.from("admin_audit_log").insert({
    admin_id: "00000000-0000-0000-0000-000000000000",
    action: "subscription_confirmation_sent",
    target_table: "payments",
    target_id: payment.id,
    details: { invoice_id: report.invoice_id, subscription_id: report.subscription_id, email_domain: email.split("@")[1] },
  });
}

async function reconcileOne(supa: any, payment: any, opts: { repair: boolean; notify: boolean }): Promise<Report> {
  const repaired: string[] = [];
  let report = await verify(supa, payment.id);
  if (report.skipped) return { payment_id: payment.id, ok: true, issues: [], repaired, purpose: payment.purpose };

  if (opts.repair && !report.ok) {
    const issues = report.issues ?? [];

    if (issues.includes("not_settled") || issues.includes("missing_wallet_ledger_entries") ||
        issues.includes("missing_invoice") || issues.includes("missing_settlement_audit_row")) {
      const { error } = await supa.rpc("settle_payment_financials", {
        _payment_id: payment.id,
        _provider: payment.payment_method ?? null,
        _provider_reference: payment.transaction_id ?? null,
      });
      if (error) console.error("[reconcile-settlements] settle repair failed", payment.id, error.message);
      else repaired.push("settlement_rerun");
    }

    if (issues.includes("subscription_not_active") && payment.subscription_plan_id) {
      const { error } = await supa.rpc("activate_user_subscription", {
        _user_id: payment.driver_id,
        _plan_id: payment.subscription_plan_id,
        _payment_reference: payment.transaction_id ?? payment.id,
        _payment_method: payment.payment_method ?? "unknown",
      });
      if (error) console.error("[reconcile-settlements] activation repair failed", payment.id, error.message);
      else repaired.push("subscription_activated");
    }

    report = await verify(supa, payment.id);
  }

  const issues: string[] = report.issues ?? [];

  if (report.ok && payment.purpose?.startsWith("subscription_")) {
    await sendConfirmation(supa, payment, report);
  }

  if (!report.ok && opts.notify) {
    await notifyAdmins(supa, payment, issues);
  }

  return { payment_id: payment.id, ok: Boolean(report.ok), issues, repaired, purpose: payment.purpose };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth: internal secret (webhooks/cron) OR an admin JWT.
    const internal = req.headers.get("x-internal-secret");
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    let authorized = Boolean(cronSecret) && internal === cronSecret;
    if (!authorized) {
      const auth = req.headers.get("Authorization") ?? "";
      if (!auth.startsWith("Bearer ")) return json({ error: "Unauthenticated" }, 401);
      const { data: u } = await supa.auth.getUser(auth.replace("Bearer ", ""));
      if (!u?.user) return json({ error: "Unauthenticated" }, 401);
      authorized = await isAdmin(supa, u.user.id);
      if (!authorized) return json({ error: "Forbidden" }, 403);
    }

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { payment_id, since_hours = 24, limit = 100, repair = true, notify = true } = parsed.data;

    const select = "id, driver_id, owner_id, amount, currency, purpose, status, payment_method, transaction_id, subscription_plan_id, settled_at";
    let payments: any[] = [];
    if (payment_id) {
      const { data } = await supa.from("payments").select(select).eq("id", payment_id).maybeSingle();
      if (data) payments = [data];
    } else {
      const since = new Date(Date.now() - since_hours * 3600_000).toISOString();
      const { data } = await supa.from("payments").select(select)
        .eq("status", "completed").gte("created_at", since)
        .order("created_at", { ascending: false }).limit(limit);
      payments = data ?? [];
    }

    const reports: Report[] = [];
    for (const p of payments) {
      try {
        reports.push(await reconcileOne(supa, p, { repair, notify }));
      } catch (e) {
        console.error("[reconcile-settlements] payment failed", p.id, e);
        reports.push({
          payment_id: p.id, ok: false, repaired: [], purpose: p.purpose,
          issues: [`reconciliation_error: ${e instanceof Error ? e.message : "unknown"}`],
        });
      }
    }

    return json({
      ok: true,
      checked: reports.length,
      failed: reports.filter((r) => !r.ok).length,
      repaired: reports.filter((r) => r.repaired.length > 0).length,
      reports,
    });
  } catch (e) {
    console.error("[reconcile-settlements] error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

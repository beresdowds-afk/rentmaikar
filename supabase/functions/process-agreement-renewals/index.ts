import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const results = {
    renewed: 0,
    alerted_7day: 0,
    alerted_3day: 0,
    expired_blocked: 0,
    errors: [] as string[],
  };

  try {
    // ─── 1. Fetch all active/pending_signatures compulsory agreements ───
    const { data: agreements, error: fetchErr } = await supabase
      .from("legal_agreements")
      .select(`
        id, driver_id, owner_id, vehicle_id, status, expires_at, renewal_count,
        agreement_content, is_compulsory, renewal_notified_at,
        driver_signature, owner_signature, admin_witness_signature, admin_witnessed_at, admin_witness_id
      `)
      .in("status", ["active", "pending_signatures"])
      .eq("is_compulsory", true)
      .not("expires_at", "is", null);

    if (fetchErr) throw fetchErr;

    for (const ag of agreements ?? []) {
      const expiresAt = new Date(ag.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);

      try {
        // ─── Fetch party profiles ───
        const [{ data: driverProfile }, { data: ownerProfile }] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("user_id", ag.driver_id).single(),
          supabase.from("profiles").select("full_name, email").eq("user_id", ag.owner_id).single(),
        ]);

        const driverName = driverProfile?.full_name ?? "Driver";
        const driverEmail = driverProfile?.email;
        const ownerName = ownerProfile?.full_name ?? "Owner";
        const ownerEmail = ownerProfile?.email;

        // ─── 7-day warning ───
        if (daysUntilExpiry === 7) {
          const alreadySent = await alertAlreadySent(supabase, ag.id, "7_day_warning");
          if (!alreadySent) {
            await sendRenewalWarningEmail({ driverEmail, driverName, ownerEmail, ownerName, daysUntilExpiry, agreementId: ag.id, expiresAt });
            await logAlert(supabase, ag.id, "7_day_warning", { driver: driverEmail, owner: ownerEmail });
            results.alerted_7day++;
          }
        }

        // ─── 3-day warning ───
        if (daysUntilExpiry === 3) {
          const alreadySent = await alertAlreadySent(supabase, ag.id, "3_day_warning");
          if (!alreadySent) {
            await sendRenewalWarningEmail({ driverEmail, driverName, ownerEmail, ownerName, daysUntilExpiry, agreementId: ag.id, expiresAt });
            await logAlert(supabase, ag.id, "3_day_warning", { driver: driverEmail, owner: ownerEmail });
            results.alerted_3day++;
          }
        }

        // ─── Expired — auto-renew with new 30-day period ───
        if (daysUntilExpiry <= 0) {
          const alreadyRenewed = await alertAlreadySent(supabase, ag.id, "renewed");
          if (!alreadyRenewed) {
            const newExpiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();
            const renewalNumber = (ag.renewal_count ?? 0) + 1;
            const newContent = buildRenewalContent(ag.agreement_content, renewalNumber, newExpiresAt);

            // Create new renewal agreement
            const { data: newAg, error: insertErr } = await supabase
              .from("legal_agreements")
              .insert({
                driver_id: ag.driver_id,
                owner_id: ag.owner_id,
                vehicle_id: ag.vehicle_id,
                agreement_content: newContent,
                status: "pending_signatures",
                is_compulsory: true,
                renewal_count: renewalNumber,
                expires_at: newExpiresAt,
                parent_agreement_id: ag.id,
                admin_witness_id: ag.admin_witness_id,
                admin_witness_signature: ag.admin_witness_signature,
                admin_witnessed_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (insertErr) throw insertErr;

            // Mark old agreement as superseded
            await supabase
              .from("legal_agreements")
              .update({ status: "superseded" })
              .eq("id", ag.id);

            // Log renewal
            await logAlert(supabase, newAg!.id, "renewed", { driver: driverEmail, owner: ownerEmail });

            // Notify parties
            await sendRenewalCreatedEmail({ driverEmail, driverName, ownerEmail, ownerName, renewalNumber, newExpiresAt, newAgreementId: newAg!.id });

            results.renewed++;
          }
        }

        // ─── Overdue — block operations (pending_signatures past expiry) ───
        if (ag.status === "pending_signatures" && daysUntilExpiry <= -3) {
          const alreadyBlocked = await alertAlreadySent(supabase, ag.id, "expired");
          if (!alreadyBlocked) {
            await sendExpiredBlockEmail({ driverEmail, driverName, ownerEmail, ownerName, agreementId: ag.id });
            await logAlert(supabase, ag.id, "expired", { driver: driverEmail, owner: ownerEmail });
            results.expired_blocked++;
          }
        }

      } catch (agErr: unknown) {
        const msg = agErr instanceof Error ? agErr.message : String(agErr);
        results.errors.push(`Agreement ${ag.id}: ${msg}`);
        console.error(`Error processing agreement ${ag.id}:`, msg);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("process-agreement-renewals fatal error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

async function alertAlreadySent(supabase: ReturnType<typeof createClient>, agreementId: string, alertType: string): Promise<boolean> {
  const { data } = await supabase
    .from("agreement_renewal_alerts")
    .select("id")
    .eq("agreement_id", agreementId)
    .eq("alert_type", alertType)
    .maybeSingle();
  return !!data;
}

async function logAlert(supabase: ReturnType<typeof createClient>, agreementId: string, alertType: string, sentTo: Record<string, string | undefined>) {
  await supabase.from("agreement_renewal_alerts").insert({
    agreement_id: agreementId,
    alert_type: alertType,
    sent_to: sentTo,
  });
}

function buildRenewalContent(originalContent: string, renewalNumber: number, newExpiresAt: string): string {
  const renewalDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const expiryDate = new Date(newExpiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `RENEWAL #${renewalNumber} — Effective: ${renewalDate} | Expires: ${expiryDate}\n\nThis agreement is a mandatory 30-day renewal of the original rental contract. All original terms remain in effect.\n\n---\n\n${originalContent}`;
}

interface EmailParams {
  driverEmail?: string | null;
  driverName: string;
  ownerEmail?: string | null;
  ownerName: string;
  daysUntilExpiry: number;
  agreementId: string;
  expiresAt: Date;
}

async function sendRenewalWarningEmail(params: EmailParams) {
  const { driverEmail, driverName, ownerEmail, ownerName, daysUntilExpiry, agreementId, expiresAt } = params;
  const expiryFormatted = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const urgencyColor = daysUntilExpiry <= 3 ? "#dc2626" : "#d97706";
  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#1a1a2e;padding:25px;border-radius:10px 10px 0 0;text-align:center;">
  <h1 style="color:#fff;margin:0;">RentMaiKar</h1>
  <p style="color:#a0a0a0;margin:8px 0 0 0;">Agreement Renewal Notice</p>
</div>
<div style="background:#fff;padding:25px;border:1px solid #e0e0e0;border-top:none;">
  <div style="background:${urgencyColor}15;border-left:4px solid ${urgencyColor};padding:15px;margin-bottom:20px;border-radius:4px;">
    <strong style="color:${urgencyColor};">⚠️ Agreement Expiring in ${daysUntilExpiry} Day${daysUntilExpiry !== 1 ? "s" : ""}</strong>
    <p style="margin:5px 0 0 0;color:#555;">Your rental agreement requires renewal by <strong>${expiryFormatted}</strong>.</p>
  </div>
  <p>Dear ${driverName} &amp; ${ownerName},</p>
  <p>Your <strong>compulsory 30-day rental agreement</strong> is expiring soon. A new agreement will be automatically generated on the expiry date. Please ensure all parties sign the renewal promptly to avoid service interruption.</p>
  <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#666;"><strong>Agreement ID:</strong> ${agreementId}</p>
    <p style="margin:5px 0 0 0;font-size:13px;color:#666;"><strong>Expiry Date:</strong> ${expiryFormatted}</p>
  </div>
  <div style="text-align:center;margin-top:25px;">
    <a href="https://rentmaikar.lovable.app" style="background:#1a1a2e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:5px;font-weight:bold;">View Dashboard & Sign</a>
  </div>
</div>
<div style="background:#f9f9f9;padding:15px;text-align:center;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
  <p style="margin:0;color:#999;font-size:12px;">Automated notice from RentMaiKar • support@rentmaikar.com</p>
</div>
</body></html>`;

  const recipients = [driverEmail, ownerEmail].filter(Boolean) as string[];
  if (recipients.length > 0) {
    await resend.emails.send({
      from: "RentMaiKar Agreements <agreements@resend.dev>",
      to: recipients,
      subject: `⚠️ Action Required: Agreement Expiring in ${daysUntilExpiry} Days`,
      html,
    });
  }
}

interface RenewalCreatedParams {
  driverEmail?: string | null;
  driverName: string;
  ownerEmail?: string | null;
  ownerName: string;
  renewalNumber: number;
  newExpiresAt: string;
  newAgreementId: string;
}

async function sendRenewalCreatedEmail(params: RenewalCreatedParams) {
  const { driverEmail, driverName, ownerEmail, ownerName, renewalNumber, newExpiresAt, newAgreementId } = params;
  const expiryFormatted = new Date(newExpiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#1a1a2e;padding:25px;border-radius:10px 10px 0 0;text-align:center;">
  <h1 style="color:#fff;margin:0;">RentMaiKar</h1>
  <p style="color:#a0a0a0;margin:8px 0 0 0;">Agreement Auto-Renewed</p>
</div>
<div style="background:#fff;padding:25px;border:1px solid #e0e0e0;border-top:none;">
  <div style="background:#d1fae515;border-left:4px solid #10b981;padding:15px;margin-bottom:20px;border-radius:4px;">
    <strong style="color:#10b981;">✓ Renewal #${renewalNumber} Auto-Generated</strong>
    <p style="margin:5px 0 0 0;color:#555;">A new 30-day agreement has been created and is awaiting your signatures.</p>
  </div>
  <p>Dear ${driverName} &amp; ${ownerName},</p>
  <p>Your rental agreement has been automatically renewed for another 30-day period as part of our <strong>compulsory renewal policy</strong>. All original terms remain in full effect.</p>
  <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#666;"><strong>New Agreement ID:</strong> ${newAgreementId}</p>
    <p style="margin:5px 0 0 0;font-size:13px;color:#666;"><strong>Renewal #:</strong> ${renewalNumber}</p>
    <p style="margin:5px 0 0 0;font-size:13px;color:#666;"><strong>Valid Until:</strong> ${expiryFormatted}</p>
  </div>
  <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:12px;border-radius:4px;margin:20px 0;">
    <strong style="color:#d97706;">⚡ Action Required</strong>
    <p style="margin:5px 0 0 0;color:#555;font-size:13px;">Please log in and sign the renewal agreement promptly to maintain uninterrupted access.</p>
  </div>
  <div style="text-align:center;margin-top:25px;">
    <a href="https://rentmaikar.lovable.app" style="background:#1a1a2e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:5px;font-weight:bold;">Sign Renewal Agreement</a>
  </div>
</div>
<div style="background:#f9f9f9;padding:15px;text-align:center;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
  <p style="margin:0;color:#999;font-size:12px;">Automated notice from RentMaiKar • support@rentmaikar.com</p>
</div>
</body></html>`;

  const recipients = [driverEmail, ownerEmail].filter(Boolean) as string[];
  if (recipients.length > 0) {
    await resend.emails.send({
      from: "RentMaiKar Agreements <agreements@resend.dev>",
      to: recipients,
      subject: `📋 Agreement Renewal #${renewalNumber} — Action Required`,
      html,
    });
  }
}

interface ExpiredBlockParams {
  driverEmail?: string | null;
  driverName: string;
  ownerEmail?: string | null;
  ownerName: string;
  agreementId: string;
}

async function sendExpiredBlockEmail(params: ExpiredBlockParams) {
  const { driverEmail, driverName, ownerEmail, ownerName, agreementId } = params;
  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#1a1a2e;padding:25px;border-radius:10px 10px 0 0;text-align:center;">
  <h1 style="color:#fff;margin:0;">RentMaiKar</h1>
</div>
<div style="background:#fff;padding:25px;border:1px solid #e0e0e0;border-top:none;">
  <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:15px;margin-bottom:20px;border-radius:4px;">
    <strong style="color:#dc2626;">🚨 Agreement Expired — Unsigned</strong>
    <p style="margin:5px 0 0 0;color:#555;">The renewal agreement has not been signed and service may be impacted.</p>
  </div>
  <p>Dear ${driverName} &amp; ${ownerName},</p>
  <p>The compulsory rental agreement renewal has <strong>expired without signatures</strong>. Please sign immediately to avoid further service disruption. Contact support@rentmaikar.com if you need assistance.</p>
  <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#666;"><strong>Agreement ID:</strong> ${agreementId}</p>
  </div>
  <div style="text-align:center;margin-top:25px;">
    <a href="https://rentmaikar.lovable.app" style="background:#dc2626;color:#fff;padding:12px 28px;text-decoration:none;border-radius:5px;font-weight:bold;">Sign Now — Urgent</a>
  </div>
</div>
<div style="background:#f9f9f9;padding:15px;text-align:center;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
  <p style="margin:0;color:#999;font-size:12px;">Automated notice from RentMaiKar • support@rentmaikar.com</p>
</div>
</body></html>`;

  const recipients = [driverEmail, ownerEmail].filter(Boolean) as string[];
  if (recipients.length > 0) {
    await resend.emails.send({
      from: "RentMaiKar Agreements <agreements@resend.dev>",
      to: recipients,
      subject: "🚨 URGENT: Rental Agreement Expired — Immediate Signature Required",
      html,
    });
  }
}

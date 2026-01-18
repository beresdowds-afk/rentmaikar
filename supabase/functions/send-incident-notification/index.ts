import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncidentNotificationRequest {
  incidentId: string;
  incidentType: 'accident' | 'maintenance' | 'breakdown' | 'theft' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vehicleId: string;
  driverId: string;
  ownerId?: string;
  title: string;
  description: string;
  isIotDetected: boolean;
  isLateReport: boolean;
  location?: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "admin@rentmaikar.com";

const getSeverityEmoji = (severity: string): string => {
  const emojis: Record<string, string> = {
    low: '🟡',
    medium: '🟠',
    high: '🔴',
    critical: '🚨',
  };
  return emojis[severity] || '⚪';
};

const getTypeEmoji = (type: string): string => {
  const emojis: Record<string, string> = {
    accident: '💥',
    maintenance: '🔧',
    breakdown: '🚗',
    theft: '🚨',
    other: '📋',
  };
  return emojis[type] || '📋';
};

const sendEmailNotification = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!RESEND_API_KEY) {
    console.log('[IncidentNotification] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Rentmaikar <notifications@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();
    console.log('[IncidentNotification] Email sent:', result);
    return response.ok;
  } catch (error) {
    console.error('[IncidentNotification] Email error:', error);
    return false;
  }
};

const sendSmsNotification = async (
  phone: string,
  message: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        phone,
        channel: 'sms',
        notificationType: 'general',
        customMessage: message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[IncidentNotification] SMS error:', error);
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: IncidentNotificationRequest = await req.json();

    console.log("[IncidentNotification] Processing incident:", body.incidentId);

    const sevEmoji = getSeverityEmoji(body.severity);
    const typeEmoji = getTypeEmoji(body.incidentType);
    const lateWarning = body.isLateReport ? '⚠️ LATE REPORT (>1 hour after occurrence)' : '';
    const iotBadge = body.isIotDetected ? '🤖 IoT Detected' : '👤 Driver Reported';

    // Fetch driver info
    const { data: driverProfile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('user_id', body.driverId)
      .maybeSingle();

    // Fetch owner info if available
    let ownerProfile = null;
    if (body.ownerId) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('user_id', body.ownerId)
        .maybeSingle();
      ownerProfile = data;
    }

    // Fetch admin emails
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminEmails: string[] = [];
    if (adminUsers) {
      for (const admin of adminUsers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', admin.user_id)
          .maybeSingle();
        if (profile?.email) {
          adminEmails.push(profile.email);
        }
      }
    }

    // Build email content
    const emailSubject = `${sevEmoji} ${typeEmoji} ${body.incidentType.toUpperCase()} Report - Vehicle Incident`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${body.severity === 'critical' ? '#dc2626' : body.severity === 'high' ? '#ea580c' : '#f59e0b'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${sevEmoji} Vehicle Incident Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">${iotBadge}</p>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          ${body.isLateReport ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              <strong style="color: #dc2626;">⚠️ LATE REPORT</strong>
              <p style="margin: 4px 0 0 0; color: #991b1b; font-size: 14px;">
                This incident was reported more than 1 hour after it occurred.
              </p>
            </div>
          ` : ''}
          
          <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h2 style="margin: 0 0 12px 0; color: #1f2937;">${typeEmoji} ${body.title}</h2>
            <p style="color: #6b7280; margin: 0;">${body.description}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: white; padding: 12px; border-radius: 8px;">
              <strong style="color: #6b7280; font-size: 12px;">SEVERITY</strong>
              <p style="margin: 4px 0 0 0; font-weight: bold; text-transform: uppercase;">${body.severity}</p>
            </div>
            <div style="background: white; padding: 12px; border-radius: 8px;">
              <strong style="color: #6b7280; font-size: 12px;">TYPE</strong>
              <p style="margin: 4px 0 0 0; font-weight: bold; text-transform: uppercase;">${body.incidentType}</p>
            </div>
          </div>
          
          <div style="background: white; padding: 16px; border-radius: 8px; margin-top: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #1f2937;">Driver Information</h3>
            <p style="margin: 0; color: #6b7280;">
              <strong>Name:</strong> ${driverProfile?.full_name || 'Unknown'}<br>
              <strong>Email:</strong> ${driverProfile?.email || 'N/A'}<br>
              <strong>Phone:</strong> ${driverProfile?.phone || 'N/A'}
            </p>
          </div>
          
          ${body.location ? `
            <div style="background: white; padding: 16px; border-radius: 8px; margin-top: 16px;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937;">📍 Location</h3>
              <p style="margin: 0; color: #6b7280;">${body.location}</p>
            </div>
          ` : ''}
        </div>
        
        <div style="background: #1f2937; color: white; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            Log in to your admin dashboard to view full details and respond to this incident.
          </p>
        </div>
      </div>
    `;

    // Build SMS message
    const smsMessage = `${sevEmoji} RENTMAIKAR INCIDENT\n\n${typeEmoji} ${body.incidentType.toUpperCase()}: ${body.title}\n\nSeverity: ${body.severity}\nDriver: ${driverProfile?.full_name || 'Unknown'}\n${body.isLateReport ? '\n⚠️ LATE REPORT' : ''}\n\nCheck dashboard for details.`;

    const results = {
      adminEmailsSent: 0,
      ownerEmailSent: false,
      smsSent: 0,
    };

    // Send to admins
    for (const email of adminEmails) {
      const sent = await sendEmailNotification(email, emailSubject, emailHtml);
      if (sent) results.adminEmailsSent++;
    }

    // Send to owner
    if (ownerProfile?.email) {
      results.ownerEmailSent = await sendEmailNotification(ownerProfile.email, emailSubject, emailHtml);
    }

    // Send SMS for critical/high severity
    if (body.severity === 'critical' || body.severity === 'high') {
      if (ownerProfile?.phone) {
        const sent = await sendSmsNotification(ownerProfile.phone, smsMessage, supabaseUrl, supabaseServiceKey);
        if (sent) results.smsSent++;
      }
    }

    console.log("[IncidentNotification] Notifications sent:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[IncidentNotification] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

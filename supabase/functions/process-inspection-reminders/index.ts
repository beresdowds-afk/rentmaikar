import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sendNotification = async (
  phone: string,
  message: string,
  channel: 'sms' | 'whatsapp',
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
      body: JSON.stringify({ phone, channel, notificationType: 'general', customMessage: message }),
    });
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`[InspectionReminders] Failed to send ${channel}:`, error);
    return false;
  }
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return null;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Rentmaikar <noreply@rentmaikar.com>", to: [to], subject, html }),
    });
    return response.ok ? response.json() : null;
  } catch { return null; }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[InspectionReminders] Starting quarterly inspection reminder batch...");

    // Find vehicles with inspection_expiry within the next 30 days
    const today = new Date();
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(today.getDate() + 30);

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate, owner_id, inspection_expiry')
      .not('inspection_expiry', 'is', null)
      .lte('inspection_expiry', thirtyDaysOut.toISOString().split('T')[0])
      .gte('inspection_expiry', today.toISOString().split('T')[0]);

    if (error) throw new Error(`Failed to fetch vehicles: ${error.message}`);

    console.log(`[InspectionReminders] Found ${vehicles?.length || 0} vehicles due for inspection`);

    const results = { notified: 0, errors: [] as string[] };

    for (const vehicle of vehicles || []) {
      if (!vehicle.owner_id) continue;

      // Dedup: check if we already sent an inspection reminder for this vehicle this quarter
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      const { data: existing } = await supabase
        .from('expiry_notifications')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .eq('notification_type', 'inspection')
        .gte('created_at', quarterStart.toISOString())
        .maybeSingle();

      if (existing) continue;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, email, notification_sms, notification_whatsapp, notification_email')
        .eq('user_id', vehicle.owner_id)
        .single();

      if (!profile) continue;

      const firstName = profile.full_name?.split(' ')[0] || 'Owner';
      const vehicleName = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
      const plateNumber = vehicle.license_plate || '';

      const message = `🔧 Inspection Due – Rentmaikar\n\nHi ${firstName}, your vehicle ${vehicleName} (${plateNumber}) is due for inspection.\n\nInspection expiry: ${vehicle.inspection_expiry}\n\nSchedule your inspection now to avoid rental interruption.\n\nReply *HELP* for assistance.`;

      if (profile.phone && profile.notification_whatsapp) {
        await sendNotification(profile.phone, message, 'whatsapp', supabaseUrl, supabaseKey);
      }
      if (profile.phone && profile.notification_sms) {
        await sendNotification(profile.phone, `Rentmaikar: ${vehicleName} (${plateNumber}) is due for inspection by ${vehicle.inspection_expiry}. Schedule now to avoid interruption.`, 'sms', supabaseUrl, supabaseKey);
      }
      if (profile.email && profile.notification_email) {
        await sendEmail(profile.email, `🔧 Vehicle Inspection Due – ${vehicleName}`,
          `<h2>Vehicle Inspection Reminder</h2>
          <p>Hi ${firstName},</p>
          <p>Your vehicle <strong>${vehicleName} (${plateNumber})</strong> is due for inspection.</p>
          <p><strong>Inspection expiry:</strong> ${vehicle.inspection_expiry}</p>
          <p>Please schedule your inspection now to avoid any rental interruptions.</p>`
        );
      }

      // Log notification
      await supabase.from('expiry_notifications').insert({
        vehicle_id: vehicle.id,
        notification_type: 'inspection',
        recipient_type: 'owner',
        recipient_id: vehicle.owner_id,
        days_until_expiry: Math.ceil((new Date(vehicle.inspection_expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        notification_channel: 'multi',
      });

      results.notified++;
    }

    console.log("[InspectionReminders] Complete:", results);

    return new Response(JSON.stringify({ success: true, results, timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("[InspectionReminders Error]", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);

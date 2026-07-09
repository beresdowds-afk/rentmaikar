import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  vehicleUnlockedMessage,
  paymentSuccessMessage,
} from "../_shared/whatsapp-templates.ts";
import { 
import { requireCronSecret } from "../_shared/cron-auth.ts";
  vehicleUnlockedEmail,
  paymentReceiptEmail,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Payment-to-Unlock Latency Guarantee: < 30 seconds
const UNLOCK_LATENCY_GUARANTEE_MS = 30000;

interface PaymentConfirmation {
  transactionId: string;
  driverId: string;
  amount: number;
  currency: 'USD' | 'NGN';
  paymentMethod: string;
  vehicleId?: string;
}

const sendWhatsAppMessage = async (to: string, message: string) => {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio credentials not configured");
    return null;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append("To", `whatsapp:${to}`);
  formData.append("From", `whatsapp:${fromNumber}`);
  formData.append("Body", message);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  return response.json();
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return null;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Rentmaikar <noreply@rentmaikar.com>",
      to: [to],
      subject,
      html,
    }),
  });

  return response.json();
};

const sendIoTUnlockCommand = async (vehicleId: string, deviceId: string) => {
  // This would integrate with AWS IoT Core or your GPS device API
  // For now, we log the command and update device status
  console.log(`[IoT Unlock] Sending unlock command to device ${deviceId} for vehicle ${vehicleId}`);
  
  // In production, this would be:
  // await fetch(`https://your-iot-endpoint/devices/${deviceId}/command`, {
  //   method: 'POST',
  //   body: JSON.stringify({ command: 'UNLOCK', reason: 'payment_received' })
  // });
  
  return { success: true, timestamp: new Date().toISOString() };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const cronDenied = requireCronSecret(req);
  if (cronDenied) return cronDenied;

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payment: PaymentConfirmation = await req.json();

    console.log(`[Payment Unlock] Processing payment ${payment.transactionId} for driver ${payment.driverId}`);

    // Step 1: Resolve any active payment defaults
    const { data: activeDefaults, error: defaultsError } = await supabase
      .from("payment_defaults")
      .select("*")
      .eq("driver_id", payment.driverId)
      .eq("status", "active");

    if (defaultsError) {
      throw new Error(`Failed to fetch defaults: ${defaultsError.message}`);
    }

    // Step 2: Get driver profile for notifications
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", payment.driverId)
      .single();

    // Step 3: Get vehicle and IoT device info
    let vehicleInfo = null;
    let deviceInfo = null;

    if (payment.vehicleId || activeDefaults?.[0]?.vehicle_id) {
      const vehicleId = payment.vehicleId || activeDefaults?.[0]?.vehicle_id;
      
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("*, iot_devices(*)")
        .eq("id", vehicleId)
        .single();
      
      if (vehicle) {
        vehicleInfo = vehicle;
        // Get linked IoT device
        const { data: device } = await supabase
          .from("iot_devices")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .eq("is_linked", true)
          .single();
        
        deviceInfo = device;
      }
    }

    // Step 4: If vehicle was locked, send unlock command IMMEDIATELY
    const wasLocked = activeDefaults?.some(d => d.deactivation_eligible);
    
    if (wasLocked && deviceInfo) {
      console.log(`[Payment Unlock] Vehicle was locked, sending unlock command...`);
      
      // Send IoT unlock command - THIS IS TIME-CRITICAL
      const unlockResult = await sendIoTUnlockCommand(deviceInfo.vehicle_id, deviceInfo.id);
      
      // Update device status
      await supabase
        .from("iot_devices")
        .update({ 
          status: "active",
          notes: `Unlocked after payment ${payment.transactionId} at ${new Date().toISOString()}`
        })
        .eq("id", deviceInfo.id);

      console.log(`[Payment Unlock] Unlock command sent in ${Date.now() - startTime}ms`);
    }

    // Step 5: Resolve all active defaults
    if (activeDefaults && activeDefaults.length > 0) {
      await supabase
        .from("payment_defaults")
        .update({ 
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .in("id", activeDefaults.map(d => d.id));

      console.log(`[Payment Unlock] Resolved ${activeDefaults.length} payment defaults`);
    }

    // Step 6: Calculate unlock latency
    const unlockLatency = Date.now() - startTime;
    const withinGuarantee = unlockLatency < UNLOCK_LATENCY_GUARANTEE_MS;

    console.log(`[Payment Unlock] Total unlock latency: ${unlockLatency}ms (Guarantee: ${withinGuarantee ? 'MET' : 'EXCEEDED'})`);

    // Step 7: Send notifications (async, after unlock is complete)
    const notificationPromises: Promise<any>[] = [];

    if (profile?.phone && profile?.notification_whatsapp) {
      // Send vehicle unlocked message if it was locked
      if (wasLocked) {
        notificationPromises.push(
          sendWhatsAppMessage(profile.phone, vehicleUnlockedMessage())
        );
      } else {
        // Just send payment success
        notificationPromises.push(
          sendWhatsAppMessage(profile.phone, paymentSuccessMessage())
        );
      }
    }

    if (profile?.email && profile?.notification_email) {
      // Send receipt email
      const vehicleName = vehicleInfo 
        ? `${vehicleInfo.make || ''} ${vehicleInfo.model || ''}`.trim() 
        : 'Vehicle';
      
      const receiptEmail = paymentReceiptEmail({
        firstName: profile.full_name?.split(' ')[0] || 'Driver',
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: new Date().toLocaleDateString(),
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        vehicleName,
        periodStart: new Date().toLocaleDateString(),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      });

      notificationPromises.push(
        sendEmail(profile.email, receiptEmail.subject, receiptEmail.html)
      );

      // If was locked, also send unlock confirmation email
      if (wasLocked) {
        const unlockEmail = vehicleUnlockedEmail({
          firstName: profile.full_name?.split(' ')[0] || 'Driver',
          vehicleName,
          unlockTime: new Date().toLocaleString(),
        });
        notificationPromises.push(
          sendEmail(profile.email, unlockEmail.subject, unlockEmail.html)
        );
      }
    }

    // Fire notifications (don't wait for them)
    Promise.all(notificationPromises).catch(err => {
      console.error("[Payment Unlock] Notification error:", err);
    });

    // Log audit trail
    if (deviceInfo) {
      await supabase.from("device_activity_log").insert({
        device_id: deviceInfo.id,
        action: "UNLOCK",
        performed_by: payment.driverId,
        details: {
          reason: "payment_received",
          transaction_id: payment.transactionId,
          amount: payment.amount,
          currency: payment.currency,
          unlock_latency_ms: unlockLatency,
          within_guarantee: withinGuarantee,
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        vehicleUnlocked: wasLocked,
        unlockLatencyMs: unlockLatency,
        withinGuarantee,
        defaultsResolved: activeDefaults?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[Payment Unlock Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

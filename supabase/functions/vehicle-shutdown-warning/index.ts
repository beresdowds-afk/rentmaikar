import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORT_NUMBER = "+16083843932";

/**
 * Vehicle Shutdown Warning
 * 
 * CRITICAL priority — called when a vehicle is flagged for shutdown.
 * Two flows based on vehicle status:
 * 
 * 1. Vehicle MOVING: Urgent pull-over warning
 *    Press 1 → Confirm pulled over (check telemetry, proceed to parked flow)
 *    Press 2 → Emergency assistance
 *
 * 2. Vehicle PARKED: 5-minute countdown warning
 *    Press 1 → Dispute shutdown (log for admin)
 *    Press 2 → Speak to agent
 *    Auto-shutdown after countdown if no payment
 */

interface ShutdownRequest {
  vehicleId: string;
  driverId: string;
  reason: string;
  vehicleMoving?: boolean;
  defaultId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || SUPPORT_NUMBER;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Twilio credentials not configured");
    }

    // Parse request — can be triggered by process-payment-defaults or IoT system
    const body: ShutdownRequest = await req.json();
    const { vehicleId, driverId, reason, vehicleMoving, defaultId } = body;

    if (!vehicleId || !driverId) {
      return new Response(
        JSON.stringify({ error: "vehicleId and driverId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch driver profile
    const { data: driverProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .eq('user_id', driverId)
      .maybeSingle();

    if (!driverProfile?.phone) {
      return new Response(
        JSON.stringify({ error: "Driver phone not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch vehicle info
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('make, model, year, license_plate')
      .eq('id', vehicleId)
      .maybeSingle();

    const vehicleInfo = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : 'your vehicle';

    // Check IoT telemetry for vehicle status if not provided
    let isMoving = vehicleMoving;
    if (isMoving === undefined) {
      const { data: device } = await supabase
        .from('iot_devices')
        .select('latitude, longitude, last_ping, status')
        .eq('vehicle_id', vehicleId)
        .eq('is_linked', true)
        .maybeSingle();

      // If no device or no recent ping, assume parked for safety
      isMoving = false;
      if (device?.last_ping) {
        const lastPingAge = Date.now() - new Date(device.last_ping).getTime();
        // If ping is recent (< 2 min) and device is active, check further
        // For now, we rely on the caller to pass vehicleMoving
        if (lastPingAge < 120000 && device.status === 'active') {
          // Without speed data in current schema, assume parked if ping is recent
          isMoving = false;
        }
      }
    }

    // Generate appropriate TwiML based on vehicle status
    let twiml: string;
    const sanitizedReason = reason.replace(/[<>]/g, '').slice(0, 200);

    if (isMoving) {
      // VEHICLE MOVING: Pull-over warning — no auto-shutdown
      twiml = `<Response>
        <Gather numDigits="1" action="${supabaseUrl}/functions/v1/shutdown-warning-ivr?vehicleId=${vehicleId}&driverId=${driverId}&defaultId=${defaultId || ''}&state=moving" method="POST" timeout="15">
          <Say voice="alice">
            URGENT WARNING. This is Rentmaikar with a critical alert regarding ${vehicleInfo}.
            Your vehicle has been flagged for shutdown due to: ${sanitizedReason}.
            For your safety, please pull over to a safe location immediately.
            Press 1 when you have pulled over safely.
            Press 2 if you need emergency assistance.
          </Say>
        </Gather>
        <Say voice="alice">
          Please pull over safely as soon as possible. Your vehicle will not be disabled while in motion.
          We will call you again shortly. Goodbye.
        </Say>
      </Response>`;
    } else {
      // VEHICLE PARKED: Countdown warning with dispute option
      twiml = `<Response>
        <Gather numDigits="1" action="${supabaseUrl}/functions/v1/shutdown-warning-ivr?vehicleId=${vehicleId}&driverId=${driverId}&defaultId=${defaultId || ''}&state=parked" method="POST" timeout="30">
          <Say voice="alice">
            CRITICAL WARNING. This is Rentmaikar. Your vehicle, ${vehicleInfo}, will be disabled in 5 minutes due to: ${sanitizedReason}.
            Press 1 to dispute this shutdown.
            Press 2 to speak with a support agent immediately.
          </Say>
          <Pause length="10"/>
          <Say voice="alice">
            You have 4 minutes remaining. Press 1 to dispute or Press 2 for an agent.
          </Say>
          <Pause length="10"/>
          <Say voice="alice">
            3 minutes remaining. This is your final opportunity to take action.
          </Say>
        </Gather>
        <Say voice="alice">
          No input received. The shutdown will proceed as scheduled. Contact support for assistance. Goodbye.
        </Say>
      </Response>`;
    }

    // Create call record
    const { data: callRecord, error: callError } = await supabase
      .from('voip_calls')
      .insert({
        initiated_by: driverId,
        call_type: 'individual',
        region: driverProfile.phone.startsWith('+234') ? 'Nigeria' : 'USA',
        status: 'pending',
        direction: 'outbound',
        started_at: new Date().toISOString(),
        duration_seconds: 0,
        caller_role: 'system',
      })
      .select()
      .single();

    if (callError) throw new Error(`Call record failed: ${callError.message}`);

    // Make Twilio call — CRITICAL priority, no machine detection delay
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const callResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: driverProfile.phone,
        From: twilioPhoneNumber,
        Twiml: twiml,
        StatusCallback: `${supabaseUrl}/functions/v1/voip-status-callback`,
      }),
    });

    const callData = await callResponse.json();

    if (callResponse.ok) {
      await supabase.from('voip_calls')
        .update({ call_sid: callData.sid, status: 'ringing' })
        .eq('id', callRecord.id);

      // Also send SMS alert simultaneously
      try {
        const smsUrl = `${supabaseUrl}/functions/v1/send-sms-notification`;
        await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            phone: driverProfile.phone,
            channel: 'sms',
            notificationType: 'general',
            customMessage: `⚠️ URGENT: ${vehicleInfo} flagged for shutdown: ${sanitizedReason}. ${isMoving ? 'Pull over safely immediately.' : 'Vehicle will be disabled in 5 minutes.'} Call ${SUPPORT_NUMBER} for help.`,
          }),
        });
      } catch (smsErr) {
        console.error("Shutdown warning SMS failed:", smsErr);
      }

      // Notify admins
      await supabase.from('admin_daily_tasks').insert({
        title: `🚨 Shutdown warning issued: ${vehicleInfo}`,
        description: `Vehicle ${vehicleId} (${vehicleInfo}) flagged for shutdown. Reason: ${sanitizedReason}. Driver: ${driverProfile.full_name} (${driverProfile.phone}). Status: ${isMoving ? 'MOVING' : 'PARKED'}. Call SID: ${callData.sid}.`,
        category: 'vehicle_emergency',
        priority: 'urgent',
      });

      return new Response(JSON.stringify({
        success: true,
        callSid: callData.sid,
        vehicleStatus: isMoving ? 'moving' : 'parked',
        callRecordId: callRecord.id,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      await supabase.from('voip_calls')
        .update({ status: 'failed' })
        .eq('id', callRecord.id);

      throw new Error(`Twilio call failed: ${callData.message}`);
    }
  } catch (error: any) {
    console.error("Error in vehicle-shutdown-warning:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

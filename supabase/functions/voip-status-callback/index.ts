import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCallPriority,
  getRegionFromPhone,
  getRetryDecision,
  getNextDayRetryTimestamp,
  CHANNEL_ESCALATION,
  type CallPriority,
} from "../_shared/call-strategy.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map Twilio call statuses to our statuses
const statusMap: Record<string, string> = {
  'queued': 'pending',
  'ringing': 'ringing',
  'in-progress': 'in-progress',
  'completed': 'completed',
  'busy': 'busy',
  'failed': 'failed',
  'no-answer': 'no-answer',
  'canceled': 'canceled',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data from Twilio
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    const to = formData.get('To') as string;

    console.log('VoIP Status Callback:', { callSid, callStatus, duration, to });

    if (!callSid) {
      return new Response('Missing CallSid', { status: 400 });
    }

    const mappedStatus = statusMap[callStatus] || callStatus;

    // Update call record
    const updateData: Record<string, any> = {
      status: mappedStatus,
    };

    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer' || callStatus === 'canceled') {
      updateData.ended_at = new Date().toISOString();
      if (duration) {
        updateData.duration_seconds = parseInt(duration, 10);
      }
    }

    if (callStatus === 'in-progress') {
      // Get recording URL if available
      const recordingUrl = formData.get('RecordingUrl') as string;
      if (recordingUrl) {
        updateData.recording_url = recordingUrl;
      }
    }

    // Find and update call by SID
    const { error: updateError } = await supabase
      .from('voip_calls')
      .update(updateData)
      .eq('call_sid', callSid);

    if (updateError) {
      console.error('Error updating call:', updateError);
    }

    // Update participant status
    if (to) {
      const participantStatus = callStatus === 'in-progress' ? 'connected' : 
                                callStatus === 'completed' ? 'disconnected' :
                                callStatus === 'ringing' ? 'ringing' : 'failed';

      const participantUpdate: Record<string, any> = {
        status: participantStatus,
      };

      if (callStatus === 'in-progress') {
        participantUpdate.joined_at = new Date().toISOString();
      } else if (callStatus === 'completed' || callStatus === 'failed') {
        participantUpdate.left_at = new Date().toISOString();
      }

      // Find call by SID first
      const { data: callData } = await supabase
        .from('voip_calls')
        .select('id')
        .eq('call_sid', callSid)
        .single();

      if (callData) {
        await supabase
          .from('voip_call_participants')
          .update(participantUpdate)
          .eq('call_id', callData.id)
          .eq('phone_number', to);
      }
    }

    // ─── SMART RETRY & ESCALATION LOGIC ───
    if (callStatus === 'busy' || callStatus === 'no-answer') {
      const { data: callRecord } = await supabase
        .from('voip_calls')
        .select('id, initiated_by, region, caller_role, receiver_role, receiver_id, call_type')
        .eq('call_sid', callSid)
        .single();

      if (callRecord) {
        // Count existing attempts in last 24h for this user+type
        const { count: attemptCount } = await supabase
          .from('voip_calls')
          .select('id', { count: 'exact', head: true })
          .eq('initiated_by', callRecord.initiated_by)
          .eq('receiver_id', callRecord.receiver_id)
          .gte('created_at', new Date(Date.now() - 86400000).toISOString());

        const currentAttempt = attemptCount || 1;
        const priority = getCallPriority(callRecord.call_type || 'medium');
        const region = callRecord.region || getRegionFromPhone(to || '');
        const decision = getRetryDecision(currentAttempt, priority, region);

        console.log(`[VoIP Callback] Retry decision for ${callSid}:`, {
          attempt: currentAttempt,
          priority,
          region,
          decision,
        });

        if (decision.shouldRetry) {
          if (decision.shouldEscalateChannel && decision.nextChannel) {
            // Escalate to alternate channel (SMS/WhatsApp/Email)
            const channel = decision.nextChannel.fallback;
            console.log(`[VoIP Callback] Escalating to ${channel} for ${callSid}`);
            
            if (channel === 'sms' || channel === 'whatsapp') {
              const smsUrl = `${supabaseUrl}/functions/v1/send-sms-notification`;
              await fetch(smsUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  phone: to,
                  channel: channel,
                  notificationType: 'general',
                  customMessage: `We tried to reach you by phone regarding your Rentmaikar account. Please call us back or reply HELP for assistance.`,
                }),
              });
            }
            // For email escalation, the calling function handles it
          }

          if (decision.shouldScheduleNextDay) {
            // Schedule retry for next day at start of calling hours
            const retryAt = getNextDayRetryTimestamp(region);
            console.log(`[VoIP Callback] Scheduling next-day retry at ${retryAt}`);
            await supabase.from('voip_calls').insert({
              initiated_by: callRecord.initiated_by,
              call_type: callRecord.call_type || 'individual',
              region: callRecord.region,
              status: 'pending',
              direction: 'outbound',
              caller_role: callRecord.caller_role,
              receiver_id: callRecord.receiver_id,
              receiver_role: callRecord.receiver_role,
              started_at: retryAt,
            });
          } else if (decision.retryDelayMs !== null) {
            // Schedule retry with calculated delay
            const retryAt = new Date(Date.now() + decision.retryDelayMs).toISOString();
            console.log(`[VoIP Callback] Scheduling retry in ${decision.retryDelayMs / 60000}min at ${retryAt}`);
            await supabase.from('voip_calls').insert({
              initiated_by: callRecord.initiated_by,
              call_type: callRecord.call_type || 'individual',
              region: callRecord.region,
              status: 'pending',
              direction: 'outbound',
              caller_role: callRecord.caller_role,
              receiver_id: callRecord.receiver_id,
              receiver_role: callRecord.receiver_role,
              started_at: retryAt,
            });
          }
        } else {
          console.log(`[VoIP Callback] All retries exhausted for ${callSid} (${priority} priority)`);
        }
      }
    }

    // ─── POST-CALL SUMMARY SMS ───
    if (callStatus === 'completed' && to && duration) {
      try {
        const durationSec = parseInt(duration, 10);
        if (durationSec > 5) { // Only for meaningful calls (>5s)
          const smsUrl = `${supabaseUrl}/functions/v1/send-sms-notification`;
          await fetch(smsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              phone: to,
              channel: 'sms',
              notificationType: 'general',
              customMessage: `Thank you for your call with Rentmaikar (${Math.ceil(durationSec / 60)} min). If you need further assistance, reply HELP or call us back.`,
            }),
          });
          console.log(`[VoIP Callback] Post-call SMS sent to ${to}`);
        }
      } catch (smsErr) {
        console.error('[VoIP Callback] Post-call SMS failed:', smsErr);
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error in voip-status-callback:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

serve(handler);

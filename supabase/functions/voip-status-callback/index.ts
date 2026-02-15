import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error in voip-status-callback:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

serve(handler);

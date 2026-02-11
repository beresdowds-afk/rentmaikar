import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  phoneNumber: string;
  displayName?: string;
  userId?: string;
}

interface CallRequest {
  callType: 'individual' | 'group';
  region: 'USA' | 'Nigeria';
  recipients: Recipient[];
  groupId?: string;
}

const TWILIO_NUMBERS = {
  USA: Deno.env.get('TWILIO_PHONE_NUMBER') || '+16083843932',
  Nigeria: Deno.env.get('TWILIO_PHONE_NUMBER_NG') || '+16083843932', // Same number for now
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CallRequest = await req.json();
    const { callType, region, recipients } = body;

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one recipient is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = TWILIO_NUMBERS[region];

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create call record in database
    const { data: callRecord, error: callError } = await supabase
      .from('voip_calls')
      .insert({
        initiated_by: user.id,
        call_type: callType,
        region: region,
        status: 'pending',
        direction: 'outbound',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating call record:', callError);
      return new Response(
        JSON.stringify({ error: 'Failed to create call record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For group calls, create a conference
    const isConference = callType === 'group' || recipients.length > 1;
    const conferenceName = isConference ? `RentMaikar_${callRecord.id}` : null;

    // Initiate calls to each recipient via Twilio
    const callResults = [];
    for (const recipient of recipients) {
      try {
        // Determine recipient region from phone number
        const recipientRegion = recipient.phoneNumber.startsWith('+234') ? 'Nigeria' : 'USA';

        // Build TwiML for the call
        let twiml;
        if (isConference) {
          twiml = `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`;
        } else {
          twiml = `<Response><Say>Connecting you to RentMaikar support.</Say><Dial>${recipient.phoneNumber}</Dial></Response>`;
        }

        // Make the Twilio API call
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
        const formData = new URLSearchParams();
        formData.append('To', recipient.phoneNumber);
        formData.append('From', fromNumber);
        formData.append('Twiml', twiml);
        
        // Enable call recording
        formData.append('Record', 'true');
        formData.append('RecordingStatusCallback', `${supabaseUrl}/functions/v1/recording-status-callback`);
        formData.append('RecordingStatusCallbackEvent', 'completed');
        
        // Add status callback for call updates
        const callbackUrl = `${supabaseUrl}/functions/v1/voip-status-callback`;
        formData.append('StatusCallback', callbackUrl);
        formData.append('StatusCallbackEvent', 'initiated ringing answered completed');

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        const twilioData = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error('Twilio error:', twilioData);
          callResults.push({
            recipient: recipient.phoneNumber,
            success: false,
            error: twilioData.message || 'Twilio call failed',
          });
          continue;
        }

        // Add participant record
        await supabase
          .from('voip_call_participants')
          .insert({
            call_id: callRecord.id,
            user_id: recipient.userId || null,
            phone_number: recipient.phoneNumber,
            participant_type: 'recipient',
            display_name: recipient.displayName,
            region: recipientRegion,
            status: 'ringing',
          });

        callResults.push({
          recipient: recipient.phoneNumber,
          success: true,
          callSid: twilioData.sid,
        });

      } catch (err: any) {
        console.error('Error calling recipient:', recipient.phoneNumber, err);
        callResults.push({
          recipient: recipient.phoneNumber,
          success: false,
          error: err?.message || 'Unknown error',
        });
      }
    }

    // Update call status
    const successfulCalls = callResults.filter(r => r.success);
    const newStatus = successfulCalls.length > 0 ? 'ringing' : 'failed';
    
    await supabase
      .from('voip_calls')
      .update({ 
        status: newStatus,
        call_sid: successfulCalls[0]?.callSid || null,
      })
      .eq('id', callRecord.id);

    return new Response(
      JSON.stringify({
        success: successfulCalls.length > 0,
        callId: callRecord.id,
        results: callResults,
        conferenceName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in initiate-voip-call:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);

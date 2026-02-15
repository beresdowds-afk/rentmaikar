import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getRegionConfig, getFromNumber, checkRateLimit, checkGlobalRateLimit } from "../_shared/sms-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotificationType = 
  | "verification_code" 
  | "price_approved" 
  | "price_rejected" 
  | "price_counter_offer" 
  | "price_locked"
  | "payment_reminder"
  | "general";

type Channel = "sms" | "whatsapp";

interface SMSNotificationRequest {
  phone: string; // Full international format e.g., +12025550123
  channel: Channel;
  notificationType: NotificationType;
  name?: string;
  verificationCode?: string;
  vehicleInfo?: string;
  amount?: number;
  currency?: string;
  customMessage?: string;
}

// From numbers sourced from shared sms-config.ts via getFromNumber()

const isValidPhone = (phone: string): boolean => {
  // Basic international phone format validation
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const sanitizeString = (input: string): string => {
  return input.replace(/[<>]/g, '').trim().slice(0, 200);
};

const getCurrencySymbol = (currency: string): string => {
  return currency === 'NGN' ? '₦' : '$';
};

const getMessageContent = (data: SMSNotificationRequest): string => {
  const { notificationType, name, verificationCode, vehicleInfo, amount, currency, customMessage } = data;
  const safeName = name ? sanitizeString(name) : 'User';
  const safeVehicle = vehicleInfo ? sanitizeString(vehicleInfo) : 'your vehicle';
  const sym = currency ? getCurrencySymbol(currency) : '$';
  
  switch (notificationType) {
    case 'verification_code':
      return `Rentmaikar: Your verification code is ${verificationCode}. This code expires in 10 minutes. Do not share this code with anyone.`;
      
    case 'price_approved':
      return `Rentmaikar: Great news, ${safeName}! Your price request for ${safeVehicle} has been approved at ${sym}${amount}. Log in to view details.`;
      
    case 'price_rejected':
      return `Rentmaikar: Hi ${safeName}, your price request for ${safeVehicle} was not approved. Please log in to submit a new request.`;
      
    case 'price_counter_offer':
      return `Rentmaikar: Hi ${safeName}, you've received a counter offer of ${sym}${amount} for ${safeVehicle}. Log in to respond.`;
      
    case 'price_locked':
      return `Rentmaikar: Your rate for ${safeVehicle} is now locked at ${sym}${amount}. Contact support if you need changes.`;
      
    case 'payment_reminder':
      return `Rentmaikar: Reminder - Your payment of ${sym}${amount} is due. Please log in to complete your payment.`;
      
    case 'general':
      return customMessage ? `Rentmaikar: ${sanitizeString(customMessage)}` : 'Rentmaikar: You have a new notification. Please log in to view details.';
      
    default:
      return 'Rentmaikar: You have a new notification. Please log in to view details.';
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Security: Verify service role key authorization
  const authHeader = req.headers.get('Authorization');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!authHeader || !supabaseServiceKey) {
    console.error('Missing authorization header or service key');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Check if the authorization includes the service role key (Bearer token)
  const token = authHeader.replace('Bearer ', '');
  if (token !== supabaseServiceKey) {
    console.error('Invalid authorization - service role key mismatch');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const body: SMSNotificationRequest = await req.json();
    
    // Log request for audit (mask phone number)
    console.log('SMS request:', {
      timestamp: new Date().toISOString(),
      phone: body.phone ? body.phone.substring(0, 6) + '****' : 'none',
      channel: body.channel,
      type: body.notificationType,
    });
    
    // Validate phone
    if (!body.phone || !isValidPhone(body.phone)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone number format. Use international format (e.g., +12025550123)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Rate limiting ───
    const region = body.phone.startsWith('+234') ? 'NIGERIA' : 'USA';
    if (!checkGlobalRateLimit() || !checkRateLimit(region)) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limited. Try again shortly." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const regionConfig = getRegionConfig(body.phone);
    const isNigeria = body.phone.startsWith('+234');
    const message = getMessageContent(body);

    if (isNigeria) {
      // ─── TERMII (Nigeria) ───
      const termiiApiKey = Deno.env.get("TERMII_API_KEY");

      if (!termiiApiKey) {
        console.error("Termii credentials not configured for Nigeria");
        throw new Error("Nigeria SMS service not configured");
      }

      const isWhatsApp = body.channel === 'whatsapp';
      const termiiChannel = isWhatsApp ? 'whatsapp' : 'generic';

      console.log(`Sending ${body.channel.toUpperCase()} via Termii to ${body.phone}: ${body.notificationType}`);

      const termiiResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: body.phone.replace('+', ''),
          from: regionConfig.senderId,
          sms: message,
          type: 'plain',
          channel: termiiChannel,
          api_key: termiiApiKey,
        }),
      });

      const termiiData = await termiiResponse.json();

      if (!termiiResponse.ok || termiiData.code !== 'ok') {
        console.error("Termii API error:", termiiData);
        throw new Error(termiiData.message || `Failed to send ${body.channel} via Termii`);
      }

      console.log(`${body.channel.toUpperCase()} sent via Termii:`, termiiData.message_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: termiiData.message_id,
          channel: body.channel,
          provider: 'termii',
          region: 'NIGERIA',
        }), 
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── TWILIO (USA / Default) ───
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    
    if (!accountSid || !authToken) {
      console.error("Twilio credentials not configured");
      throw new Error("SMS service not configured");
    }

    const isWhatsApp = body.channel === 'whatsapp';
    const mainNumber = getFromNumber(body.phone, 'main');
    const fromNumber = isWhatsApp ? `whatsapp:${mainNumber}` : mainNumber;
    const toNumber = isWhatsApp ? `whatsapp:${body.phone}` : body.phone;

    console.log(`Sending ${body.channel.toUpperCase()} via Twilio to ${body.phone}: ${body.notificationType}`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = btoa(`${accountSid}:${authToken}`);
    
    const formData = new URLSearchParams();

    // Use Messaging Service SID if available
    if (regionConfig.messagingServiceSid && !isWhatsApp) {
      formData.append('MessagingServiceSid', regionConfig.messagingServiceSid);
    } else {
      formData.append('From', fromNumber);
    }

    formData.append('To', toNumber);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio API error:", responseData);
      throw new Error(responseData.message || `Failed to send ${body.channel}`);
    }

    console.log(`${body.channel.toUpperCase()} sent via Twilio:`, responseData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.sid,
        channel: body.channel,
        provider: 'twilio',
        region: 'USA',
        segments: responseData.num_segments || 1,
      }), 
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-sms-notification function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

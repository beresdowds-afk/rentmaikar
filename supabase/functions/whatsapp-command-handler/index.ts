import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * WhatsApp Command Handler for Self-Service
 * 
 * Handles incoming WhatsApp messages from Twilio webhook
 * Commands supported:
 * - PAY / PAYMENT -> Request payment link
 * - STATUS -> Check payment status
 * - HELP -> Get support options
 * - OK / DONE -> Confirm actions
 * - 1, 2, 3, 4 -> Support menu navigation
 */

interface TwilioWebhookBody {
  From: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  To: string;
  ProfileName?: string;
}

const normalizeCommand = (message: string): string => {
  const cleaned = message.trim().toUpperCase();
  
  // Payment commands
  if (['PAY', 'PAYMENT', 'PAY NOW', 'MAKE PAYMENT'].includes(cleaned)) {
    return 'PAY';
  }
  
  // Status commands
  if (['STATUS', 'CHECK', 'CHECK STATUS', 'BALANCE'].includes(cleaned)) {
    return 'STATUS';
  }
  
  // Help commands
  if (['HELP', 'SUPPORT', 'PROBLEM', 'ISSUE', 'MENU'].includes(cleaned)) {
    return 'HELP';
  }
  
  // Confirmation commands
  if (['OK', 'OKAY', 'YES', 'DONE', 'CONFIRMED'].includes(cleaned)) {
    return 'OK';
  }
  
  // Menu options
  if (['1', '2', '3', '4'].includes(cleaned)) {
    return `MENU_${cleaned}`;
  }
  
  return 'UNKNOWN';
};

const callSelfServicePayment = async (
  phone: string,
  action: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; data?: unknown }> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/self-service-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ phone, action }),
    });

    return await response.json();
  } catch (error) {
    console.error('[WhatsAppHandler] Self-service call failed:', error);
    return { success: false };
  }
};

const sendWhatsAppResponse = async (
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
        channel: 'whatsapp',
        notificationType: 'general',
        customMessage: message,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[WhatsAppHandler] Response send failed:', error);
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
    
    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const body: TwilioWebhookBody = {
      From: formData.get('From') as string || '',
      Body: formData.get('Body') as string || '',
      MessageSid: formData.get('MessageSid') as string || '',
      AccountSid: formData.get('AccountSid') as string || '',
      To: formData.get('To') as string || '',
      ProfileName: formData.get('ProfileName') as string || undefined,
    };

    // Extract phone number (remove whatsapp: prefix)
    const phone = body.From.replace('whatsapp:', '');
    const message = body.Body;
    const command = normalizeCommand(message);

    console.log(`[WhatsAppHandler] Received from ${phone}: "${message}" -> Command: ${command}`);

    let responseMessage = '';

    switch (command) {
      case 'PAY':
        await callSelfServicePayment(phone, 'request_link', supabaseUrl, supabaseServiceKey);
        // Response is sent by self-service-payment function
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 200, headers: { "Content-Type": "application/xml", ...corsHeaders } }
        );

      case 'STATUS':
        await callSelfServicePayment(phone, 'check_status', supabaseUrl, supabaseServiceKey);
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 200, headers: { "Content-Type": "application/xml", ...corsHeaders } }
        );

      case 'HELP':
        responseMessage = `🛠 *Rentmaikar Support*

What do you need help with?

Reply with:
1️⃣ - Booking issue
2️⃣ - Payment issue
3️⃣ - Vehicle issue
4️⃣ - Talk to human

Or type:
*PAY* - Get payment link
*STATUS* - Check payment status`;
        break;

      case 'MENU_1':
        responseMessage = `📋 *Booking Support*

For booking issues:
• Check your dashboard for booking details
• Reply *PAY* if you need to make a payment
• Reply *4* to speak with support

Visit: https://rentmaikar.lovable.app/driver/dashboard`;
        break;

      case 'MENU_2':
        responseMessage = `💳 *Payment Support*

Reply *PAY* to get your secure payment link.
Reply *STATUS* to check your payment status.

For other payment issues, reply *4* to speak with our team.`;
        break;

      case 'MENU_3':
        responseMessage = `🚗 *Vehicle Support*

For vehicle issues:
• Accidents: Report immediately via app
• Breakdowns: Contact support
• Lockout: Check payment status first

Reply *STATUS* or *4* for urgent help.`;
        break;

      case 'MENU_4':
        responseMessage = `👨‍💼 *Connecting to Support*

A Rentmaikar agent will contact you shortly.

📧 Email: support@rentmaikar.com
📱 Keep this chat open

Typical response time: 15-30 minutes`;
        
        // Log support request (in production, create a support ticket)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('inbox_conversations').insert({
          channel: 'whatsapp',
          user_phone: phone,
          user_name: body.ProfileName,
          region: phone.startsWith('+234') ? 'Nigeria' : 'USA',
          status: 'open',
          priority: 'high',
          subject: 'WhatsApp support request',
        });
        break;

      case 'OK':
        responseMessage = `✅ *Got it!*

Thank you for confirming.
Is there anything else I can help with?

Reply *HELP* for options.`;
        break;

      default:
        responseMessage = `👋 *Hi from Rentmaikar!*

I didn't understand that. Here are some things I can help with:

*PAY* - Get payment link
*STATUS* - Check payment status
*HELP* - Get support options

Reply with one of these commands.`;
        break;
    }

    // Send response
    if (responseMessage) {
      await sendWhatsAppResponse(phone, responseMessage, supabaseUrl, supabaseServiceKey);
    }

    // Return empty TwiML (we're sending responses via API, not TwiML)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "application/xml", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[WhatsAppHandler] Error:", errorMessage);
    
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "application/xml", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelfServicePaymentRequest {
  phone: string;
  driverId?: string;
  action: 'request_link' | 'check_status' | 'confirm_payment';
  paymentReference?: string;
}

interface PaymentLinkData {
  driverId: string;
  amount: number;
  currency: string;
  vehicleName: string;
  rentalId: string;
  paymentUrl: string;
}

const getCurrencySymbol = (currency: string): string => {
  return currency === 'NGN' ? '₦' : '$';
};

const generatePaymentLink = (
  rentalId: string, 
  amount: number, 
  currency: string
): string => {
  // In production, integrate with PayPal (USA) or Paystack (Nigeria)
  const baseUrl = 'https://rentmaikar.lovable.app';
  const params = new URLSearchParams({
    rental: rentalId,
    amount: amount.toString(),
    currency,
    ref: `PAY-${Date.now()}`,
  });
  return `${baseUrl}/pay?${params.toString()}`;
};

const sendWhatsAppMessage = async (
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
    console.error('[SelfServicePayment] WhatsApp send failed:', error);
    return false;
  }
};

const sendPaymentEmail = async (
  email: string,
  data: PaymentLinkData,
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-templated-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        to: email,
        template: 'self_service_payment_link',
        data: {
          firstName: 'Driver',
          vehicleName: data.vehicleName,
          amount: data.amount,
          currency: data.currency,
          paymentUrl: data.paymentUrl,
        },
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[SelfServicePayment] Email send failed:', error);
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
    const body: SelfServicePaymentRequest = await req.json();

    console.log(`[SelfServicePayment] Processing action: ${body.action} for phone: ${body.phone}`);

    // Normalize phone number
    const phone = body.phone.replace(/\s/g, '');

    // Find driver by phone
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, phone')
      .eq('phone', phone)
      .single();

    if (profileError || !profile) {
      const message = `❌ *Phone Not Found*

We couldn't find a Rentmaikar account linked to this number.

Please contact support or log in to your dashboard.`;

      await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);

      return new Response(
        JSON.stringify({ success: false, error: 'Phone not registered' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const driverId = profile.user_id;
    const driverName = profile.full_name?.split(' ')[0] || 'Driver';

    switch (body.action) {
      case 'request_link': {
        // Find active payment default or upcoming payment
        const { data: paymentDefault } = await supabase
          .from('payment_defaults')
          .select('*')
          .eq('driver_id', driverId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!paymentDefault) {
          // Check for approved negotiations to get payment info
          const { data: rental } = await supabase
            .from('price_negotiations')
            .select('id, final_daily_rate, currency, vehicle_make, vehicle_model')
            .eq('driver_id', driverId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!rental) {
            const message = `✅ *No Pending Payments*

Hi ${driverName}, you have no outstanding payments at this time.

Keep up the great work! 🚗`;

            await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);

            return new Response(
              JSON.stringify({ success: true, message: 'No pending payments' }),
              { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }

          // Generate payment link for next payment
          const weeklyAmount = (rental.final_daily_rate || 0) * 7;
          const paymentUrl = generatePaymentLink(rental.id, weeklyAmount, rental.currency);
          const sym = getCurrencySymbol(rental.currency);

          const message = `💳 *Payment Link Ready*

Hi ${driverName}, here's your secure payment link:

${paymentUrl}

Amount: ${sym}${weeklyAmount.toLocaleString()}
Vehicle: ${rental.vehicle_make} ${rental.vehicle_model}

This link expires in 24 hours.
Reply *STATUS* to check payment status.`;

          await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);

          // Also send email
          if (profile.email) {
            await sendPaymentEmail(
              profile.email,
              {
                driverId,
                amount: weeklyAmount,
                currency: rental.currency,
                vehicleName: `${rental.vehicle_make} ${rental.vehicle_model}`,
                rentalId: rental.id,
                paymentUrl,
              },
              supabaseUrl,
              supabaseServiceKey
            );
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Payment link sent',
              paymentUrl 
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Generate payment link for overdue amount
        const paymentUrl = generatePaymentLink(
          paymentDefault.rental_id,
          paymentDefault.amount_due,
          paymentDefault.currency
        );
        const sym = getCurrencySymbol(paymentDefault.currency);

        const urgencyLevel = paymentDefault.deactivation_eligible ? '🚨 *URGENT*' : '⚠️';

        const message = `${urgencyLevel} *Payment Required*

Hi ${driverName}, you have an outstanding payment.

💰 Amount due: ${sym}${paymentDefault.amount_due.toLocaleString()}
⏰ Overdue by: ${paymentDefault.hours_overdue} hours
${paymentDefault.deactivation_eligible ? '❌ Vehicle lockdown is authorized.' : ''}

Pay now to avoid restrictions:
${paymentUrl}

Reply *STATUS* after payment.`;

        await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);

        // Also send email
        if (profile.email) {
          await sendPaymentEmail(
            profile.email,
            {
              driverId,
              amount: paymentDefault.amount_due,
              currency: paymentDefault.currency,
              vehicleName: 'Your vehicle',
              rentalId: paymentDefault.rental_id,
              paymentUrl,
            },
            supabaseUrl,
            supabaseServiceKey
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Payment link sent',
            paymentUrl,
            overdue: true,
            hoursOverdue: paymentDefault.hours_overdue
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'check_status': {
        const { data: paymentDefault } = await supabase
          .from('payment_defaults')
          .select('*')
          .eq('driver_id', driverId)
          .eq('status', 'active')
          .limit(1)
          .single();

        if (!paymentDefault) {
          const message = `✅ *All Clear!*

Hi ${driverName}, you have no outstanding payments.

Your rental is active and in good standing.
Thank you for being a reliable driver! 🚗`;

          await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);
        } else {
          const sym = getCurrencySymbol(paymentDefault.currency);
          const message = `⚠️ *Payment Status*

Outstanding: ${sym}${paymentDefault.amount_due.toLocaleString()}
Overdue by: ${paymentDefault.hours_overdue} hours
Status: ${paymentDefault.deactivation_eligible ? '❌ Lockdown eligible' : '⏳ Grace period'}

Reply *PAY* to get a payment link.`;

          await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'confirm_payment': {
        // This would be called by payment webhook in production
        // For now, simulate payment confirmation
        const message = `✅ *Payment Confirmed*

Hi ${driverName}, we've received your payment.

Your rental is now in good standing.
Vehicle access has been restored (if previously restricted).

Thank you! 🎉`;

        await sendWhatsAppMessage(phone, message, supabaseUrl, supabaseServiceKey);

        return new Response(
          JSON.stringify({ success: true, message: 'Payment confirmed' }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[SelfServicePayment] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

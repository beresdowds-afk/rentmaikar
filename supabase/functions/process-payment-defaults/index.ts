import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentDefault {
  id: string;
  driver_id: string;
  vehicle_id: string;
  rental_id: string;
  amount_due: number;
  currency: string;
  payment_frequency: 'daily' | 'weekly';
  hours_overdue: number;
  notifications_sent: number;
  last_notification_at: string | null;
  deactivation_eligible: boolean;
  status: string;
}

interface DriverProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  notification_sms: boolean;
  notification_whatsapp: boolean;
}

// Configuration based on payment frequency
const CONFIG = {
  weekly: {
    notificationHours: [24, 48, 72],
    lockdownAfterHours: 72,
  },
  daily: {
    notificationHours: [12, 24, 36],
    lockdownAfterHours: 36,
  },
};

const getCurrencySymbol = (currency: string): string => {
  return currency === 'NGN' ? '₦' : '$';
};

const generateNotificationMessage = (
  paymentDefault: PaymentDefault,
  notificationNumber: number,
  driverName: string
): string => {
  const config = CONFIG[paymentDefault.payment_frequency];
  const hoursRemaining = config.lockdownAfterHours - paymentDefault.hours_overdue;
  const isDaily = paymentDefault.payment_frequency === 'daily';
  const sym = getCurrencySymbol(paymentDefault.currency);
  const amount = `${sym}${paymentDefault.amount_due.toLocaleString()}`;
  
  const messages: Record<number, string> = {
    1: `🔔 Rentmaikar Payment Reminder (1/3)

Dear ${driverName},

Your payment of ${amount} is overdue. Please make payment immediately.

⚠️ ${isDaily ? 'DAILY' : 'WEEKLY'} plan: Vehicle lockdown in ${hoursRemaining}h if not resolved.

Pay now to avoid service interruption.`,

    2: `⚠️ URGENT: Payment Overdue (2/3)

Dear ${driverName},

Your ${amount} payment remains outstanding.

🚨 ${hoursRemaining}h until vehicle lockdown!

${isDaily ? 'Daily plans require faster resolution.' : ''}

Contact support if you need assistance.`,

    3: `🚨 FINAL NOTICE (3/3)

Dear ${driverName},

FINAL WARNING: ${amount} critically overdue.

❌ Vehicle lockdown authorized. Your vehicle will be disabled when parked.

${isDaily ? 'Daily payment plans are now FORBIDDEN for your account.' : ''}

Pay immediately to avoid lockdown.`,
  };

  return messages[notificationNumber] || messages[1];
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
      body: JSON.stringify({
        phone,
        channel,
        notificationType: 'general',
        customMessage: message,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`[PaymentDefaults] Failed to send ${channel}:`, error);
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

    console.log("[PaymentDefaults] Starting hourly payment default check...");

    // Fetch all active payment defaults
    const { data: activeDefaults, error: fetchError } = await supabase
      .from('payment_defaults')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      throw new Error(`Failed to fetch defaults: ${fetchError.message}`);
    }

    console.log(`[PaymentDefaults] Found ${activeDefaults?.length || 0} active defaults`);

    const results = {
      processed: 0,
      notificationsSent: 0,
      lockdownsEligible: 0,
      errors: [] as string[],
    };

    for (const paymentDefault of activeDefaults || []) {
      try {
        const config = CONFIG[paymentDefault.payment_frequency as 'daily' | 'weekly'];
        const newHoursOverdue = paymentDefault.hours_overdue + 1;
        
        // Check if notification is due
        const nextNotificationHour = config.notificationHours[paymentDefault.notifications_sent];
        let shouldNotify = false;
        let newNotificationsSent = paymentDefault.notifications_sent;
        
        if (nextNotificationHour && newHoursOverdue >= nextNotificationHour) {
          shouldNotify = true;
          newNotificationsSent = paymentDefault.notifications_sent + 1;
        }

        // Check if deactivation eligible
        const deactivationEligible = 
          newHoursOverdue >= config.lockdownAfterHours &&
          newNotificationsSent >= config.notificationHours.length;

        // Update the payment default record
        const updateData: Record<string, unknown> = {
          hours_overdue: newHoursOverdue,
          deactivation_eligible: deactivationEligible,
        };

        if (shouldNotify) {
          updateData.notifications_sent = newNotificationsSent;
          updateData.last_notification_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('payment_defaults')
          .update(updateData)
          .eq('id', paymentDefault.id);

        if (updateError) {
          results.errors.push(`Failed to update ${paymentDefault.id}: ${updateError.message}`);
          continue;
        }

        // Send notification if due
        if (shouldNotify) {
          // Fetch driver profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, email, notification_sms, notification_whatsapp')
            .eq('user_id', paymentDefault.driver_id)
            .single();

          if (profile?.phone) {
            const message = generateNotificationMessage(
              paymentDefault,
              newNotificationsSent,
              profile.full_name || 'Driver'
            );

            // Send SMS if enabled
            if (profile.notification_sms) {
              const smsSent = await sendNotification(
                profile.phone,
                message,
                'sms',
                supabaseUrl,
                supabaseServiceKey
              );
              if (smsSent) results.notificationsSent++;
            }

            // Send WhatsApp if enabled (especially for final notice)
            if (profile.notification_whatsapp || newNotificationsSent === 3) {
              const whatsappSent = await sendNotification(
                profile.phone,
                message,
                'whatsapp',
                supabaseUrl,
                supabaseServiceKey
              );
              if (whatsappSent) results.notificationsSent++;
            }
          }

          console.log(`[PaymentDefaults] Notification ${newNotificationsSent}/3 sent for ${paymentDefault.id}`);
        }

        if (deactivationEligible) {
          results.lockdownsEligible++;
          console.log(`[PaymentDefaults] Lockdown eligible: ${paymentDefault.id} (${paymentDefault.payment_frequency})`);
        }

        results.processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Error processing ${paymentDefault.id}: ${errorMessage}`);
      }
    }

    console.log("[PaymentDefaults] Processing complete:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment defaults processed',
        results 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[PaymentDefaults] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

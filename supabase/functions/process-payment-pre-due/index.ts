import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration for reminder schedule (hours before due)
const REMINDER_INTERVALS = {
  weekly: [72, 60, 48, 36, 24, 12],
  daily: [12, 8, 4],
};

const getCurrencySymbol = (currency: string): string => {
  return currency === 'NGN' ? '₦' : '$';
};

const sendWhatsAppReminder = async (
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
    console.error('[PreDueReminders] WhatsApp send failed:', error);
    return false;
  }
};

const sendEmailReminder = async (
  email: string,
  template: string,
  data: Record<string, unknown>,
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
        template,
        data,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[PreDueReminders] Email send failed:', error);
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

    console.log("[PreDueReminders] Processing pre-due payment reminders...");

    // Get current time
    const now = new Date();
    
    // Calculate time windows for reminders (72 hours ahead)
    const maxLookAhead = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    // Fetch upcoming weekly payments that are due within 72 hours
    // This would require a rentals/payments table - for now we'll work with price_negotiations
    // In production, you'd have an actual rentals table with payment schedules
    
    const results = {
      processed: 0,
      remindersSent: 0,
      errors: [] as string[],
    };

    // For this implementation, we'll create a demonstration of how reminders would work
    // In a real system, you'd query a rentals/payment_schedule table
    
    console.log(`[PreDueReminders] Looking for payments due between now and ${maxLookAhead.toISOString()}`);

    // Example: Query any active negotiations that might have payment schedules
    // This is placeholder logic - in production, use actual rental payment schedules
    const { data: activeRentals, error: rentalsError } = await supabase
      .from('price_negotiations')
      .select('id, driver_id, vehicle_id, final_daily_rate, currency, vehicle_make, vehicle_model')
      .eq('status', 'approved')
      .not('final_daily_rate', 'is', null)
      .limit(50);

    if (rentalsError) {
      console.error('[PreDueReminders] Error fetching rentals:', rentalsError);
    }

    // Process each active rental
    for (const rental of activeRentals || []) {
      try {
        // Fetch driver profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, email, notification_sms, notification_whatsapp, notification_email')
          .eq('user_id', rental.driver_id)
          .single();

        if (!profile) continue;

        const vehicleName = `${rental.vehicle_make} ${rental.vehicle_model}`;
        const amount = rental.final_daily_rate * 7; // Weekly amount
        const sym = getCurrencySymbol(rental.currency);

        // Check if we should send a reminder (based on your business logic)
        // For demo, we'll check if a reminder was sent recently
        
        const { data: recentReminder } = await supabase
          .from('expiry_notifications')
          .select('id')
          .eq('recipient_id', rental.driver_id)
          .eq('notification_type', 'payment_pre_due')
          .gte('sent_at', new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
          .single();

        // Skip if reminder was sent in last 12 hours
        if (recentReminder) continue;

        // Send WhatsApp reminder if enabled
        if (profile.notification_whatsapp && profile.phone) {
          const message = `👋 *Friendly Reminder – Rentmaikar*

Hi ${profile.full_name || 'there'}, this is a quick heads-up that your weekly rental payment is coming up.

🚗 Vehicle: ${vehicleName}
💰 Amount due: ${sym}${amount.toLocaleString()}

You can pay early anytime to stay uninterrupted.
Reply *PAY* to make payment now.`;

          const whatsappSent = await sendWhatsAppReminder(
            profile.phone,
            message,
            supabaseUrl,
            supabaseServiceKey
          );
          
          if (whatsappSent) results.remindersSent++;
        }

        // Send email reminder if enabled
        if (profile.notification_email && profile.email) {
          const emailSent = await sendEmailReminder(
            profile.email,
            'payment_reminder_72h',
            {
              firstName: profile.full_name?.split(' ')[0] || 'Driver',
              vehicleName,
              amount,
              currency: rental.currency,
              planType: 'weekly',
              dashboardUrl: 'https://rentmaikar.lovable.app/driver/dashboard',
            },
            supabaseUrl,
            supabaseServiceKey
          );
          
          if (emailSent) results.remindersSent++;
        }

        // Log the reminder
        await supabase.from('expiry_notifications').insert({
          recipient_id: rental.driver_id,
          recipient_type: 'driver',
          notification_type: 'payment_pre_due',
          notification_channel: 'multi',
          days_until_expiry: 3,
        });

        results.processed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Rental ${rental.id}: ${errorMsg}`);
      }
    }

    console.log("[PreDueReminders] Processing complete:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pre-due reminders processed',
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[PreDueReminders] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

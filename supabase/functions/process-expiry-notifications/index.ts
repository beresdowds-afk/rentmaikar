import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringItem {
  id: string;
  type: 'insurance' | 'registration' | 'inspection' | 'license';
  expiry_date: string;
  days_until_expiry: number;
  vehicle_id?: string;
  vehicle_info?: string;
  owner_id?: string;
  driver_id?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_name?: string;
  driver_email?: string;
  driver_phone?: string;
  driver_name?: string;
  owner_notification_sms?: boolean;
  owner_notification_whatsapp?: boolean;
  driver_notification_sms?: boolean;
  driver_notification_whatsapp?: boolean;
}

const sendSmsOrWhatsApp = async (
  phone: string,
  message: string,
  channel: 'sms' | 'whatsapp',
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioPhoneNumber: string
): Promise<boolean> => {
  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const fromNumber = channel === 'whatsapp' ? `whatsapp:${twilioPhoneNumber}` : twilioPhoneNumber;
    const toNumber = channel === 'whatsapp' ? `whatsapp:${phone}` : phone;

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: message,
      }),
    });

    return response.ok;
  } catch (e) {
    console.error(`${channel} send failed:`, e);
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Fetch vehicles with expiring documents
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        make,
        model,
        year,
        plate_number,
        owner_id,
        insurance_expiry,
        registration_expiry,
        inspection_expiry
      `)
      .or(`insurance_expiry.gte.${formatDate(today)},registration_expiry.gte.${formatDate(today)},inspection_expiry.gte.${formatDate(today)}`);

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError);
    }

    const expiringItems: ExpiringItem[] = [];

    // Process vehicle expiry dates
    for (const vehicle of vehicles || []) {
      const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.plate_number})`;
      
      // Fetch owner profile with notification preferences
      let ownerProfile = null;
      if (vehicle.owner_id) {
        const { data: owner } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, phone, notification_sms, notification_whatsapp')
          .eq('user_id', vehicle.owner_id)
          .maybeSingle();
        ownerProfile = owner;
      }

      const checkExpiry = (expiryDate: string | null, type: 'insurance' | 'registration' | 'inspection') => {
        if (!expiryDate) return;
        const expiry = new Date(expiryDate);
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil === 7 || daysUntil === 30) {
          expiringItems.push({
            id: vehicle.id,
            type,
            expiry_date: expiryDate,
            days_until_expiry: daysUntil,
            vehicle_id: vehicle.id,
            vehicle_info: vehicleInfo,
            owner_id: ownerProfile?.user_id,
            owner_email: ownerProfile?.email,
            owner_phone: ownerProfile?.phone,
            owner_name: ownerProfile?.full_name,
            owner_notification_sms: ownerProfile?.notification_sms,
            owner_notification_whatsapp: ownerProfile?.notification_whatsapp,
          });
        }
      };

      checkExpiry(vehicle.insurance_expiry, 'insurance');
      checkExpiry(vehicle.registration_expiry, 'registration');
      checkExpiry(vehicle.inspection_expiry, 'inspection');
    }

    // Fetch user documents with expiry dates
    const { data: documents, error: docsError } = await supabase
      .from('user_documents')
      .select(`
        id,
        document_type,
        expiry_date,
        user_id,
        vehicle_id
      `)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', formatDate(today));

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    }

    for (const doc of documents || []) {
      if (!doc.expiry_date) continue;
      const expiry = new Date(doc.expiry_date);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Fetch user profile with notification preferences
      let userProfile = null;
      if (doc.user_id) {
        const { data: user } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, phone, notification_sms, notification_whatsapp')
          .eq('user_id', doc.user_id)
          .maybeSingle();
        userProfile = user;
      }
      
      if (daysUntil === 7 || daysUntil === 30) {
        expiringItems.push({
          id: doc.id,
          type: 'license',
          expiry_date: doc.expiry_date,
          days_until_expiry: daysUntil,
          vehicle_id: doc.vehicle_id,
          owner_id: userProfile?.user_id,
          owner_email: userProfile?.email,
          owner_phone: userProfile?.phone,
          owner_name: userProfile?.full_name,
          owner_notification_sms: userProfile?.notification_sms,
          owner_notification_whatsapp: userProfile?.notification_whatsapp,
        });
      }
    }

    // Get admin emails for notifications
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminUserIds = (admins || []).map(a => a.user_id);
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id, email, phone, full_name, notification_sms, notification_whatsapp')
      .in('user_id', adminUserIds);

    const results = {
      processed: 0,
      emailsSent: 0,
      smsSent: 0,
      whatsappSent: 0,
      voipCallsMade: 0,
      errors: [] as string[],
    };

    for (const item of expiringItems) {
      // Check if notification already sent
      const { data: existingNotification } = await supabase
        .from('expiry_notifications')
        .select('id')
        .eq('vehicle_id', item.vehicle_id || item.id)
        .eq('days_until_expiry', item.days_until_expiry)
        .eq('notification_type', item.type)
        .maybeSingle();

      if (existingNotification) {
        continue; // Already notified
      }

      const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      const subject = `⚠️ ${typeLabel} Expiring in ${item.days_until_expiry} Days`;
      const vehicleText = item.vehicle_info ? ` for ${item.vehicle_info}` : '';
      const smsMessage = `RentMaiKar: Your ${item.type}${vehicleText} expires on ${item.expiry_date} (${item.days_until_expiry} days). Please renew immediately.`;

      // Send to owner - Email
      if (item.owner_email && resend) {
        try {
          await resend.emails.send({
            from: "RentMaiKar <noreply@rentmaikar.com>",
            to: [item.owner_email],
            subject,
            html: `
              <h2>${typeLabel} Expiry Notice</h2>
              <p>Dear ${item.owner_name || 'Vehicle Owner'},</p>
              <p>Your ${item.type}${vehicleText} will expire on <strong>${item.expiry_date}</strong> (${item.days_until_expiry} days from now).</p>
              <p>Please ensure you renew it before the expiry date to avoid any service interruptions.</p>
              <p>Best regards,<br>RentMaiKar Team</p>
            `,
          });
          
          await supabase.from('expiry_notifications').insert({
            document_id: item.type === 'license' ? item.id : null,
            vehicle_id: item.vehicle_id,
            notification_type: item.type,
            recipient_type: 'owner',
            recipient_id: item.owner_id,
            days_until_expiry: item.days_until_expiry,
            notification_channel: 'email',
          });
          
          results.emailsSent++;
        } catch (e) {
          results.errors.push(`Email to owner failed: ${e}`);
        }
      }

      // Send to owner - SMS (if preferred)
      if (item.owner_phone && item.owner_notification_sms && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        const sent = await sendSmsOrWhatsApp(
          item.owner_phone,
          smsMessage,
          'sms',
          twilioAccountSid,
          twilioAuthToken,
          twilioPhoneNumber
        );
        
        if (sent) {
          await supabase.from('expiry_notifications').insert({
            document_id: item.type === 'license' ? item.id : null,
            vehicle_id: item.vehicle_id,
            notification_type: item.type,
            recipient_type: 'owner',
            recipient_id: item.owner_id,
            days_until_expiry: item.days_until_expiry,
            notification_channel: 'sms',
          });
          results.smsSent++;
        }
      }

      // Send to owner - WhatsApp (if preferred)
      if (item.owner_phone && item.owner_notification_whatsapp && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        const sent = await sendSmsOrWhatsApp(
          item.owner_phone,
          smsMessage,
          'whatsapp',
          twilioAccountSid,
          twilioAuthToken,
          twilioPhoneNumber
        );
        
        if (sent) {
          await supabase.from('expiry_notifications').insert({
            document_id: item.type === 'license' ? item.id : null,
            vehicle_id: item.vehicle_id,
            notification_type: item.type,
            recipient_type: 'owner',
            recipient_id: item.owner_id,
            days_until_expiry: item.days_until_expiry,
            notification_channel: 'whatsapp',
          });
          results.whatsappSent++;
        }
      }

      // Send to admins
      for (const admin of adminProfiles || []) {
        // Admin email
        if (admin.email && resend) {
          try {
            await resend.emails.send({
              from: "RentMaiKar <noreply@rentmaikar.com>",
              to: [admin.email],
              subject: `[Admin] ${subject}`,
              html: `
                <h2>Admin Alert: ${typeLabel} Expiry Notice</h2>
                <p>The following ${item.type}${vehicleText} will expire on <strong>${item.expiry_date}</strong> (${item.days_until_expiry} days).</p>
                <p><strong>Owner:</strong> ${item.owner_name || 'N/A'} (${item.owner_email || 'N/A'})</p>
                <p>Please follow up to ensure timely renewal.</p>
              `,
            });
            
            await supabase.from('expiry_notifications').insert({
              document_id: item.type === 'license' ? item.id : null,
              vehicle_id: item.vehicle_id,
              notification_type: item.type,
              recipient_type: 'admin',
              recipient_id: admin.user_id,
              days_until_expiry: item.days_until_expiry,
              notification_channel: 'email',
            });
            
            results.emailsSent++;
          } catch (e) {
            results.errors.push(`Email to admin failed: ${e}`);
          }
        }

        // Admin SMS (if preferred)
        if (admin.phone && admin.notification_sms && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
          const adminSmsMessage = `[Admin] ${smsMessage} Owner: ${item.owner_name || 'N/A'}`;
          const sent = await sendSmsOrWhatsApp(
            admin.phone,
            adminSmsMessage,
            'sms',
            twilioAccountSid,
            twilioAuthToken,
            twilioPhoneNumber
          );
          
          if (sent) {
            await supabase.from('expiry_notifications').insert({
              document_id: item.type === 'license' ? item.id : null,
              vehicle_id: item.vehicle_id,
              notification_type: item.type,
              recipient_type: 'admin',
              recipient_id: admin.user_id,
              days_until_expiry: item.days_until_expiry,
              notification_channel: 'sms',
            });
            results.smsSent++;
          }
        }
      }

      // 7-day notifications: Make VoIP calls
      if (item.days_until_expiry === 7 && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        const recipientsToCall = [
          { phone: item.owner_phone, name: item.owner_name, type: 'owner', id: item.owner_id },
        ];

        // Add admins with phone numbers
        for (const admin of adminProfiles || []) {
          if (admin.phone) {
            recipientsToCall.push({
              phone: admin.phone,
              name: admin.full_name,
              type: 'admin',
              id: admin.user_id,
            });
          }
        }

        for (const recipient of recipientsToCall) {
          if (!recipient.phone) continue;

          try {
            // Create TwiML for automated voice message
            const twiml = `
              <Response>
                <Say voice="alice">
                  Hello ${recipient.name || ''}. This is an urgent reminder from Rent My Car.
                  Your ${item.type} ${item.vehicle_info ? `for vehicle ${item.vehicle_info}` : ''} 
                  will expire in 7 days on ${item.expiry_date}.
                  Please renew it immediately to avoid service interruption.
                  Thank you.
                </Say>
              </Response>
            `.trim();

            // Create call record first
            const { data: callRecord, error: callError } = await supabase
              .from('voip_calls')
              .insert({
                initiated_by: recipient.id,
                call_type: 'individual',
                region: recipient.phone.startsWith('+234') ? 'Nigeria' : 'USA',
                status: 'pending',
                direction: 'outbound',
                duration_seconds: 0,
              })
              .select()
              .single();

            if (callError) {
              throw new Error(`Failed to create call record: ${callError.message}`);
            }

            // Make the call via Twilio
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
            const callResponse = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: recipient.phone,
                From: twilioPhoneNumber,
                Twiml: twiml,
                StatusCallback: `${supabaseUrl}/functions/v1/voip-status-callback`,
              }),
            });

            const callData = await callResponse.json();

            if (callResponse.ok) {
              // Update call record with Twilio SID
              await supabase
                .from('voip_calls')
                .update({ call_sid: callData.sid, status: 'ringing' })
                .eq('id', callRecord.id);

              // Log notification
              await supabase.from('expiry_notifications').insert({
                document_id: item.type === 'license' ? item.id : null,
                vehicle_id: item.vehicle_id,
                notification_type: item.type,
                recipient_type: recipient.type,
                recipient_id: recipient.id,
                days_until_expiry: item.days_until_expiry,
                notification_channel: 'voip',
                voip_call_id: callRecord.id,
              });

              results.voipCallsMade++;
            } else {
              // Update call as failed
              await supabase
                .from('voip_calls')
                .update({ status: 'failed' })
                .eq('id', callRecord.id);
              
              results.errors.push(`VoIP call to ${recipient.phone} failed: ${callData.message}`);
            }
          } catch (e) {
            results.errors.push(`VoIP call failed: ${e}`);
          }
        }
      }

      results.processed++;
    }

    console.log("Expiry notification results:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error processing expiry notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

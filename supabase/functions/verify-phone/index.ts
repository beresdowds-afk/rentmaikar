import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCodeRequest {
  action: "send_code";
  phone: string;
  channel: "sms" | "whatsapp";
}

interface VerifyCodeRequest {
  action: "verify_code";
  phone: string;
  code: string;
}

type RequestBody = SendCodeRequest | VerifyCodeRequest;

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: RequestBody = await req.json();

    if (!body.phone || !isValidPhone(body.phone)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone number format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const cleanPhone = body.phone.replace(/\s/g, '');

    if (body.action === "send_code") {
      // Generate and store verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update profile with verification code
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: cleanPhone,
          phone_verification_code: code,
          phone_verification_expires_at: expiresAt.toISOString(),
          phone_verified: false,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error storing verification code:", updateError);
        throw new Error("Failed to initiate verification");
      }

      // Send verification code via SMS/WhatsApp
      const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          phone: cleanPhone,
          channel: body.channel,
          notificationType: 'verification_code',
          verificationCode: code,
        }),
      });

      const smsResult = await smsResponse.json();
      
      if (!smsResult.success) {
        console.error("Failed to send verification code:", smsResult.error);
        throw new Error("Failed to send verification code");
      }

      console.log(`Verification code sent to ${cleanPhone} via ${body.channel}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Verification code sent via ${body.channel}`,
          expiresIn: 600 // seconds
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (body.action === "verify_code") {
      // Get stored verification code
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('phone_verification_code, phone_verification_expires_at')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !profile) {
        throw new Error("Profile not found");
      }

      // Check if code is expired
      if (new Date(profile.phone_verification_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Verification code expired. Please request a new one." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if code matches
      if (profile.phone_verification_code !== body.code) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid verification code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark phone as verified
      const { error: verifyError } = await supabase
        .from('profiles')
        .update({
          phone_verified: true,
          phone_verification_code: null,
          phone_verification_expires_at: null,
        })
        .eq('user_id', user.id);

      if (verifyError) {
        throw new Error("Failed to verify phone");
      }

      console.log(`Phone ${cleanPhone} verified for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, message: "Phone number verified successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in verify-phone function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

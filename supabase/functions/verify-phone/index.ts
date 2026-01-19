import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const phoneSchema = z.string()
  .min(7)
  .max(16)
  .regex(/^\+[1-9]\d{6,14}$/, "Invalid phone number format");

const sendCodeSchema = z.object({
  action: z.literal("send_code"),
  phone: phoneSchema,
  channel: z.enum(["sms", "whatsapp"]),
});

const verifyCodeSchema = z.object({
  action: z.literal("verify_code"),
  phone: phoneSchema,
  code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
});

const requestSchema = z.discriminatedUnion("action", [sendCodeSchema, verifyCodeSchema]);

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

    // Parse and validate request body
    const rawBody = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request data",
          details: parseResult.error.errors.map(e => e.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = parseResult.data;
    const cleanPhone = body.phone.replace(/\s/g, '');

    if (body.action === "send_code") {
      // Generate verification code and hash it before storage
      const code = generateVerificationCode();
      const hashedCode = await bcrypt.hash(code);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Reduced to 5 minutes for security

      // Update profile with hashed verification code
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: cleanPhone,
          phone_verification_code: hashedCode, // Store hashed code
          phone_verification_expires_at: expiresAt.toISOString(),
          phone_verified: false,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error("Error storing verification code:", updateError);
        throw new Error("Failed to initiate verification");
      }

      // Send verification code via SMS/WhatsApp (send plaintext code to user)
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
          verificationCode: code, // Send plaintext to user via SMS
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
          expiresIn: 300 // 5 minutes in seconds
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (body.action === "verify_code") {
      // Get stored hashed verification code
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

      // Check if code exists
      if (!profile.phone_verification_code) {
        return new Response(
          JSON.stringify({ success: false, error: "No verification code found. Please request a new one." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Compare submitted code with stored hash using bcrypt
      const isValid = await bcrypt.compare(body.code, profile.phone_verification_code);
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid verification code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark phone as verified and clear the code immediately
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
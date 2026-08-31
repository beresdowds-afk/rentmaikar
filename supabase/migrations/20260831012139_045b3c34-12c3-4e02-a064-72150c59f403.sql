DROP POLICY IF EXISTS "Public can read non-sensitive platform kv" ON public.platform_kv_settings;

CREATE POLICY "Public can read non-sensitive platform kv"
ON public.platform_kv_settings
FOR SELECT
USING (key = ANY (ARRAY['phone_otp_provider'::text, 'persona_verification'::text, 'driver_referee_requirement'::text]));
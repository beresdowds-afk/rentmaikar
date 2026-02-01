-- Create security deposit settings table for region-based configuration
CREATE TABLE public.security_deposit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_deposit_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage security deposit settings
CREATE POLICY "Admins can manage security deposit settings"
ON public.security_deposit_settings
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Anyone can view active settings
CREATE POLICY "Anyone can view active security deposit settings"
ON public.security_deposit_settings
FOR SELECT
USING (is_active = true);

-- Insert default values for USA and Nigeria
INSERT INTO public.security_deposit_settings (region, amount, currency, description)
VALUES 
  ('USA', 200, 'USD', 'Security deposit for USA drivers'),
  ('Nigeria', 100, 'NGN', 'Security deposit for Nigeria drivers');

-- Add referee columns to applications table
ALTER TABLE public.applications
ADD COLUMN referee1_name TEXT,
ADD COLUMN referee1_address TEXT,
ADD COLUMN referee1_phone TEXT,
ADD COLUMN referee2_name TEXT,
ADD COLUMN referee2_address TEXT,
ADD COLUMN referee2_phone TEXT,
ADD COLUMN referee3_name TEXT,
ADD COLUMN referee3_address TEXT,
ADD COLUMN referee3_phone TEXT,
ADD COLUMN security_deposit_acknowledged BOOLEAN DEFAULT false;

-- Add trigger for updated_at
CREATE TRIGGER update_security_deposit_settings_updated_at
BEFORE UPDATE ON public.security_deposit_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
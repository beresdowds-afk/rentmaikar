import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Shield, Phone, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneNumberInput } from '@/components/ui/phone-number-input';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

type CountryCode = 'us' | 'ng';
type Channel = 'sms' | 'whatsapp';

const countryCodes: Record<CountryCode, { prefix: string; flag: string }> = {
  us: { prefix: '+1', flag: '🇺🇸' },
  ng: { prefix: '+234', flag: '🇳🇬' },
};

export const TwoFactorSetup = () => {
  const { user, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('us');
  const [channel, setChannel] = useState<Channel>('sms');
  const [existingPhone, setExistingPhone] = useState<string | null>(null);

  const mandatoryRoles = ['admin', 'owner'];

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      setIsMandatory(mandatoryRoles.includes(userRole || ''));

      const [{ data }, { data: profile }] = await Promise.all([
        supabase
          .from('two_factor_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('phone')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (data) {
        setIsEnabled(data.is_enabled);
        if (data.phone_number) {
          setExistingPhone(data.phone_number);
          setPhoneNumber(data.phone_number);
        } else if (profile?.phone) {
          setPhoneNumber(profile.phone);
        }
        setChannel((data.preferred_channel as Channel) || 'sms');
      } else if (profile?.phone) {
        setPhoneNumber(profile.phone);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [user, userRole]);

  const getFullPhone = () => phoneNumber;

  const handleSave = async () => {
    if (!user) return;
    const parsed = parsePhoneNumberFromString(phoneNumber || '');
    if (!parsed?.isValid()) {
      toast.error('Please enter a valid phone number with country code');
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { action: 'setup', phone: getFullPhone(), channel },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setIsEnabled(true);
      setExistingPhone(getFullPhone());
      toast.success('Two-factor authentication enabled!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enable 2FA');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!user || isMandatory) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('two_factor_settings')
        .update({ is_enabled: false, enabled_at: null })
        .eq('user_id', user.id);
      if (error) throw error;
      setIsEnabled(false);
      toast.success('Two-factor authentication disabled');
    } catch (err) {
      toast.error('Failed to disable 2FA');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isMandatory && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Required
              </Badge>
            )}
            {isEnabled && (
              <Badge className="bg-green-500 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMandatory && !isEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication is mandatory for your role ({userRole}). Please set it up to continue using the platform.
            </AlertDescription>
          </Alert>
        )}

        {isEnabled && existingPhone ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                2FA is active. Codes are sent to <strong>{existingPhone}</strong> via {channel.toUpperCase()}.
              </AlertDescription>
            </Alert>
            {!isMandatory && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Disable 2FA</p>
                  <p className="text-xs text-muted-foreground">Remove two-factor authentication</p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={() => handleDisable()} disabled={isSaving} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number for 2FA</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={(v) => setCountryCode(v as CountryCode)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">{countryCodes.us.flag} {countryCodes.us.prefix}</SelectItem>
                    <SelectItem value="ng">{countryCodes.ng.flag} {countryCodes.ng.prefix}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="(202) 555-0123"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={channel === 'sms' ? 'default' : 'outline'} onClick={() => setChannel('sms')} className="gap-2">
                  SMS
                </Button>
                <Button type="button" variant={channel === 'whatsapp' ? 'default' : 'outline'} onClick={() => setChannel('whatsapp')} className="gap-2">
                  WhatsApp
                </Button>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving || !phoneNumber} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Enable Two-Factor Authentication
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;

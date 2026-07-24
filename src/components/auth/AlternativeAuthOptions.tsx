import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PhoneNumberField } from '@/components/ui/phone-number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useResendCooldown } from '@/hooks/useResendCooldown';


type Role = 'driver' | 'owner';
type Provider = 'supabase' | 'custom';

function friendlyGoogleError(raw: string | undefined | null): string {
  const msg = (raw || '').toLowerCase();
  if (!msg) return 'Google sign-in could not complete. Please try again.';
  if (msg.includes('access_denied') || msg.includes('denied') || msg.includes('cancel')) {
    return 'You denied access on the Google consent screen. Tap "Retry" and choose Allow to continue.';
  }
  if (msg.includes('popup') || msg.includes('closed') || msg.includes('window')) {
    return 'The Google sign-in window closed before finishing. Please try again.';
  }
  if (msg.includes('expired') || msg.includes('timeout')) {
    return 'Your Google session expired. Please retry to start a fresh sign-in.';
  }
  if (msg.includes('redirect') || msg.includes('callback') || msg.includes('uri')) {
    return 'Google callback is misconfigured for this environment. Please contact support if this persists.';
  }
  if (msg.includes('unsupported provider') || msg.includes('provider is not enabled')) {
    return 'Google sign-in is temporarily disabled. Please use email/phone or try again shortly.';
  }
  return raw || 'Google sign-in failed. Please try again.';
}

export function AlternativeAuthOptions({ defaultRole = 'driver' as Role }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: {
          // Minimum scopes per Google OAuth policy:
          // - openid       → Google Subject ID (sub) + verified email status (email_verified)
          // - email        → email address
          // - profile      → full name + profile photo (picture)
          // No additional Google API scopes are requested.
          scope: 'openid email profile',
          // Ensure Google shows the consent screen so users know what
          // RentMaikar is receiving (name, email, photo, verified status, sub).
          prompt: 'consent select_account',
          include_granted_scopes: 'true',
        },
      });
      if (result.error) {
        const friendly = friendlyGoogleError(result.error.message);
        setGoogleError(friendly);
        toast.error(friendly);
        setGoogleLoading(false);
        return;
      }
      // redirected === true → browser is navigating to Google.
      // Otherwise the session is set and AuthContext's listener will route.
    } catch (e) {
      const friendly = friendlyGoogleError((e as Error).message);
      setGoogleError(friendly);
      toast.error(friendly);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground uppercase">Or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={googleLoading}
          data-testid="google-sso-button"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1a6.2 6.2 0 010-12.4c1.94 0 3.24.83 3.98 1.54l2.72-2.62A9.8 9.8 0 0012 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.77 0 9.6-4.06 9.6-9.78 0-.66-.07-1.16-.16-1.65H12z" />
            </svg>
          )}
          Google
        </Button>
        <Button type="button" variant="outline" onClick={() => setPhoneOpen(true)}>
          <Smartphone className="h-4 w-4 mr-2" />
          Phone
        </Button>
      </div>

      {googleError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive space-y-2"
          data-testid="google-sso-error"
        >
          <p>{googleError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Retry Google sign-in
          </Button>
        </div>
      )}

      <PhoneOtpDialog open={phoneOpen} onOpenChange={setPhoneOpen} defaultRole={defaultRole} />
    </div>
  );
}

function PhoneOtpDialog({
  open, onOpenChange, defaultRole,
}: { open: boolean; onOpenChange: (v: boolean) => void; defaultRole: Role }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(defaultRole);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [provider, setProvider] = useState<Provider>('supabase');
  const { remaining, canSend, trigger } = useResendCooldown('sms', phone);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('platform_kv_settings')
        .select('value')
        .eq('key', 'phone_otp_provider')
        .maybeSingle();
      const v = (data?.value as { provider?: Provider } | null)?.provider;
      if (v === 'custom' || v === 'supabase') setProvider(v);
    })();
  }, [open]);

  const sendCode = async () => {
    if (!phone.startsWith('+') || phone.length < 8) {
      toast.error('Enter your phone in international format (e.g. +15551234567)');
      return;
    }
    if (!canSend) return;
    setSending(true);
    try {
      await trigger(async () => {
        if (provider === 'custom') {
          const { data, error } = await supabase.functions.invoke('phone-otp-custom', {
            body: { action: 'send', phone },
          });
          if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
        }
      });
      toast.success('Verification code sent');
      setStep('code');
    } catch (e) {
      toast.error((e as Error).message || 'Could not send code');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length < 4) { toast.error('Enter the code you received'); return; }
    setVerifying(true);
    try {
      if (provider === 'custom') {
        const { data, error } = await supabase.functions.invoke('phone-otp-custom', {
          body: { action: 'verify', phone, code, full_name: name, role },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        const tempPassword = (data as any).temp_password as string;
        // Sign in using the returned temporary password
        const { error: signInErr } = await supabase.auth.signInWithPassword({ phone, password: tempPassword });
        if (signInErr) throw signInErr;
      } else {
        const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
        if (error) throw error;
        // Assign role for brand-new users
        if (data.user) {
          await supabase.from('user_roles').upsert(
            { user_id: data.user.id, role },
            { onConflict: 'user_id,role' }
          );
          if (name) {
            await supabase.from('profiles').update({ full_name: name }).eq('id', data.user.id);
          }
        }
      }
      toast.success('Signed in');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in with phone</DialogTitle>
          <DialogDescription>
            We'll send you a one-time code via SMS.
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full name (new users)</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>I am a</Label>
              <Select value={role} onValueChange={(v: Role) => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="owner">Vehicle Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone number</Label>
              <PhoneNumberField value={phone} onChange={setPhone} />
            </div>
            <Button className="w-full" onClick={sendCode} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enter the 6-digit code sent to {phone}</Label>
              <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={verifyCode} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Verify & continue
              </Button>
              <Button variant="outline" onClick={sendCode} disabled={!canSend || sending}>
                {!canSend ? `Resend in ${remaining}s` : 'Resend'}
              </Button>
            </div>
            <Button variant="link" className="w-full" onClick={() => setStep('phone')}>
              Use a different number
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AlternativeAuthOptions;

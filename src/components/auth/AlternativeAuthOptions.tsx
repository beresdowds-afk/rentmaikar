import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { assignRole } from '@/lib/user-provisioning';
import type { AppRole } from '@/lib/role-home';
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
import VerificationFailureCard from '@/components/verification/VerificationFailureCard';
import type { ClassifiedFailure } from '@/lib/verification-failures';
import { getCorrelationId, logVerificationEvent, reportVerificationFailure } from '@/lib/verification-logger';
import { runPreflight } from '@/lib/verification-preflight';

type Role = 'driver' | 'owner';
type Provider = 'supabase' | 'custom';

export function AlternativeAuthOptions({ defaultRole = 'driver' as Role }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [googleFailure, setGoogleFailure] = useState<ClassifiedFailure | null>(null);

  const failGoogle = async (err: unknown, step: string) => {
    const failure = await reportVerificationFailure(err, { stage: 'oauth', step, provider: 'google' });
    setGoogleFailure(failure);
    toast.error(failure.title, { description: failure.nextStep });
    setGoogleLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleFailure(null);
    setGoogleLoading(true);
    const correlationId = getCorrelationId();
    try {
      // Catch the common browser-side blockers (cookies, storage, offline,
      // outdated engine) BEFORE bouncing the user to Google.
      const preflight = await runPreflight({ requireOAuth: true, skipClockCheck: true });
      if (!preflight.ok) {
        const blocker = preflight.blocking[0];
        setGoogleFailure({ ...blocker, raw: blocker.detail ?? blocker.code, correlationId });
        await logVerificationEvent({
          stage: 'oauth', step: 'preflight', outcome: 'failed', provider: 'google',
          failure: { ...blocker, raw: blocker.detail ?? blocker.code, correlationId }, correlationId,
        });
        toast.error(blocker.title, { description: blocker.nextStep });
        setGoogleLoading(false);
        return;
      }

      await logVerificationEvent({ stage: 'oauth', step: 'google_sign_in', outcome: 'started', provider: 'google', correlationId });

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
        await failGoogle(result.error, 'google_sign_in');
        return;
      }
      await logVerificationEvent({
        stage: 'oauth', step: 'google_sign_in', outcome: 'succeeded', provider: 'google',
        correlationId, context: { redirected: (result as { redirected?: boolean }).redirected ?? false },
      });
      // redirected === true → browser is navigating to Google.
      // Otherwise the session is set and AuthContext's listener will route.
    } catch (e) {
      await failGoogle(e, 'google_sign_in');
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

      {googleFailure && (
        <div data-testid="google-sso-error" role="alert">
          <VerificationFailureCard
            failure={googleFailure}
            busy={googleLoading}
            onAction={
              googleFailure.action === 'use_password_login' || googleFailure.action === 'contact_support'
                ? undefined
                : handleGoogle
            }
          />
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
  // Default to the custom Twilio/Termii pipeline: Supabase-native phone auth
  // is not provisioned for this project, so it would fail silently.
  const [provider, setProvider] = useState<Provider>('custom');
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

  /** Surface the real edge function error instead of "non-2xx status code". */
  const invokeOtp = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('phone-otp-custom', { body });
    if (error) {
      let detail = error.message;
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.text === 'function') {
        try {
          const raw = await ctx.text();
          const parsed = JSON.parse(raw);
          detail = parsed?.error ?? raw ?? detail;
        } catch { /* keep default message */ }
      }
      throw new Error(detail);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

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
          await invokeOtp({ action: 'send', phone });
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
        }
      });
      toast.success(`Verification code sent to ${phone}`);
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
        const data = await invokeOtp({ action: 'verify', phone, code, full_name: name, role });
        // Exchange the one-time token for a real session (no password involved).
        const { error: sessionErr } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash as string,
          type: 'email',
        });
        if (sessionErr) throw sessionErr;
        if (data.is_new_user && name) {
          await supabase.from('profiles').update({ full_name: name }).eq('user_id', data.user_id);
        }
      } else {
        const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
        if (error) throw error;
        // Assign role for brand-new users. The signup trigger already seeds a
        // default role, so a failure here must never block a valid session.
        if (data.user) {
          try {
            await assignRole(data.user.id, role as AppRole);
          } catch (roleErr) {
            console.warn('Role assignment after phone sign-in failed:', roleErr);
          }
          if (name) {
            await supabase.from('profiles').update({ full_name: name }).eq('user_id', data.user.id);
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

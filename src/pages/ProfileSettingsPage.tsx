import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserIdentityCard } from '@/components/profile/UserIdentityCard';
import { ReverificationBanner } from '@/components/profile/ReverificationBanner';
import { ProfileAuditHistory } from '@/components/profile/ProfileAuditHistory';
import { trackOnboardingEvent } from '@/lib/onboarding-analytics';
import { z } from 'zod';

const nameSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Please enter your full name')
    .max(120, 'Name must be less than 120 characters'),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal('')),
});

const normalize = (v: string | null | undefined) => (v ?? '').trim();

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [initial, setInitial] = useState({ fullName: '', phone: '' });
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameImmutableError, setNameImmutableError] = useState<string | null>(null);

  const nameLocked = identityStatus === 'approved';

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, identity_verification_status, identity_verified_at')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        const fn = data.full_name ?? '';
        const ph = data.phone ?? '';
        setFullName(fn);
        setPhone(ph);
        setInitial({ fullName: fn, phone: ph });
        const status = (data as any).identity_verification_status
          ?? ((data as any).identity_verified_at ? 'approved' : null);
        setIdentityStatus(status);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const nameChanged = normalize(fullName) !== normalize(initial.fullName);
  const phoneChanged = normalize(phone) !== normalize(initial.phone);

  const save = async () => {
    if (!user?.id) return;

    if (nameLocked && nameChanged) {
      toast({
        title: 'Name is locked',
        description: 'Your name cannot be changed after identity verification. Contact support to make changes.',
        variant: 'destructive',
      });
      return;
    }

    const parsed = nameSchema.safeParse({ full_name: fullName, phone });
    if (!parsed.success) {
      toast({
        title: 'Please check your details',
        description: parsed.error.issues[0]?.message,
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const newPhone = parsed.data.phone || null;
      const updates: Record<string, any> = {
        full_name: parsed.data.full_name,
        phone: newPhone,
      };

      if (phoneChanged) {
        updates.phone_verified = false;
        updates.identity_verified_at = null;
        updates.identity_verification_status = 'pending_reverification';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      setNameImmutableError(null);

      const fields: string[] = [];
      if (nameChanged) fields.push('full_name');
      if (phoneChanged) fields.push('phone');
      trackOnboardingEvent('profile_updated', { fields });

      if (phoneChanged) {
        setIdentityStatus('pending_reverification');
        trackOnboardingEvent('profile_reverification_triggered', {
          fields: ['phone'],
          extra: { channel: 'both' },
        });
        supabase.functions
          .invoke('persona-send-reverification', {
            body: { user_id: user.id, channel: 'both', reason: 'Phone number changed.' },
          })
          .catch(() => {});
        toast({
          title: 'Profile updated',
          description: 'Your phone changed — please re-verify your identity.',
        });
      } else {
        toast({ title: 'Profile updated' });
      }

      setInitial({ fullName: parsed.data.full_name, phone: newPhone ?? '' });
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      const isImmutable =
        err?.code === '23514' ||
        /locked after identity verification|full_name is immutable/i.test(msg);
      if (isImmutable) {
        setNameImmutableError(
          'Your name is locked after identity verification. Contact support to make changes.',
        );
        setFullName(initial.fullName);
      }
      toast({
        title: isImmutable ? 'Name is locked' : 'Save failed',
        description: isImmutable
          ? 'Contact support to change your legal name.'
          : msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-6">
            Profile Settings
          </h1>

          <ReverificationBanner
            status={identityStatus as any}
            pendingLocalChange={phoneChanged}
          />

          <UserIdentityCard hideSettingsLink />

          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>
                Update your name and contact information. Your passport picture
                can be managed above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nameImmutableError && (
                <Alert
                  variant="destructive"
                  role="alert"
                  data-testid="name-immutable-banner"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>{nameImmutableError}</span>
                    <button
                      type="button"
                      onClick={() => setNameImmutableError(null)}
                      className="text-xs underline self-start sm:self-auto"
                    >
                      Dismiss
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  Full name
                  {nameLocked && (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" /> Locked
                    </Badge>
                  )}
                </Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading || saving || nameLocked}
                  readOnly={nameLocked}
                  maxLength={120}
                  autoComplete="name"
                />
                {nameLocked && (
                  <p className="text-xs text-muted-foreground">
                    Your name is locked after identity verification. Contact support to change it.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ''} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  To change your email, use the Personal Information editor on your dashboard — email changes trigger re-verification.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading || saving}
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                />
              </div>

              {phoneChanged && (
                <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                  <ShieldAlert className="h-4 w-4 text-yellow-700" />
                  <AlertDescription className="text-yellow-900 dark:text-yellow-200">
                    Changing your phone will require you to re-verify your identity.
                  </AlertDescription>
                </Alert>
              )}

              <div className="pt-2">
                <Button onClick={save} disabled={loading || saving || (!nameChanged && !phoneChanged)}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <ProfileAuditHistory />
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ShieldAlert, Mail, Phone, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PersonaVerification from '@/components/verification/PersonaVerification';

interface ProfileEditorProps {
  subjectRole: 'driver' | 'owner' | 'support_staff' | 'admin_assistant';
}

export function ProfileEditor({ subjectRole }: ProfileEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initial, setInitial] = useState({ fullName: '', email: '', phone: '' });
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const [needsReverify, setNeedsReverify] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email, phone, email_verified, phone_verified, identity_verification_status, identity_verified_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const fn = data.full_name ?? '';
      const em = data.email ?? user.email ?? '';
      const ph = data.phone ?? '';
      setFullName(fn); setEmail(em); setPhone(ph);
      setInitial({ fullName: fn, email: em, phone: ph });
      setEmailVerified(!!data.email_verified);
      setPhoneVerified(!!data.phone_verified);
      const status = data.identity_verification_status ?? (data.identity_verified_at ? 'approved' : null);
      setIdentityStatus(status);
      setNeedsReverify(status === 'pending_reverification');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const emailChanged = email.trim().toLowerCase() !== initial.email.trim().toLowerCase();
  const phoneChanged = phone.trim() !== initial.phone.trim();
  const nameChanged = fullName.trim() !== initial.fullName.trim();
  const anyChange = emailChanged || phoneChanged || nameChanged;

  const handleSave = async () => {
    if (!user || !anyChange) return;
    setSaving(true);
    try {
      // 1. Update auth email (triggers Supabase confirmation email)
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (error) throw error;
      }

      // 2. Update profile row
      const updates: Record<string, any> = { full_name: fullName.trim() };
      if (emailChanged) {
        updates.email = email.trim();
        updates.email_verified = false;
      }
      if (phoneChanged) {
        updates.phone = phone.trim();
        updates.phone_verified = false;
      }

      const requiresReverification = emailChanged || phoneChanged;
      if (requiresReverification) {
        updates.identity_verified_at = null;
        updates.identity_verification_status = 'pending_reverification';
      }

      const { error: pErr } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
      if (pErr) throw pErr;

      // 3. Audit trail
      if (requiresReverification) {
        await supabase.from('admin_audit_log').insert({
          admin_id: user.id,
          action: 'profile_contact_changed',
          target_table: 'profiles',
          target_id: user.id,
          details: {
            email_changed: emailChanged,
            phone_changed: phoneChanged,
            old_email: initial.email,
            new_email: emailChanged ? email.trim() : undefined,
            old_phone: initial.phone,
            new_phone: phoneChanged ? phone.trim() : undefined,
          },
        }).then(() => {}, () => {});
      }

      setInitial({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });

      if (requiresReverification) {
        setEmailVerified(!emailChanged && emailVerified);
        setPhoneVerified(!phoneChanged && phoneVerified);
        setIdentityStatus('pending_reverification');
        setNeedsReverify(true);
        toast.success('Profile updated. Please re-verify your identity below.');
        if (emailChanged) {
          toast.info('Check your new email inbox to confirm the change.');
        }
      } else {
        toast.success('Profile saved.');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Personal Information
          </CardTitle>
          <CardDescription>
            Edit your name, email or phone. Changing your email or phone will require re-verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pe-name">Full Name</Label>
              <Input id="pe-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email
                {emailVerified ? (
                  <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Unverified</Badge>
                )}
              </Label>
              <Input id="pe-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> Phone
                {phoneVerified ? (
                  <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Unverified</Badge>
                )}
              </Label>
              <Input id="pe-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
          </div>

          {(emailChanged || phoneChanged) && (
            <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
              <ShieldAlert className="h-4 w-4 text-yellow-700" />
              <AlertDescription className="text-yellow-900 dark:text-yellow-200">
                Changing your {emailChanged && phoneChanged ? 'email and phone' : emailChanged ? 'email' : 'phone'} will
                require you to re-verify your identity before you can continue using your dashboard.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!anyChange || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {needsReverify && (
        <Card className="border-orange-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-600" /> Identity Re-verification Required
            </CardTitle>
            <CardDescription>
              Your contact information changed. Please re-verify your identity to keep your account active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonaVerification
              subject="self"
              subjectRole={subjectRole}
              onComplete={() => {
                toast.success('Verification submitted for review.');
                load();
              }}
            />
          </CardContent>
        </Card>
      )}

      {identityStatus === 'approved' && !needsReverify && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 pl-1">
          <CheckCircle2 className="h-3 w-3 text-green-600" /> Identity verified
        </p>
      )}
    </div>
  );
}

export default ProfileEditor;

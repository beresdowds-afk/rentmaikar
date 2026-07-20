import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserIdentityCard } from '@/components/profile/UserIdentityCard';
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

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? '');
        setPhone(data.phone ?? '');
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: parsed.data.full_name,
          phone: parsed.data.phone || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
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
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading || saving}
                  maxLength={120}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ''} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  To change your email, contact support.
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
              <div className="pt-2">
                <Button onClick={save} disabled={loading || saving}>
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
        </div>
      </main>
      <Footer />
    </div>
  );
}

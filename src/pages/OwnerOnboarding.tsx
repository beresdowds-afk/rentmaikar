import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Car, FileText, DollarSign, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const steps = [
  { icon: Car, title: 'List your first vehicle', desc: 'Add photos, pricing, and specs so drivers can find your car.' },
  { icon: FileText, title: 'Upload registration and insurance', desc: 'We keep your documents on file and remind you before they expire.' },
  { icon: DollarSign, title: 'Set up payouts', desc: 'Add your payout account so we can send earnings every Friday.' },
];

const MAX_ATTEMPTS = 3;

const OwnerOnboarding = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<{ title: string; description: string; code?: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth', { replace: true });
  }, [user, isLoading, navigate]);

  const finish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { error: docErr } = await supabase.rpc('advance_registration_stage', { _target: 'documents_submitted' });
      if (docErr) throw docErr;
      const { error: verErr } = await supabase.rpc('advance_registration_stage', { _target: 'verification_pending' });
      if (verErr) throw verErr;
      toast.success('Submitted for verification', { description: 'Admin will review and unlock full access shortly.' });
      navigate('/owner/dashboard', { replace: true });
    } catch (err) {
      const anyErr = err as { message?: string; code?: string };
      const raw = anyErr?.message || 'Unknown error';
      const lower = raw.toLowerCase();
      const isAuth = lower.includes('jwt') || lower.includes('not authenticated') || anyErr?.code === 'PGRST301';
      const isNetwork = lower.includes('fetch') || lower.includes('network');
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setError({
        title: isAuth
          ? 'Your session expired'
          : isNetwork
            ? 'Connection problem'
            : 'We couldn’t complete your onboarding',
        description: isAuth
          ? 'Please sign in again to finish setting up your account.'
          : isNetwork
            ? 'Check your internet connection and tap Retry.'
            : nextAttempts >= MAX_ATTEMPTS
              ? 'This keeps failing. Contact support with the code below so we can finish this for you.'
              : 'Something went wrong on our side. Tap Retry to try again.',
        code: raw,
      });
      toast.error('Could not complete onboarding', { description: raw });
      setSubmitting(false);
    }
  };

  const buttonLabel = submitting
    ? 'Completing…'
    : error
      ? attempts >= MAX_ATTEMPTS
        ? 'Try one more time'
        : `Retry (attempt ${attempts + 1} of ${MAX_ATTEMPTS})`
      : 'Go to my dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Your owner account is live</CardTitle>
          <CardDescription>Three quick steps to start earning from your vehicle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg border">
              <div className="p-2 rounded-md bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">{i + 1}. {s.title}</h4>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{error.description}</p>
                {error.code && (
                  <code className="block text-xs bg-background/50 rounded p-2 break-all">
                    {error.code}
                  </code>
                )}
                {attempts >= MAX_ATTEMPTS && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/faq')}
                  >
                    Contact support
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button className="w-full" onClick={finish} disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : error ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {buttonLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerOnboarding;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AgreementRegion = 'USA' | 'Nigeria';

interface LegalAgreementTemplate {
  id: string;
  template_key: string;
  agreement_type: string;
  region: AgreementRegion;
  title: string;
  version: string;
  content: string;
  is_active: boolean;
  updated_at: string;
}

const AGREEMENT_TYPE = 'vehicle_rental';

const OnboardingLegalAgreement = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { country } = useRegion();
  const region: AgreementRegion = country === 'Nigeria' ? 'Nigeria' : 'USA';

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<LegalAgreementTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await (supabase as any)
        .from('legal_agreement_templates')
        .select('*')
        .eq('agreement_type', AGREEMENT_TYPE)
        .eq('region', region)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cancelled) return;
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      const latest = (data ?? [])[0] as LegalAgreementTemplate | undefined;
      if (!latest) {
        setError(`No approved ${region} legal agreement template is published yet.`);
        return;
      }
      setTemplate(latest);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [region]);

  const rendered = useMemo(() => {
    if (!template) return '';
    // Simple placeholder substitution for onboarding preview: leave unresolved
    // tokens visible so users understand what will personalize at signing time.
    return template.content;
  }, [template]);

  const handleAccept = async () => {
    if (!template || !user) return;
    setSubmitting(true);
    try {
      const { error: rpcErr } = await supabase.rpc('advance_registration_stage', {
        _target: 'documents_submitted',
      });
      // Non-fatal: stage may already be past this point.
      if (rpcErr && !/already/i.test(rpcErr.message)) {
        console.warn('Stage advance warning:', rpcErr.message);
      }
      toast.success('Agreement acknowledged', {
        description: `You accepted "${template.title}" v${template.version}.`,
      });
      navigate('/onboarding-redirect', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Could not record acceptance', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Rental Agreement</h1>
          <p className="text-muted-foreground">
            Review the latest approved Rentmaikar rental agreement for {region} before continuing.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{template?.title ?? 'Loading agreement…'}</CardTitle>
              <CardDescription>
                {template
                  ? `Version ${template.version} • Region: ${template.region}`
                  : 'Fetching the latest approved template from the Content CMS.'}
              </CardDescription>
            </div>
            {template && (
              <div className="flex gap-2">
                <Badge variant="default">Active</Badge>
                <Badge variant="secondary">v{template.version}</Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}

            {!loading && error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Agreement unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && template && (
              <>
                <ScrollArea className="h-[420px] rounded-md border bg-card p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {rendered}
                  </pre>
                </ScrollArea>

                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    id="accept-agreement"
                    checked={accepted}
                    onCheckedChange={(value) => setAccepted(value === true)}
                  />
                  <label htmlFor="accept-agreement" className="text-sm leading-relaxed cursor-pointer">
                    I have read and agree to the terms of the {template.title} (version {template.version}).
                    I understand a personalized copy will be generated for signing when a vehicle is matched to me.
                  </label>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
                    Back
                  </Button>
                  <Button onClick={handleAccept} disabled={!accepted || submitting} aria-busy={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Accept & continue
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingLegalAgreement;

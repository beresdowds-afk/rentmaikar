import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageSkeleton from '@/components/PageSkeleton';
import PersonaVerification from '@/components/verification/PersonaVerification';
import { useIdentityVerification, type PersonaStatus, type PersonaTimelineEntry } from '@/hooks/useIdentityVerification';
import { useAuth } from '@/contexts/AuthContext';

type StepKey = 'submitted' | 'pending' | 'verified' | 'failed';

interface StepMeta {
  key: StepKey;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  tone: 'muted' | 'active' | 'success' | 'error';
}

function classifyStatus(status: PersonaStatus | null | undefined): StepKey {
  switch (status) {
    case 'approved':
      return 'verified';
    case 'declined':
    case 'expired':
      return 'failed';
    case 'needs_review':
    case 'pending':
      return 'pending';
    case 'created':
    case 'submitted':
      return 'submitted';
    default:
      return status ? 'pending' : 'submitted';
  }
}

const STATUS_BADGE: Record<StepKey, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
  pending: { label: 'In review', className: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  verified: { label: 'Verified', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
  failed: { label: 'Action needed', className: 'bg-red-500/15 text-red-400 border-red-500/40' },
};

function stepsFor(current: StepKey): StepMeta[] {
  const done = (target: StepKey): StepMeta['tone'] => {
    if (current === 'failed' && target !== 'submitted') {
      return target === 'verified' ? 'error' : 'muted';
    }
    const order: StepKey[] = ['submitted', 'pending', 'verified'];
    const idx = order.indexOf(target);
    const cur = order.indexOf(current);
    if (idx < cur) return 'success';
    if (idx === cur) return current === 'verified' ? 'success' : 'active';
    return 'muted';
  };
  return [
    {
      key: 'submitted',
      label: 'Submitted',
      description: 'You started a Persona inquiry with the required identity fields.',
      icon: CheckCircle2,
      tone: done('submitted'),
    },
    {
      key: 'pending',
      label: 'Pending review',
      description: 'Persona is verifying your documents. Most reviews complete in minutes.',
      icon: Clock,
      tone: done('pending'),
    },
    {
      key: current === 'failed' ? 'failed' : 'verified',
      label: current === 'failed' ? 'Action required' : 'Verified',
      description:
        current === 'failed'
          ? 'Verification could not complete. Start a new attempt with corrected details.'
          : 'Marketplace access unlocked once verification is approved.',
      icon: current === 'failed' ? XCircle : ShieldCheck,
      tone: current === 'failed' ? 'error' : done('verified'),
    },
  ];
}

function toneClasses(tone: StepMeta['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
    case 'active':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse';
    case 'error':
      return 'border-red-500/40 bg-red-500/10 text-red-400';
    default:
      return 'border-border bg-muted/30 text-muted-foreground';
  }
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function nextActionCopy(current: StepKey, mismatches: Record<string, unknown> | null | undefined) {
  switch (current) {
    case 'verified':
      return 'You are fully verified. Marketplace features are unlocked.';
    case 'pending':
      return 'No action needed — we\'ll notify you the moment Persona finishes reviewing.';
    case 'failed': {
      const reason = mismatches && typeof mismatches === 'object' && '_decision_reason' in mismatches
        ? String((mismatches as any)._decision_reason)
        : null;
      return reason
        ? `Verification failed: ${reason}. Fix the flagged details and start a new attempt.`
        : 'Verification could not complete. Review the flagged checks below and try again.';
    }
    case 'submitted':
    default:
      return 'Start a Persona verification session to submit your identity documents.';
  }
}

export default function VerificationStatusPage() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isFetching } = useIdentityVerification();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo');

  const current = useMemo<StepKey>(
    () => classifyStatus(data?.latest_inquiry?.status ?? data?.profile_status ?? null),
    [data],
  );

  useEffect(() => {
    if (data?.is_verified && returnTo) {
      toast.success('Identity verified — welcome to the marketplace');
      navigate(decodeURIComponent(returnTo), { replace: true });
    }
  }, [data?.is_verified, returnTo, navigate]);

  if (!user) return <PageSkeleton />;
  if (isLoading || !data) return <PageSkeleton />;

  const steps = stepsFor(current);
  const badge = STATUS_BADGE[current];
  const mismatches = data.latest_inquiry?.mismatch_fields ?? null;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Identity verification</h1>
          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
        </div>
        <p className="text-muted-foreground">
          Persona is the KYC checkpoint that unlocks marketplace features. Track each step below —
          this page updates in real time as your inquiry progresses.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Progress</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className={`flex items-start gap-4 rounded-lg border p-4 ${toneClasses(step.tone)}`}>
                <Icon className="h-6 w-6 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-sm opacity-90">{step.description}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to do next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{nextActionCopy(current, mismatches)}</p>

          {current === 'failed' && mismatches && Object.keys(mismatches).length > 0 && (
            <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-red-400 mb-2">
                <AlertTriangle className="h-4 w-4" /> Flagged checks
              </div>
              <ul className="space-y-1 text-muted-foreground">
                {Object.entries(mismatches).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-mono text-xs">{k}</span>: {typeof v === 'string' ? v : JSON.stringify(v)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {current !== 'verified' && (
              <PersonaVerification
                buttonLabel={current === 'failed' ? 'Start a new verification' : 'Continue verification'}
              />
            )}
            {data.is_verified && returnTo && (
              <Button onClick={() => navigate(decodeURIComponent(returnTo), { replace: true })}>
                Continue to marketplace
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent attempts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.timeline.map((entry: PersonaTimelineEntry, idx) => {
              const step = classifyStatus(entry.status);
              const b = STATUS_BADGE[step];
              return (
                <div key={`${entry.inquiry_id ?? 'noid'}-${idx}`} className="flex items-center justify-between border rounded-md p-3 text-sm">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs text-muted-foreground">
                      {entry.inquiry_id ?? 'pending id'}
                    </div>
                    <div className="text-muted-foreground">
                      Updated {formatWhen(entry.updated_at)}
                      {entry.verified_at ? ` · Verified ${formatWhen(entry.verified_at)}` : ''}
                    </div>
                  </div>
                  <Badge variant="outline" className={b.className}>{b.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useOnboardingProgressReconciliation } from '@/hooks/useOnboardingProgressReconciliation';

/** Fallback UI shown when the server-side onboarding stage disagrees with
 *  what the deep link expected (e.g. app was resumed after admin approval,
 *  or after documents were rejected on another device). */
export function OnboardingReconciliationBanner() {
  const { status, expected, actual, acknowledge, refetch } =
    useOnboardingProgressReconciliation();

  if (status !== 'mismatch') return null;

  return (
    <Alert variant="destructive" data-testid="onboarding-reconciliation-banner">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Your onboarding progress was updated</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          We noticed your account has moved to a different stage since you
          last opened this link. To make sure you see the right options, we
          refreshed your progress.
        </p>
        <p className="text-xs">
          Expected: <span className="font-mono">{expected ?? 'unknown'}</span>
          {' · '}
          Current: <span className="font-mono">{actual ?? 'unknown'}</span>
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={refetch}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={acknowledge} data-testid="reconciliation-dismiss">
            Continue
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default OnboardingReconciliationBanner;

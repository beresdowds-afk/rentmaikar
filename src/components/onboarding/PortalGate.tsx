import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import {
  useRegistrationProgress,
  type RegistrationStage,
  type AccessLevel,
} from '@/hooks/useRegistrationProgress';

type Requirement = 'authenticated' | 'email_verified' | 'documents' | 'approved';

const STAGE_ORDER: Record<RegistrationStage, number> = {
  auth: 0,
  account_opened: 1,
  documents_submitted: 2,
  verification_pending: 3,
  approved: 4,
};

interface Props {
  /** Minimum requirement to render children. Default: 'approved' (full access). */
  require?: Requirement;
  /** Portal name shown in the blocker copy. */
  portal: string;
  /** Optional custom hint text. */
  hint?: string;
  children: ReactNode;
}

const REQUIREMENT_COPY: Record<Requirement, { title: string; hint: string; stage: RegistrationStage; access?: AccessLevel }> = {
  authenticated: {
    title: 'Sign in required',
    hint: 'Please sign in to continue.',
    stage: 'auth',
  },
  email_verified: {
    title: 'Verify your email first',
    hint: 'Confirm your email address to unlock this portal.',
    stage: 'account_opened',
  },
  documents: {
    title: 'Upload required documents',
    hint: 'Submit your identification and required documents to unlock this portal.',
    stage: 'documents_submitted',
  },
  approved: {
    title: 'Complete your onboarding',
    hint: 'Finish verification and wait for admin approval to unlock this portal.',
    stage: 'approved',
    access: 'full',
  },
};

export function PortalGate({ require = 'approved', portal, hint, children }: Props) {
  const { data, isLoading } = useRegistrationProgress();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Checking access…
        </CardContent>
      </Card>
    );
  }

  const req = REQUIREMENT_COPY[require];
  const progress = data;

  const meets = (() => {
    if (!progress?.authenticated) return require === 'authenticated' ? true : false;
    if (require === 'authenticated') return true;
    if (require === 'email_verified') return !!progress.email_verified;
    if (require === 'documents') return STAGE_ORDER[progress.stage] >= STAGE_ORDER['documents_submitted'];
    // 'approved' — full access
    return progress.access_level === 'full' || progress.stage === 'approved';
  })();

  if (meets) return <>{children}</>;

  const onboardingPath = progress?.role === 'owner' ? '/owner/onboarding' : '/driver/onboarding';

  return (
    <Card className="border-dashed">
      <CardContent className="p-6 space-y-4">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>{req.title}</AlertTitle>
          <AlertDescription>
            <span className="font-medium">{portal}</span> is locked until you {hint ?? req.hint.toLowerCase()}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={onboardingPath}>
              Continue onboarding <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/faq">Learn more</Link>
          </Button>
        </div>
        {progress && (
          <p className="text-xs text-muted-foreground">
            Current stage: <span className="font-mono">{progress.stage}</span>
            {progress.application_status && <> · Application: <span className="font-mono">{progress.application_status}</span></>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

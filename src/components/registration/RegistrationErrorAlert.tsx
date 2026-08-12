import { AlertTriangle, RotateCw, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { FriendlyRegistrationError } from '@/lib/registration-errors';

interface Props {
  error: FriendlyRegistrationError;
  onRetry: () => void;
  isRetrying?: boolean;
  /** Where to send an already-registered user after signing in. */
  signInReturnTo?: string;
}

export function RegistrationErrorAlert({ error, onRetry, isRetrying, signInReturnTo }: Props) {
  const signInHref = signInReturnTo
    ? `/auth?returnTo=${encodeURIComponent(signInReturnTo)}`
    : '/auth';
  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error.description}</p>
        <p className="font-mono text-[11px] break-all opacity-80">
          {error.raw}
        </p>
        {error.isDuplicate ? (
          <div>
            <Button type="button" size="sm" variant="outline" asChild className="gap-2">
              <Link to={signInHref}>
                <LogIn className="h-3.5 w-3.5" />
                Sign in instead
              </Link>
            </Button>
          </div>
        ) : (
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying…' : 'Retry submission'}
            </Button>
          </div>
        )}

      </AlertDescription>
    </Alert>
  );
}

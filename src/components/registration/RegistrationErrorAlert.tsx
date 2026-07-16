import { AlertTriangle, RotateCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { FriendlyRegistrationError } from '@/lib/registration-errors';

interface Props {
  error: FriendlyRegistrationError;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function RegistrationErrorAlert({ error, onRetry, isRetrying }: Props) {
  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error.description}</p>
        <p className="font-mono text-[11px] break-all opacity-80">
          {error.raw}
        </p>
        {!error.isDuplicate && (
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

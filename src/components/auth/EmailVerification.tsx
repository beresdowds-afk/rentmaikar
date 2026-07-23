import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationProps {
  /** Override the email to verify. Defaults to the signed-in user's email. */
  email?: string;
  onVerified?: () => void;
  showAsCard?: boolean;
  /** Redirect target for the verification link. Defaults to origin. */
  redirectTo?: string;
}

/**
 * Shared email-verification UI. Reused by dashboards (needing profile.email
 * confirmation) and the sign-in flow (blocked on unverified email).
 * Keeping a single implementation avoids drift between call sites.
 */
export const EmailVerification = ({
  email: emailOverride,
  onVerified,
  showAsCard = true,
  redirectTo,
}: EmailVerificationProps) => {
  const { user } = useAuth();
  const email = emailOverride ?? user?.email ?? '';
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!emailOverride && user) setIsEmailVerified(user.email_confirmed_at !== null);
  }, [user, emailOverride]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendVerification = async () => {
    if (!email || countdown > 0) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo ?? window.location.origin },
      });
      if (error) {
        const msg = /rate|too many|over_email/i.test(error.message)
          ? "You're requesting emails too quickly. Please wait a minute before trying again."
          : error.message;
        toast.error('Could not resend verification email', { description: msg });
        setCountdown(30);
      } else {
        setCountdown(60);
        toast.success('Verification email sent! Check your inbox.');
      }
    } catch (err: any) {
      toast.error('Failed to send verification email. Please try again.');
      setCountdown(30);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (currentUser?.email_confirmed_at) {
        setIsEmailVerified(true);
        await supabase.from('profiles').update({ email_verified: true }).eq('user_id', currentUser.id);
        toast.success('Email verified successfully!');
        onVerified?.();
      } else {
        toast.info('Email not yet verified. Please check your inbox.');
      }
    } catch {
      toast.error('Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {isEmailVerified ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your email <strong>{email}</strong> is verified.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              We sent a verification link to <strong>{email}</strong>. Please check your
              inbox and spam folder.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={handleResendVerification}
              disabled={isLoading || countdown > 0}
              variant="outline"
              size="sm"
              className="flex-1"
              aria-live="polite"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : countdown > 0 ? (
                <Clock className="h-4 w-4 mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
            </Button>

            <Button onClick={handleCheckStatus} disabled={isLoading} size="sm" className="flex-1">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              I've Verified
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Didn't receive the email? Check your spam folder or click "Resend Email".
          </p>
        </div>
      )}
    </div>
  );

  if (!showAsCard) return content;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
            <CardDescription>Verify your email to receive important notifications</CardDescription>
          </div>
          {isEmailVerified && (
            <Badge className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default EmailVerification;

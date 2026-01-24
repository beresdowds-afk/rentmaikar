import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationProps {
  onVerified?: () => void;
  showAsCard?: boolean;
}

export const EmailVerification = ({ onVerified, showAsCard = true }: EmailVerificationProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (user) {
      // Check if email is confirmed from the user object
      setIsEmailVerified(user.email_confirmed_at !== null);
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendVerification = async () => {
    if (!user?.email || countdown > 0) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      setCountdown(60);
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email. Please try again.');
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
        
        // Update profile
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('user_id', currentUser.id);
        
        toast.success('Email verified successfully!');
        onVerified?.();
      } else {
        toast.info('Email not yet verified. Please check your inbox.');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
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
            Your email <strong>{user?.email}</strong> is verified.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Please verify your email address to access all features. Check your inbox for a verification link.
            </AlertDescription>
          </Alert>
          
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">Verification pending</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleResendVerification}
                disabled={isLoading || countdown > 0}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
              </Button>
              
              <Button 
                onClick={handleCheckStatus}
                disabled={isLoading}
                size="sm"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                I've Verified
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Didn't receive the email? Check your spam folder or click "Resend Email"
          </p>
        </div>
      )}
    </div>
  );

  if (!showAsCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
            <CardDescription>
              Verify your email to receive important notifications
            </CardDescription>
          </div>
          {isEmailVerified && (
            <Badge className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default EmailVerification;

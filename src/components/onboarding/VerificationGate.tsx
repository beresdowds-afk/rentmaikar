import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, Phone, CheckCircle, Loader2, RefreshCw, AlertTriangle, 
  ArrowRight, Shield, FileText, User 
} from 'lucide-react';
import { toast } from 'sonner';
import { PhoneVerification } from '@/components/phone/PhoneVerification';

interface VerificationGateProps {
  children: React.ReactNode;
  userType: 'driver' | 'owner';
}

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  registrationComplete: boolean;
}

export const VerificationGate = ({ children, userType }: VerificationGateProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    emailVerified: false,
    phoneVerified: false,
    registrationComplete: false,
  });
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  // Email countdown timer
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  const checkVerificationStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Check email verification from auth
      const emailVerified = user.email_confirmed_at !== null;
      
      // Check phone verification and registration from profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone_verified, phone')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      const phoneVerified = profile?.phone_verified || false;
      
      // Check if user has submitted an application (registration complete)
      const { data: application } = await supabase
        .from('applications')
        .select('id, status')
        .eq('email', user.email)
        .maybeSingle();
      
      const registrationComplete = !!application;
      
      setVerificationStatus({
        emailVerified,
        phoneVerified,
        registrationComplete,
      });
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailVerification = async () => {
    if (!user?.email || emailCountdown > 0) return;
    
    setIsResendingEmail(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      setEmailCountdown(60);
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleCheckEmailStatus = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (currentUser?.email_confirmed_at) {
        setVerificationStatus(prev => ({ ...prev, emailVerified: true }));
        
        // Update profile
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('user_id', currentUser.id);
        
        toast.success('Email verified successfully!');
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

  const handlePhoneVerified = () => {
    setVerificationStatus(prev => ({ ...prev, phoneVerified: true }));
  };

  const handleContinueToRegistration = () => {
    if (userType === 'driver') {
      navigate('/driver/registration');
    } else {
      navigate('/owner/registration');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking verification status...</p>
        </div>
      </div>
    );
  }

  const { emailVerified, phoneVerified, registrationComplete } = verificationStatus;
  const isFullyVerified = emailVerified && phoneVerified;

  // If verified and registration complete, show the actual dashboard
  if (isFullyVerified && registrationComplete) {
    return <>{children}</>;
  }

  // Calculate progress
  const completedSteps = [emailVerified, phoneVerified, registrationComplete].filter(Boolean).length;
  const progress = (completedSteps / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Complete Your {userType === 'driver' ? 'Driver' : 'Owner'} Setup
          </h1>
          <p className="text-muted-foreground">
            Verify your identity to unlock all features and complete your registration
          </p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Setup Progress</span>
                <span className="font-medium">{completedSteps} of 3 complete</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={emailVerified ? 'text-green-600 font-medium' : ''}>Email</span>
                <span className={phoneVerified ? 'text-green-600 font-medium' : ''}>Phone</span>
                <span className={registrationComplete ? 'text-green-600 font-medium' : ''}>Registration</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Email Verification */}
        <Card className={emailVerified ? 'border-green-200 bg-green-50/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  emailVerified ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
                }`}>
                  {emailVerified ? <CheckCircle className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg">Step 1: Verify Email</CardTitle>
                  <CardDescription>
                    Confirm your email address to secure your account
                  </CardDescription>
                </div>
              </div>
              {emailVerified && (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
          </CardHeader>
          {!emailVerified && (
            <CardContent>
              <Alert className="border-yellow-200 bg-yellow-50 mb-4">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  We've sent a verification link to <strong>{user?.email}</strong>. 
                  Please check your inbox and spam folder.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleResendEmailVerification}
                  disabled={isResendingEmail || emailCountdown > 0}
                  variant="outline"
                  className="flex-1"
                >
                  {isResendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {emailCountdown > 0 ? `Resend in ${emailCountdown}s` : 'Resend Email'}
                </Button>
                
                <Button 
                  onClick={handleCheckEmailStatus}
                  disabled={isLoading}
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
            </CardContent>
          )}
        </Card>

        {/* Step 2: Phone Verification */}
        <Card className={phoneVerified ? 'border-green-200 bg-green-50/50' : !emailVerified ? 'opacity-60' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  phoneVerified ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
                }`}>
                  {phoneVerified ? <CheckCircle className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg">Step 2: Verify Phone</CardTitle>
                  <CardDescription>
                    Add your phone number to receive important notifications
                  </CardDescription>
                </div>
              </div>
              {phoneVerified && (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
          </CardHeader>
          {!phoneVerified && emailVerified && (
            <CardContent>
              <PhoneVerification 
                onVerified={handlePhoneVerified} 
                showAsCard={false} 
              />
            </CardContent>
          )}
          {!emailVerified && !phoneVerified && (
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Please complete email verification first to unlock this step.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Step 3: Complete Registration */}
        <Card className={registrationComplete ? 'border-green-200 bg-green-50/50' : !isFullyVerified ? 'opacity-60' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  registrationComplete ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
                }`}>
                  {registrationComplete ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg">Step 3: Complete Registration</CardTitle>
                  <CardDescription>
                    {userType === 'driver' 
                      ? 'Submit your personal details and identification documents' 
                      : 'Add your vehicle details and documentation'
                    }
                  </CardDescription>
                </div>
              </div>
              {registrationComplete && (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
          </CardHeader>
          {!registrationComplete && isFullyVerified && (
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    {userType === 'driver' ? 'What you\'ll need:' : 'What you\'ll provide:'}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {userType === 'driver' ? (
                      <>
                        <li>Valid driver's license</li>
                        <li>Rideshare platform approval (Uber, Lyft, Bolt, etc.)</li>
                        <li>Personal identification details</li>
                        <li>For Nigeria: Police clearance certificate, NIN, BVN</li>
                      </>
                    ) : (
                      <>
                        <li>Vehicle details (make, model, year, color)</li>
                        <li>Vehicle registration documents</li>
                        <li>Insurance with rideshare coverage</li>
                        <li>Desired weekly rental price</li>
                      </>
                    )}
                  </ul>
                </div>
                
                <Button onClick={handleContinueToRegistration} className="w-full gap-2">
                  Continue to Registration
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          )}
          {!isFullyVerified && !registrationComplete && (
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Please complete email and phone verification first to unlock this step.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Already submitted application */}
        {registrationComplete && !isFullyVerified && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your registration is submitted, but please complete identity verification to access your dashboard.
            </AlertDescription>
          </Alert>
        )}

        {/* Security Note */}
        <div className="text-center text-sm text-muted-foreground">
          <Shield className="inline-block h-4 w-4 mr-1" />
          Your information is secure and encrypted
        </div>
      </div>
    </div>
  );
};

export default VerificationGate;

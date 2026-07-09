import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle, User, Shield, Users, ArrowLeft, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import rentmaikarLogo from '@/assets/rentmaikar-logo.jpg';
import { TwoFactorChallenge } from '@/components/auth/TwoFactorChallenge';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['driver', 'owner', 'admin'] as const),
  agreeTerms: z.boolean().refine(val => val, 'You must agree to the Terms of Use and Privacy Policy'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, isLoading: authLoading, userRole, twoFactorVerified, setTwoFactorVerified, check2FAStatus } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState<string>('');
  const [twoFAPhone, setTwoFAPhone] = useState<string>('');
  const [twoFAChannel, setTwoFAChannel] = useState<string>('sms');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect authenticated users (only if 2FA is verified or not required)
  useEffect(() => {
    if (user && !authLoading && twoFactorVerified && !show2FA) {
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'owner') {
        navigate('/owner/dashboard', { replace: true });
      } else if (userRole === 'driver') {
        navigate('/driver/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, authLoading, userRole, navigate, from, twoFactorVerified, show2FA]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'driver',
      agreeTerms: false,
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);
    setShowEmailVerification(false);

    const { error, userId } = await signIn(data.email, data.password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        setUnverifiedEmail(data.email);
        setShowEmailVerification(true);
        setVerificationResent(false);
      } else {
        setError(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    // Check 2FA status
    if (userId) {
      const status = await check2FAStatus(userId);
      if (status && (status.requires_2fa || status.is_setup) && status.has_phone && status.phone) {
        // Show 2FA challenge
        setTwoFAUserId(userId);
        setTwoFAPhone(status.phone);
        setTwoFAChannel(status.preferred_channel);
        setShow2FA(true);
        setIsSubmitting(false);
        return;
      }
    }

    // No 2FA required — mark as verified and proceed
    setTwoFactorVerified(true);
    toast.success('Welcome back!');
    setIsSubmitting(false);
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setIsResendingVerification(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        toast.error('Failed to resend verification email', {
          description: error.message,
        });
      } else {
        setVerificationResent(true);
        toast.success('Verification email sent!', {
          description: 'Please check your inbox and spam folder.',
        });
      }
    } catch (err: any) {
      toast.error('Failed to resend verification email');
    }
    
    setIsResendingVerification(false);
  };

  const handleBackFromVerification = () => {
    setShowEmailVerification(false);
    setUnverifiedEmail('');
    setVerificationResent(false);
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setError(null);

    const { error } = await signUp(data.email, data.password, data.fullName, data.role);

    if (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please log in instead.');
      } else {
        setError(error.message);
      }
    } else {
      toast.success('Account created successfully!', {
        description: 'You can now log in with your credentials.',
      });
      setActiveTab('login');
      signupForm.reset();
    }

    setIsSubmitting(false);
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetEmailSent(true);
        toast.success('Password reset email sent!', {
          description: 'Check your inbox for the reset link.',
        });
      }
    } catch (err: any) {
      setError(err.message);
    }

    setIsSubmitting(false);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setError(null);
    forgotPasswordForm.reset();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Two-Factor Authentication Challenge
  if (show2FA) {
    return (
      <TwoFactorChallenge
        userId={twoFAUserId}
        phone={twoFAPhone}
        channel={twoFAChannel}
        onVerified={() => {
          setShow2FA(false);
          setTwoFactorVerified(true);
          toast.success('Welcome back!');
        }}
        onCancel={async () => {
          setShow2FA(false);
          await supabase.auth.signOut();
        }}
      />
    );
  }

  // Email Verification Required View
  if (showEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-warning" />
            </div>
            <CardTitle className="text-2xl font-display">Verify Your Email</CardTitle>
            <CardDescription>
              Your email address needs to be verified before you can log in
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="border-warning/50 bg-warning/10">
              <Mail className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                We sent a verification link to <strong>{unverifiedEmail}</strong>. 
                Please check your inbox and click the link to verify your account.
              </AlertDescription>
            </Alert>

            {verificationResent ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  A new verification email has been sent! Check your inbox and spam folder.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or request a new one.
                </p>
                <Button
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="gap-2"
                >
                  {isResendingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Verification links expire after 24 hours</li>
                  <li>Add our email to your contacts to prevent spam filtering</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full gap-2" 
              onClick={handleBackFromVerification}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">Reset Password</CardTitle>
            <CardDescription>
              {resetEmailSent 
                ? "Check your email for a reset link"
                : "Enter your email to receive a password reset link"
              }
            </CardDescription>
          </CardHeader>

          {resetEmailSent ? (
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  We've sent a password reset link to <strong>{forgotPasswordForm.getValues('email')}</strong>. 
                  Please check your inbox and click the link to reset your password.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </CardContent>
          ) : (
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    {...forgotPasswordForm.register('email')}
                    disabled={isSubmitting}
                  />
                  {forgotPasswordForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{forgotPasswordForm.formState.errors.email.message}</p>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
          
          <CardFooter className="pt-0">
            <Button 
              variant="ghost" 
              className="w-full gap-2" 
              onClick={handleBackToLogin}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-4">
            <img 
              src={rentmaikarLogo} 
              alt="Rentmaikar" 
              className="h-16 w-auto object-contain"
            />
          </Link>
          <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    {...loginForm.register('email')}
                    disabled={isSubmitting}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Button 
                      type="button"
                      variant="link" 
                      className="px-0 h-auto text-sm text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setError(null);
                      }}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <PasswordInput
                    id="login-password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                    disabled={isSubmitting}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
              </CardContent>
              
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          {/* Signup Tab */}
          <TabsContent value="signup">
            <form onSubmit={signupForm.handleSubmit(handleSignup)}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    {...signupForm.register('fullName')}
                    disabled={isSubmitting}
                  />
                  {signupForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    {...signupForm.register('email')}
                    disabled={isSubmitting}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-role">I am a</Label>
                  <Select
                    value={signupForm.watch('role')}
                    onValueChange={(value: 'driver' | 'owner' | 'admin') => signupForm.setValue('role', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Driver
                        </div>
                      </SelectItem>
                      <SelectItem value="owner">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Vehicle Owner
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Administrator
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    {...signupForm.register('password')}
                    disabled={isSubmitting}
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    {...signupForm.register('confirmPassword')}
                    disabled={isSubmitting}
                  />
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="signup-terms"
                    checked={signupForm.watch('agreeTerms')}
                    onCheckedChange={(checked) => signupForm.setValue('agreeTerms', checked as boolean)}
                    disabled={isSubmitting}
                  />
                  <label htmlFor="signup-terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                      Terms of Use
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {signupForm.formState.errors.agreeTerms && (
                  <p className="text-sm text-destructive">{signupForm.formState.errors.agreeTerms.message}</p>
                )}
              </CardContent>
              
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;

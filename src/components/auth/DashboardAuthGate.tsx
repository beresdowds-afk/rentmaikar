import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

type AppRole =
  | 'admin'
  | 'admin_assistant'
  | 'owner'
  | 'driver'
  | 'legal_support'
  | 'iot_support'
  | 'vehicle_support';

interface Props {
  children: ReactNode;
  /** Roles allowed to view the dashboard. Admins are always allowed. */
  allowedRoles: AppRole[];
  /** Human-readable label used in the sign-in prompt (e.g. "Driver Dashboard"). */
  label: string;
}

/**
 * Renders a friendly sign-in prompt for anonymous visitors and a
 * "wrong role" prompt for signed-in users who don't have access,
 * instead of showing empty/partial dashboard content.
 */
export function DashboardAuthGate({ children, allowedRoles, label }: Props) {
  const { user, isLoading, userRole, isRoleLoading } = useAuth();
  const location = useLocation();

  if (isLoading || (user && isRoleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const effectiveAllowed: AppRole[] = Array.from(new Set([...allowedRoles, 'admin']));

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="max-w-md w-full border-primary/20">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Sign in to view your {label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                This page shows personalized rental, payment and vehicle
                information. Please sign in to your Rentmaikar account to
                continue.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild className="gap-2">
                  <Link to="/auth" state={{ from: location }}>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (userRole && !effectiveAllowed.includes(userRole)) {
    const roleHome: Record<AppRole, string> = {
      admin: '/admin',
      admin_assistant: '/admin-assistant',
      owner: '/owner/dashboard',
      driver: '/driver/dashboard',
      legal_support: '/support/legal',
      iot_support: '/support/iot',
      vehicle_support: '/support/vehicle',
    };
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="max-w-md w-full border-destructive/30">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>You don’t have access to the {label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your account is registered as{' '}
                <span className="font-semibold">{userRole.replace('_', ' ')}</span>.
                Please head to your own workspace instead.
              </p>
              <Button asChild>
                <Link to={roleHome[userRole]}>Go to my dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
}

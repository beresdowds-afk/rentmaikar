import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { NotificationPreferences } from '@/components/phone/NotificationPreferences';
import { RegistrationProgressPanel } from './RegistrationProgressPanel';
import type { RegistrationProgress } from '@/hooks/useRegistrationProgress';

const DRIVER_TILES = [
  { title: 'Active rentals', desc: 'View your rental agreement and vehicle assignment.' },
  { title: 'Payments & billing', desc: 'Make weekly/daily payments and review receipts.' },
  { title: 'Vehicle tracking', desc: 'Live GPS and IoT telemetry for your rented vehicle.' },
  { title: 'Rideshare uploads', desc: 'Submit weekly Uber/Lyft rating and performance proof.' },
  { title: 'Inspections', desc: 'File weekly inspection photos and incident reports.' },
  { title: 'Support & voice calls', desc: 'Chat with admin and use in-app voice calling.' },
];

const OWNER_TILES = [
  { title: 'My vehicles', desc: 'Register vehicles and manage listings.' },
  { title: 'Earnings & payouts', desc: 'Track weekly earnings and request withdrawals.' },
  { title: 'IoT devices', desc: 'Purchase and manage vehicle tracking devices.' },
  { title: 'Weekly reports', desc: 'Review driver inspection submissions.' },
  { title: 'Insurance & subscriptions', desc: 'Enroll in insurance and driver training plans.' },
  { title: 'Pickup logistics', desc: 'Configure vehicle pickup locations.' },
];

export function ViewOnlyDashboardShell({
  role,
  progress,
}: {
  role: 'driver' | 'owner';
  progress: RegistrationProgress;
}) {
  const tiles = role === 'driver' ? DRIVER_TILES : OWNER_TILES;
  const label = role === 'driver' ? 'Driver' : 'Owner';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold">Welcome to your {label} dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Preview mode — full functionality unlocks after verification & approval.
            </p>
          </div>

          <RegistrationProgressPanel progress={progress} role={role} />

          <div>
            <h2 className="text-xl font-semibold mb-3">What you'll unlock</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((t) => (
                <Card key={t.title} className="opacity-70">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </Badge>
                    </div>
                    <CardDescription>{t.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>You can update this any time.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileEditor />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose how we reach you.</CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationPreferences />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

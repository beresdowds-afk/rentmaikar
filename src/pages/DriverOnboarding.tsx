import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Car, Shield, CreditCard, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const steps = [
  { icon: Car, title: 'Browse available vehicles', desc: 'Find a car that matches your rideshare goals in your city.' },
  { icon: Shield, title: 'Complete identity verification', desc: 'Upload your driver license and complete Persona verification.' },
  { icon: CreditCard, title: 'Set up your payment method', desc: 'Add a card or configure a proxy billing account to start renting.' },
];

const DriverOnboarding = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth', { replace: true });
  }, [user, isLoading, navigate]);

  const finish = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc('complete_onboarding');
    if (error) {
      toast.error('Could not complete onboarding', { description: error.message });
      setSubmitting(false);
      return;
    }
    toast.success('Welcome to Rentmaikar!');
    navigate('/driver/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're approved, welcome aboard!</CardTitle>
          <CardDescription>Here's what to do next to start earning on the road.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg border">
              <div className="p-2 rounded-md bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">{i + 1}. {s.title}</h4>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
          <Button className="w-full" onClick={finish} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            Go to my dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverOnboarding;

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Users, GraduationCap, Shield, DollarSign, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price: number;
  currency: string;
  billing_interval: string;
  region: string;
  eligible_roles: string[];
  is_active: boolean;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  payment_reference: string | null;
  payment_method: string | null;
  auto_renew: boolean;
}

export const SubscriptionManagement = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [plansRes, subsRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("plan_type"),
      supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false }),
    ]);

    if (plansRes.data) setPlans(plansRes.data);
    if (subsRes.data) setSubscriptions(subsRes.data);
    setLoading(false);
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    const { error } = await supabase
      .from("subscription_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);

    if (error) {
      toast.error("Failed to update plan");
    } else {
      toast.success(`Plan ${plan.is_active ? "deactivated" : "activated"}`);
      fetchData();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "expired": return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled": return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const trainingPlans = plans.filter(p => p.plan_type === "training");
  const roadsidePlans = plans.filter(p => p.plan_type === "roadside_support");

  const activeTrainingSubs = subscriptions.filter(s => {
    const plan = plans.find(p => p.id === s.plan_id);
    return plan?.plan_type === "training" && s.status === "active";
  }).length;

  const activeRoadsideSubs = subscriptions.filter(s => {
    const plan = plans.find(p => p.id === s.plan_id);
    return plan?.plan_type === "roadside_support" && s.status === "active";
  }).length;

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Plans</p>
              <p className="text-xl font-bold">{plans.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-xl font-bold">{subscriptions.filter(s => s.status === "active").length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Training Subscribers</p>
              <p className="text-xl font-bold">{activeTrainingSubs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roadside Support</p>
              <p className="text-xl font-bold">{activeRoadsideSubs}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers ({subscriptions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="space-y-6">
            {/* Training Plans */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Driver Training Plans</h3>
                <Badge variant="secondary">Mandatory + 6-Month Refresh</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {trainingPlans.map(plan => (
                  <div key={plan.id} className={`p-4 rounded-lg border-2 ${plan.is_active ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/50 opacity-60"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{plan.region === "USA" ? "🇺🇸" : "🇳🇬"}</span>
                        <h4 className="font-semibold">{plan.region}</h4>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => togglePlanStatus(plan)}>
                        {plan.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold">
                        {plan.currency === "USD" ? "$" : "₦"}{plan.price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/ {plan.billing_interval}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{plan.eligible_roles.join(", ")}</Badge>
                      {plan.is_active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Roadside Support Plans */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Roadside Support Plans</h3>
                <Badge variant="secondary">USA Only</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {roadsidePlans.map(plan => (
                  <div key={plan.id} className={`p-4 rounded-lg border-2 ${plan.is_active ? "border-orange-300/50 bg-orange-50/50" : "border-muted bg-muted/50 opacity-60"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🇺🇸</span>
                        <h4 className="font-semibold">{plan.name}</h4>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => togglePlanStatus(plan)}>
                        {plan.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/ {plan.billing_interval}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{plan.eligible_roles.join(", ")}</Badge>
                      {plan.is_active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Subscribers</h3>
            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No subscriptions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(sub => {
                  const plan = plans.find(p => p.id === sub.plan_id);
                  return (
                    <div key={sub.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(sub.status)}
                        <div>
                          <p className="font-medium">{plan?.name || "Unknown Plan"}</p>
                          <p className="text-xs text-muted-foreground">
                            User: {sub.user_id.slice(0, 8)}... • Expires: {new Date(sub.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sub.status === "active" ? "default" : "secondary"}>{sub.status}</Badge>
                        {sub.auto_renew && <Badge variant="outline" className="text-xs">Auto-renew</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

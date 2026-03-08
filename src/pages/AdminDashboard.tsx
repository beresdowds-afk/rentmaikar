import { useState } from "react";
import { Shield, Car, Users, DollarSign, AlertTriangle, CheckCircle, Clock, Eye, CreditCard, Wallet, Mail, Loader2, RefreshCw, TrendingUp, HelpCircle, Inbox, Phone, Headphones } from "lucide-react";
import { CallCenterPage } from "@/components/admin/voip/CallCenterPage";
import { HardwareManagement } from "@/components/admin/HardwareManagement";
import { AssetsRegistry } from "@/components/admin/AssetsRegistry";
import { CategoryPricing } from "@/components/admin/CategoryPricing";
import { SecretsManagement } from "@/components/admin/SecretsManagement";
import { ApiKeyManagement } from "@/components/admin/ApiKeyManagement";
import { WebhookManagement } from "@/components/admin/WebhookManagement";
import { ApiEndpointManagement } from "@/components/admin/ApiEndpointManagement";
import { InsuranceSupportDashboard } from "@/components/admin/InsuranceSupportDashboard";
import { PaymentAccountsSupportDashboard } from "@/components/admin/PaymentAccountsSupportDashboard";
import { ExpiryNotificationsWidget } from "@/components/admin/ExpiryNotificationsWidget";
import { NigeriaDriverVerification } from "@/components/admin/NigeriaDriverVerification";
import { PoliceReportVerification } from "@/components/admin/PoliceReportVerification";
import { SocialMediaManagement } from "@/components/admin/SocialMediaManagement";
import { IoTDeviceOrders } from "@/components/admin/IoTDeviceOrders";
import { DeviceOrderRevenue } from "@/components/admin/DeviceOrderRevenue";
import { UserAccountsView } from "@/components/admin/UserAccountsView";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { DailyPlanManagement } from "@/components/admin/DailyPlanManagement";
import { AdminIncidentManagement } from "@/components/admin/AdminIncidentManagement";
import { VehicleRecallManagement } from "@/components/admin/VehicleRecallManagement";
import { AdminWeeklyReportManagement } from "@/components/admin/AdminWeeklyReportManagement";
import { AdminPriceNegotiation } from "@/components/negotiation/AdminPriceNegotiation";
import LegalAgreementsManagement from "@/components/admin/LegalAgreementsManagement";
import { RentToOwnManagement } from "@/components/admin/RentToOwnManagement";
import { FAQManagement } from "@/components/admin/FAQManagement";
import { PolicyManagement } from "@/components/admin/PolicyManagement";
import { AdminUnifiedInbox } from "@/components/admin/AdminUnifiedInbox";
import { AdminContactSettings } from "@/components/admin/AdminContactSettings";
import { AdminSupportTaskManagement } from "@/components/admin/AdminSupportTaskManagement";
import { AdminTaskPortal } from "@/components/admin/portal/AdminTaskPortal";
import { VehiclePickupManagement } from "@/components/admin/VehiclePickupManagement";
import { ApplicationManagement } from "@/components/admin/ApplicationManagement";
import { PortalNavigation, type PortalType } from "@/components/admin/PortalNavigation";
import { TrainingModuleManagement } from "@/components/admin/TrainingModuleManagement";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { RoadsidePartnerManagement } from "@/components/admin/RoadsidePartnerManagement";
import { PortalAnalyticsCards } from "@/components/admin/PortalAnalyticsCards";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import AdminOnboardingTour from "@/components/onboarding/AdminOnboardingTour";
import { useAdminOnboardingTour } from "@/hooks/useAdminOnboardingTour";
import { MessagingDocs } from "@/components/admin/docs/MessagingDocs";
import { EmailDocs } from "@/components/admin/docs/EmailDocs";
import { VoIPDocs } from "@/components/admin/docs/VoIPDocs";
import { AdminSecurityDashboard } from "@/components/admin/AdminSecurityDashboard";
import RegionalOperationsManagement from "@/components/admin/RegionalOperationsManagement";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VehicleTrackingMap from "@/components/tracking/VehicleTrackingMap";
import { PaymentDefaultAlert } from "@/components/payment/PaymentDefaultAlert";
import { PaymentBreakdownCard } from "@/components/payment/PaymentBreakdownCard";
import { type PaymentDefault } from "@/lib/payment-config";
import { useRegion } from "@/contexts/RegionContext";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminDailyTodoList } from "@/components/admin/AdminDailyTodoList";
import { VehicleMqttCredentials } from "@/components/admin/VehicleMqttCredentials";
import { DriverBehaviorLogs } from "@/components/admin/DriverBehaviorLogs";
import { CronJobManagement } from "@/components/admin/CronJobManagement";
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner';

// Mock financial data - in production, this would come from the database
const mockFinancialData = {
  // Monthly income (from drivers - base rate + admin fee)
  income: {
    usd: 28320,
    ngn: 31200000,
  },
  // Monthly payouts to owners (base rate - management fee)
  ownerPayouts: {
    usd: 16992, // 60% of driver payments go to owners
    ngn: 18720000,
  },
  // Admin withdrawals (platform earnings = 40% of total)
  adminWithdrawals: {
    weekly: {
      usd: 2832,
      ngn: 3120000,
    },
    monthly: {
      usd: 11328, // 40% platform fee
      ngn: 12480000,
    },
  },
};

interface PendingApproval {
  id: number;
  type: "Driver" | "Vehicle" | "Owner";
  name: string;
  email: string;
  location: string;
  status: "pending" | "approved" | "rejected";
}

const initialPendingApprovals: PendingApproval[] = [
  { id: 1, type: "Driver", name: "John D.", email: "john.d@example.com", location: "Maryland", status: "pending" },
  { id: 2, type: "Owner", name: "Toyota Camry Owner", email: "owner@example.com", location: "Lagos", status: "pending" },
  { id: 3, type: "Driver", name: "Sarah M.", email: "sarah.m@example.com", location: "Abuja", status: "pending" },
];

// Mock payment defaults with proper structure
const paymentDefaults: PaymentDefault[] = [
  { 
    id: "DEF-001",
    driverId: "DRV-001",
    vehicleId: "VEH-001",
    rentalId: "RNT-001",
    amountDue: 96,
    currency: "USD",
    paymentFrequency: "weekly",
    hoursOverdue: 48,
    notificationsSent: 2,
    lastNotificationAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    deactivationEligible: false,
    status: "active",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  { 
    id: "DEF-002",
    driverId: "DRV-002",
    vehicleId: "VEH-002",
    rentalId: "RNT-002",
    amountDue: 48000,
    currency: "NGN",
    paymentFrequency: "daily",
    hoursOverdue: 36,
    notificationsSent: 3,
    lastNotificationAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    deactivationEligible: true,
    status: "active",
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
  },
  { 
    id: "DEF-003",
    driverId: "DRV-003",
    vehicleId: "VEH-003",
    rentalId: "RNT-003",
    amountDue: 72,
    currency: "USD",
    paymentFrequency: "weekly",
    hoursOverdue: 24,
    notificationsSent: 1,
    deactivationEligible: false,
    status: "active",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const AdminDashboard = () => {
  const _region = useRegion();
  const { rates, isLoading: ratesLoading, convertToUSD, refetch: refetchRates } = useCurrencyConversion();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(initialPendingApprovals);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [portalView, setPortalView] = useState<PortalType>('support');
  const [activeTab, setActiveTab] = useState<string>('task-portal');
  const { isOpen: isTourOpen, completeTour, resetTour } = useAdminOnboardingTour();

  // Calculate converted values
  const incomeNgnInUsd = convertToUSD(mockFinancialData.income.ngn, 'NGN');
  const totalIncomeUsd = mockFinancialData.income.usd + incomeNgnInUsd;

  const payoutsNgnInUsd = convertToUSD(mockFinancialData.ownerPayouts.ngn, 'NGN');
  const totalPayoutsUsd = mockFinancialData.ownerPayouts.usd + payoutsNgnInUsd;

  const weeklyWithdrawalsNgnInUsd = convertToUSD(mockFinancialData.adminWithdrawals.weekly.ngn, 'NGN');
  const totalWeeklyWithdrawalsUsd = mockFinancialData.adminWithdrawals.weekly.usd + weeklyWithdrawalsNgnInUsd;

  const monthlyWithdrawalsNgnInUsd = convertToUSD(mockFinancialData.adminWithdrawals.monthly.ngn, 'NGN');
  const totalMonthlyWithdrawalsUsd = mockFinancialData.adminWithdrawals.monthly.usd + monthlyWithdrawalsNgnInUsd;

  const handleApproval = async (item: PendingApproval) => {
    setApprovingId(item.id);
    
    try {
      // Determine the user type based on the approval type
      const userType = item.type === "Owner" ? "owner" : "driver";
      const region = item.location.includes("Lagos") || item.location.includes("Abuja") || item.location.includes("Port Harcourt") 
        ? "NIGERIA" 
        : "USA";

      // Send approval notification email
      const { data, error } = await supabase.functions.invoke("send-approval-notification", {
        body: {
          email: item.email,
          name: item.name,
          userType,
          region,
        },
      });

      if (error) {
        throw error;
      }

      // Update the approval status locally
      setPendingApprovals(prev => 
        prev.map(approval => 
          approval.id === item.id 
            ? { ...approval, status: "approved" as const }
            : approval
        )
      );

      toast.success(`${item.type} approved successfully!`, {
        description: `Notification email sent to ${item.email}`,
        icon: <Mail className="h-4 w-4" />,
      });
    } catch (error: any) {
      console.error("Error approving:", error);
      toast.error("Failed to send notification", {
        description: error.message || "Please try again",
      });
    } finally {
      setApprovingId(null);
    }
  };
  
  const pendingItems = pendingApprovals.filter(item => item.status === "pending");
  const approvedItems = pendingApprovals.filter(item => item.status === "approved");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground">Manage vehicles, drivers, and payments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch 
                onNavigate={(portal, tab) => {
                  setPortalView(portal);
                  setActiveTab(tab);
                }}
              />
              <Button variant="outline" size="sm" onClick={resetTour} className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Tour
              </Button>
            </div>
          </div>

          {/* Install App Banner */}
          <div className="mb-6">
            <InstallAppBanner appName="Rentmaikar Admin" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Active Vehicles */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Vehicles</p>
                  <p className="text-2xl font-bold text-foreground mt-1">156</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-accent">
                  <Car className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Active Drivers */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Drivers</p>
                  <p className="text-2xl font-bold text-foreground mt-1">234</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-success">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Monthly Income - Enhanced with breakdown */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Monthly Income</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={() => {
                            refetchRates();
                            toast.success('Exchange rates refreshed');
                          }}
                        >
                          <RefreshCw className={`h-3 w-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh exchange rate</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ${totalIncomeUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>🇺🇸</span> USD
                  </span>
                  <span className="font-medium">${mockFinancialData.income.usd.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>🇳🇬</span> NGN
                  </span>
                  <span className="font-medium">₦{mockFinancialData.income.ngn.toLocaleString()}</span>
                </div>
                {rates && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Rate: $1 = ₦{rates.USD_NGN.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </Card>

            {/* Monthly Payouts to Owners */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Payouts</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    ${totalPayoutsUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>🇺🇸</span> USD
                  </span>
                  <span className="font-medium">${mockFinancialData.ownerPayouts.usd.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>🇳🇬</span> NGN
                  </span>
                  <span className="font-medium">₦{mockFinancialData.ownerPayouts.ngn.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Paid to owners (60% of income)
                </p>
              </div>
            </Card>

            {/* Admin Withdrawals */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Admin Withdrawals</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ${totalMonthlyWithdrawalsUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Weekly</span>
                  <span className="font-medium">${totalWeeklyWithdrawalsUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="font-medium">${totalMonthlyWithdrawalsUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Platform earnings (40% fee)
                </p>
              </div>
            </Card>

            {/* Admin Balance */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Admin Balance</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    ${(totalIncomeUsd - totalPayoutsUsd).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>🇺🇸</span> USD
                  </span>
                  <span className="font-medium">${(mockFinancialData.income.usd - mockFinancialData.ownerPayouts.usd).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span>🇳🇬</span> NGN
                  </span>
                  <span className="font-medium">₦{(mockFinancialData.income.ngn - mockFinancialData.ownerPayouts.ngn).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Available platform balance
                </p>
              </div>
            </Card>

            {/* Payment Defaults */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Defaults</p>
                  <p className="text-2xl font-bold text-foreground mt-1">7</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-destructive">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Daily To-Do List */}
          <div className="mb-8">
            <AdminDailyTodoList />
          </div>

          {/* Portal Navigation */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <PortalNavigation
                activePortal={portalView}
                activeTab={activeTab}
                onPortalChange={setPortalView}
                onTabChange={setActiveTab}
              />
            </div>
            {/* Independent Quick Access Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={activeTab === 'inbox' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => { setPortalView('support'); setActiveTab('inbox'); }}
              >
                <Inbox className="h-4 w-4" />
                Unified Inbox
              </Button>
              <Button
                variant={activeTab === 'call-center' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => { setPortalView('support'); setActiveTab('call-center'); }}
              >
                <Phone className="h-4 w-4" />
                Call Center
              </Button>
              <Button
                variant={activeTab === 'support-tasks' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => { setPortalView('support'); setActiveTab('support-tasks'); }}
              >
                <Headphones className="h-4 w-4" />
                Support Tasks
              </Button>
            </div>
          </div>

          {/* Portal Analytics Cards */}
          <PortalAnalyticsCards 
            activePortal={portalView} 
            onNavigate={(portal, tab) => {
              setPortalView(portal);
              setActiveTab(tab);
            }}
          />

          {/* Support Portal */}
          {portalView === 'support' && (
            <div className="space-y-6">
              {activeTab === 'task-portal' && <AdminTaskPortal />}
              {activeTab === 'inbox' && <AdminUnifiedInbox />}
              {activeTab === 'call-center' && <CallCenterPage />}
              {activeTab === 'contacts' && <AdminContactSettings />}
              {activeTab === 'support-tasks' && <AdminSupportTaskManagement />}
              {activeTab === 'insurance' && <InsuranceSupportDashboard />}
              {activeTab === 'nigeria-verification' && <NigeriaDriverVerification />}
              {activeTab === 'police-reports' && <PoliceReportVerification />}
              {activeTab === 'payment-accounts' && <PaymentAccountsSupportDashboard />}
              {activeTab === 'expiry-notifications' && <ExpiryNotificationsWidget />}
            </div>
          )}

          {/* CRM Portal */}
          {portalView === 'crm' && (
            <div className="space-y-6">
              {activeTab === 'applications' && <ApplicationManagement />}
              {activeTab === 'accounts' && <UserAccountsView />}
              {activeTab === 'roles' && <RoleManagement />}
              {activeTab === 'negotiations' && <AdminPriceNegotiation />}
              {activeTab === 'approvals' && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Pending Approvals ({pendingItems.length})</h3>
                  
                  {pendingItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                      <p>All approvals have been processed!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.type} • {item.location}</p>
                              <p className="text-xs text-muted-foreground">{item.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline"><Eye className="w-4 h-4" /></Button>
                            <Button 
                              size="sm" 
                              variant="hero"
                              disabled={approvingId === item.id}
                              onClick={() => handleApproval(item)}
                            >
                              {approvingId === item.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {approvedItems.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Recently Approved</h4>
                      <div className="space-y-2">
                        {approvedItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-success" />
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.type} • {item.email}</p>
                              </div>
                            </div>
                            <span className="text-xs text-success font-medium">Email Sent ✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
              {activeTab === 'defaults' && (
                <div className="space-y-4">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <h3 className="text-lg font-semibold">Payment Defaults ({paymentDefaults.length})</h3>
                    </div>
                    <div className="p-3 mb-4 rounded-lg bg-muted text-sm space-y-1">
                      <p><strong>Payment Default Protocol:</strong></p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li>Auto-debit runs daily at 12:01 AM</li>
                        <li><strong>Weekly Plans:</strong> 72-hour lockdown with 3 notifications at 24-hour intervals</li>
                        <li><strong>Daily Plans:</strong> 36-hour lockdown with 3 notifications at 12-hour intervals</li>
                        <li>Daily plans become forbidden after any payment default</li>
                        <li>Deactivation only when vehicle is parked (speed &lt; 2 mph)</li>
                      </ul>
                    </div>
                  </Card>
                  
                  {paymentDefaults.map((paymentDefault) => (
                    <PaymentDefaultAlert
                      key={paymentDefault.id}
                      paymentDefault={paymentDefault}
                      onInitiateDeactivation={() => {
                        toast.info("Deactivation request initiated", {
                          description: `Vehicle ${paymentDefault.vehicleId} will be deactivated when safely parked.`,
                        });
                      }}
                      onContactSupport={() => {
                        toast.info("Contacting driver...", {
                          description: "Opening communication channel.",
                        });
                      }}
                    />
                  ))}
                </div>
              )}
              {activeTab === 'legal-agreements' && <LegalAgreementsManagement />}
              {activeTab === 'rent-to-own' && <RentToOwnManagement />}
              {activeTab === 'content' && (
                <Tabs defaultValue="faq" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="faq">FAQ Management</TabsTrigger>
                    <TabsTrigger value="policies">Policy Versions</TabsTrigger>
                  </TabsList>
                  <TabsContent value="faq">
                    <FAQManagement />
                  </TabsContent>
                  <TabsContent value="policies">
                    <PolicyManagement />
                  </TabsContent>
                </Tabs>
              )}
              {activeTab === 'subscriptions' && <SubscriptionManagement />}
              {activeTab === 'training' && <TrainingModuleManagement />}
              {activeTab === 'roadside-partners' && <RoadsidePartnerManagement />}
            </div>
          )}

          {/* ERP Portal */}
          {portalView === 'erp' && (
            <div className="space-y-6">
              {activeTab === 'tracking' && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Live Vehicle Tracking</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monitor vehicles across DMV states (USA) and Nigeria (Lagos, Abuja, Port Harcourt). 
                    Click on markers to view details and send remote commands.
                  </p>
                  <VehicleTrackingMap />
                </Card>
              )}
              {activeTab === 'assets' && <AssetsRegistry />}
              {activeTab === 'pickup-locations' && <VehiclePickupManagement />}
              {activeTab === 'hardware' && <HardwareManagement />}
              {activeTab === 'mqtt-credentials' && <VehicleMqttCredentials readOnly={false} />}
              {activeTab === 'driver-behavior' && <DriverBehaviorLogs />}
              {activeTab === 'device-orders' && <IoTDeviceOrders />}
              {activeTab === 'device-revenue' && <DeviceOrderRevenue />}
              {activeTab === 'pricing' && <CategoryPricing />}
              {activeTab === 'incidents' && <AdminIncidentManagement />}
              {activeTab === 'recalls' && <VehicleRecallManagement />}
              {activeTab === 'daily-plans' && <DailyPlanManagement />}
              {activeTab === 'weekly-reports' && <AdminWeeklyReportManagement />}
              {activeTab === 'fees' && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Fee Structure & Payment Gateways</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* USA - PayPal */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🇺🇸</span>
                        <h4 className="font-semibold">USA (PayPal)</h4>
                      </div>
                      <PaymentBreakdownCard
                        baseAmount={48}
                        currency="USD"
                        gateway="paypal"
                      />
                      <PaymentBreakdownCard
                        baseAmount={48}
                        currency="USD"
                        gateway="paypal"
                        showOwnerView
                      />
                    </div>

                    {/* Nigeria - Paystack */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🇳🇬</span>
                        <h4 className="font-semibold">Nigeria (Paystack)</h4>
                      </div>
                      <PaymentBreakdownCard
                        baseAmount={25000}
                        currency="NGN"
                        gateway="paystack"
                      />
                      <PaymentBreakdownCard
                        baseAmount={25000}
                        currency="NGN"
                        gateway="paystack"
                        showOwnerView
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <h5 className="font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Schedule
                    </h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Daily Auto-Debit:</strong> 12:01 AM local time</li>
                      <li>• <strong>Owner Payouts:</strong> Every Friday (weekly)</li>
                      <li>• <strong>Platform Fee:</strong> 40% total (20% admin + 20% management)</li>
                    </ul>
                  </div>
                </Card>
              )}
              {activeTab === 'secrets' && <SecretsManagement />}
              {activeTab === 'api-keys' && <ApiKeyManagement />}
              {activeTab === 'webhooks' && <WebhookManagement />}
              {activeTab === 'api-endpoints' && <ApiEndpointManagement />}
              {activeTab === 'security' && <AdminSecurityDashboard />}
              {activeTab === 'cron-jobs' && <CronJobManagement />}
              {activeTab === 'settings' && <RegionalOperationsManagement />}
            </div>
          )}

          {/* Marketing Portal */}
          {portalView === 'marketing' && (
            <div className="space-y-6">
              {activeTab === 'campaigns' && <SocialMediaManagement />}
              {activeTab === 'facebook' && <SocialMediaManagement />}
              {activeTab === 'instagram' && <SocialMediaManagement />}
              {activeTab === 'linkedin' && <SocialMediaManagement />}
              {activeTab === 'google' && <SocialMediaManagement />}
            </div>
          )}

          {/* Docs Portal */}
          {portalView === 'docs' && (
            <div className="space-y-6">
              {activeTab === 'messaging-docs' && <MessagingDocs />}
              {activeTab === 'email-docs' && <EmailDocs />}
              {activeTab === 'voip-docs' && <VoIPDocs />}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <AdminOnboardingTour isOpen={isTourOpen} onComplete={completeTour} />
    </div>
  );
};

export default AdminDashboard;

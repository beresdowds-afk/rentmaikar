import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Car, Users, DollarSign, AlertTriangle, CheckCircle, Clock, MapPin, Power, Eye, CreditCard, Wallet, Globe, Settings, Mail, Loader2, Cpu, HandshakeIcon, ClipboardList, Tag, KeyRound, Package, UserCircle, RefreshCw, TrendingUp, Ban, Wrench, WifiOff, Camera, BarChart3, Home, Inbox, MessageSquare, HelpCircle, Headphones, LayoutGrid, Phone } from "lucide-react";
import { CallCenterPage } from "@/components/admin/voip/CallCenterPage";
import { HardwareManagement } from "@/components/admin/HardwareManagement";
import { AssetsRegistry } from "@/components/admin/AssetsRegistry";
import { CategoryPricing } from "@/components/admin/CategoryPricing";
import { SecretsManagement } from "@/components/admin/SecretsManagement";
import { IoTDeviceOrders } from "@/components/admin/IoTDeviceOrders";
import { DeviceOrderRevenue } from "@/components/admin/DeviceOrderRevenue";
import { UserAccountsView } from "@/components/admin/UserAccountsView";
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
import AdminOnboardingTour from "@/components/onboarding/AdminOnboardingTour";
import { useAdminOnboardingTour } from "@/hooks/useAdminOnboardingTour";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VehicleTrackingMap from "@/components/tracking/VehicleTrackingMap";
import { PaymentDefaultAlert } from "@/components/payment/PaymentDefaultAlert";
import { PaymentBreakdownCard } from "@/components/payment/PaymentBreakdownCard";
import { type PaymentDefault } from "@/lib/payment-config";
import { useRegion, type Country } from "@/contexts/RegionContext";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const { country, setCountry, regionMode, setRegionMode, isDetecting } = useRegion();
  const { rates, isLoading: ratesLoading, convertToUSD, formatWithConversion, refetch: refetchRates } = useCurrencyConversion();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(initialPendingApprovals);
  const [approvingId, setApprovingId] = useState<number | null>(null);
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
          <div className="flex items-center justify-between mb-8">
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
            <Button variant="outline" size="sm" onClick={resetTour} className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Tour
            </Button>
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

          <Tabs defaultValue="task-portal" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="task-portal" className="flex items-center gap-1" data-tour="admin-portal">
                <LayoutGrid className="h-4 w-4" />
                Task Portal
              </TabsTrigger>
              <TabsTrigger value="tracking">Vehicle Tracking</TabsTrigger>
              <TabsTrigger value="inbox" className="flex items-center gap-1" data-tour="admin-inbox">
                <Inbox className="h-4 w-4" />
                Unified Inbox
              </TabsTrigger>
              <TabsTrigger value="call-center" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Call Center
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-1" data-tour="admin-contacts">
                <MessageSquare className="h-4 w-4" />
                Contact Settings
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-1" data-tour="admin-accounts">
                <UserCircle className="h-4 w-4" />
                User Accounts
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-1" data-tour="admin-assets">
                <ClipboardList className="h-4 w-4" />
                Assets Registry
              </TabsTrigger>
              <TabsTrigger value="hardware" className="flex items-center gap-1">
                <Cpu className="h-4 w-4" />
                Hardware
              </TabsTrigger>
              <TabsTrigger value="device-orders" className="flex items-center gap-1" data-tour="admin-device-orders">
                <Package className="h-4 w-4" />
                Device Orders
              </TabsTrigger>
              <TabsTrigger value="device-revenue" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Device Revenue
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Category Pricing
              </TabsTrigger>
              <TabsTrigger value="negotiations" className="flex items-center gap-1" data-tour="admin-negotiations">
                <HandshakeIcon className="h-4 w-4" />
                Negotiations
              </TabsTrigger>
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="defaults">Payment Defaults</TabsTrigger>
              <TabsTrigger value="incidents" className="flex items-center gap-1" data-tour="admin-incidents">
                <Wrench className="h-4 w-4" />
                Incidents
              </TabsTrigger>
              <TabsTrigger value="recalls" className="flex items-center gap-1">
                <WifiOff className="h-4 w-4" />
                Vehicle Recalls
              </TabsTrigger>
              <TabsTrigger value="daily-plans" className="flex items-center gap-1">
                <Ban className="h-4 w-4" />
                Daily Plans
              </TabsTrigger>
              <TabsTrigger value="weekly-reports" className="flex items-center gap-1" data-tour="admin-inspections">
                <Camera className="h-4 w-4" />
              Weekly Reports
              </TabsTrigger>
              <TabsTrigger value="legal-agreements" className="flex items-center gap-1" data-tour="admin-agreements">
                <ClipboardList className="h-4 w-4" />
                Legal Agreements
              </TabsTrigger>
              <TabsTrigger value="rent-to-own" className="flex items-center gap-1" data-tour="admin-rto">
                <Home className="h-4 w-4" />
                Rent to Own
              </TabsTrigger>
              <TabsTrigger value="fees">Fee Structure</TabsTrigger>
              <TabsTrigger value="support-tasks" className="flex items-center gap-1">
                <Headphones className="h-4 w-4" />
                Support Tasks
              </TabsTrigger>
              <TabsTrigger value="secrets" className="flex items-center gap-1">
                <KeyRound className="h-4 w-4" />
                API Secrets
              </TabsTrigger>
              <TabsTrigger value="settings">Region Settings</TabsTrigger>
              <TabsTrigger value="content">Content CMS</TabsTrigger>
            </TabsList>

            <TabsContent value="task-portal">
              <AdminTaskPortal />
            </TabsContent>

            <TabsContent value="tracking">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Live Vehicle Tracking</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor vehicles across DMV states (USA) and Nigeria (Lagos, Abuja, Port Harcourt). 
                  Click on markers to view details and send remote commands.
                </p>
                <VehicleTrackingMap />
              </Card>
            </TabsContent>

            <TabsContent value="inbox">
              <AdminUnifiedInbox />
            </TabsContent>

            <TabsContent value="call-center">
              <CallCenterPage />
            </TabsContent>

            <TabsContent value="contacts">
              <AdminContactSettings />
            </TabsContent>

            <TabsContent value="accounts">
              <UserAccountsView />
            </TabsContent>

            <TabsContent value="assets">
              <AssetsRegistry />
            </TabsContent>

            <TabsContent value="hardware">
              <HardwareManagement />
            </TabsContent>

            <TabsContent value="device-orders">
              <IoTDeviceOrders />
            </TabsContent>

            <TabsContent value="device-revenue">
              <DeviceOrderRevenue />
            </TabsContent>

            <TabsContent value="pricing">
              <CategoryPricing />
            </TabsContent>

            <TabsContent value="negotiations">
              <AdminPriceNegotiation />
            </TabsContent>

            <TabsContent value="approvals">
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
            </TabsContent>

            <TabsContent value="defaults">
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
            </TabsContent>

            <TabsContent value="incidents">
              <AdminIncidentManagement />
            </TabsContent>

            <TabsContent value="recalls">
              <VehicleRecallManagement />
            </TabsContent>

            <TabsContent value="daily-plans">
              <DailyPlanManagement />
            </TabsContent>

            <TabsContent value="weekly-reports">
              <AdminWeeklyReportManagement />
            </TabsContent>

            <TabsContent value="legal-agreements">
              <LegalAgreementsManagement />
            </TabsContent>

            <TabsContent value="rent-to-own">
              <RentToOwnManagement />
            </TabsContent>

            <TabsContent value="fees">
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
            </TabsContent>

            <TabsContent value="support-tasks">
              <AdminSupportTaskManagement />
            </TabsContent>

            <TabsContent value="secrets">
              <SecretsManagement />
            </TabsContent>

            <TabsContent value="settings">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Region Detection Settings</h3>
                </div>

                <div className="space-y-6">
                  {/* Auto vs Manual Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <Label htmlFor="region-mode" className="text-base font-medium">
                        Automatic Region Detection
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {regionMode === "auto" 
                          ? "Region is detected automatically using IP address geolocation"
                          : "Region is manually selected by users or admins"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Manual</span>
                      <Switch
                        id="region-mode"
                        checked={regionMode === "auto"}
                        onCheckedChange={(checked) => {
                          setRegionMode(checked ? "auto" : "manual");
                          toast.success(`Region detection set to ${checked ? "automatic" : "manual"}`);
                        }}
                      />
                      <span className="text-sm text-muted-foreground">Auto</span>
                    </div>
                  </div>

                  {/* Current Region Status */}
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe className="h-5 w-5 text-accent" />
                      <h4 className="font-medium">Current Region Status</h4>
                      {isDetecting && (
                        <span className="px-2 py-1 text-xs rounded-full bg-warning/10 text-warning animate-pulse">
                          Detecting...
                        </span>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Active Region</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl">{country === "USA" ? "🇺🇸" : "🇳🇬"}</span>
                          <span className="font-semibold">{country}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Detection Mode</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${regionMode === "auto" ? "bg-green-500" : "bg-yellow-500"}`} />
                          <span className="font-medium capitalize">{regionMode}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Override (only in manual mode) */}
                  {regionMode === "manual" && (
                    <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                      <Label className="text-sm font-medium mb-2 block">Manual Region Override</Label>
                      <Select
                        value={country}
                        onValueChange={(value: Country) => {
                          setCountry(value);
                          toast.success(`Region changed to ${value}`);
                        }}
                      >
                        <SelectTrigger className="w-full md:w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USA">
                            <span className="flex items-center gap-2">
                              <span>🇺🇸</span> United States (USD)
                            </span>
                          </SelectItem>
                          <SelectItem value="Nigeria">
                            <span className="flex items-center gap-2">
                              <span>🇳🇬</span> Nigeria (NGN)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        This will override the detected region for all users visiting the platform.
                      </p>
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <h5 className="font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      How Region Detection Works
                    </h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Automatic Mode:</strong> Uses IP geolocation (ip-api.com) to detect user's country</li>
                      <li>• <strong>Manual Mode:</strong> Users can select their region, or admin can override for all</li>
                      <li>• <strong>Fallback:</strong> If IP detection fails, timezone is used as backup</li>
                      <li>• <strong>Supported Regions:</strong> USA (PayPal/USD) and Nigeria (Paystack/NGN)</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Content Management Tab */}
            <TabsContent value="content">
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      <AdminOnboardingTour isOpen={isTourOpen} onComplete={completeTour} />
    </div>
  );
};

export default AdminDashboard;

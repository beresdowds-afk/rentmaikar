import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useRegion } from '@/contexts/RegionContext';
import { formatCurrency, PAYMENT_CONFIG } from '@/lib/payment-config';
import { PaymentOptionsSelector, type PaymentSelection } from '@/components/payment/PaymentOptionsSelector';
import { DriverPriceNegotiation } from '@/components/negotiation/DriverPriceNegotiation';
import { PhoneVerification } from '@/components/phone/PhoneVerification';
import { EmailVerification } from '@/components/auth/EmailVerification';
import { NotificationPreferences } from '@/components/phone/NotificationPreferences';
import { IncidentReportForm } from '@/components/incidents/IncidentReportForm';
import { WeeklyInspectionReport } from '@/components/inspection/WeeklyInspectionReport';
import UserAgreementsList from '@/components/legal/UserAgreementsList';
import { RentToOwnSearch } from '@/components/driver/RentToOwnSearch';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import SupportChatWidget from '@/components/support/SupportChatWidget';
import { PaymentReminderPreview } from '@/components/payment/PaymentReminderPreview';
import { CallSupportButton } from '@/components/support/CallSupportButton';
import { VerificationGate } from '@/components/onboarding/VerificationGate';
import { AdminViewBanner } from '@/components/admin/AdminViewBanner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Car,
  CreditCard,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Phone,
  DollarSign,
  TrendingUp,
  FileText,
  Bell,
  Settings,
  Wrench,
  Camera,
  Home,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data for the driver dashboard
const mockRentalData = {
  vehicle: {
    id: 'v-001',
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    plateNumber: 'ABC-123',
    category: 'Top Earner',
    image: '/placeholder.svg',
  },
  rental: {
    id: 'r-001',
    startDate: '2025-01-10',
    dailyRate: 50, // Base daily rate
    weeklyRate: 300, // Base weekly rate
    paymentFrequency: 'weekly' as const,
    status: 'active' as const,
    nextPaymentDate: '2025-01-17',
    totalPaid: 720,
    daysActive: 14,
  },
  payments: [
    { id: 'p-001', date: '2025-01-10', amount: 360, status: 'completed', method: 'paypal' },
    { id: 'p-002', date: '2025-01-17', amount: 360, status: 'completed', method: 'paypal' },
  ],
  priceNegotiation: {
    id: 'pn-001',
    requestedRate: 280,
    currentRate: 300,
    status: 'pending' as const,
    submittedAt: '2025-01-15',
    reason: 'Market rates have dropped in my area',
  },
};

export default function DriverDashboard() {
  const { country, currency, currencySymbol } = useRegion();
  const { user, userRole } = useAuth();
  const isAdminView = userRole === 'admin';
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const isUSA = country === 'USA';
  const rental = mockRentalData.rental;
  const vehicle = mockRentalData.vehicle;

  // Fetch phone verification status
  useEffect(() => {
    const fetchPhoneStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setPhoneVerified(data.phone_verified || false);
      }
    };
    fetchPhoneStatus();
  }, [user]);

  // Calculate amounts based on region
  const weeklyRate = isUSA ? 300 : 150000; // USD or NGN
  const adminFee = weeklyRate * (PAYMENT_CONFIG.ADMIN_FEE_PERCENT / 100);
  const totalDue = weeklyRate + adminFee;

  const handlePaymentSubmit = async (selection: PaymentSelection) => {
    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Payment of ${formatCurrency(selection.totalAmount, currency)} initiated successfully!`);
      setShowPaymentModal(false);
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestNegotiation = () => {
    toast.info('Price negotiation request submitted. Admin will review shortly.');
  };

  return (
    <VerificationGate userType="driver" bypassForAdmin={isAdminView}>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Admin View Banner */}
          <AdminViewBanner dashboardType="driver" />
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold">Driver Dashboard</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {country} Region • {isUSA ? '🇺🇸' : '🇳🇬'} {currency}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                {isUSA ? 'Contact Support' : 'WhatsApp Support'}
              </Button>
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                {isUSA ? 'Call Admin' : 'Call Admin'}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Vehicle</p>
                    <p className="text-2xl font-bold">{vehicle.make} {vehicle.model}</p>
                  </div>
                  <Car className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Days Active</p>
                    <p className="text-2xl font-bold">{rental.daysActive}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(isUSA ? rental.totalPaid : rental.totalPaid * 500, currency)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Payment</p>
                    <p className="text-2xl font-bold">{rental.nextPaymentDate}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview" data-tour="driver-overview">Overview</TabsTrigger>
              <TabsTrigger value="payments" data-tour="driver-payments">Payments</TabsTrigger>
              <TabsTrigger value="negotiate" data-tour="driver-negotiate">Price Negotiation</TabsTrigger>
              <TabsTrigger value="lease-to-own" className="flex items-center gap-1" data-tour="driver-rto">
                <Home className="h-3 w-3" />
                Lease to Own
              </TabsTrigger>
              <TabsTrigger value="inspection" className="flex items-center gap-1" data-tour="driver-inspection">
                <Camera className="h-3 w-3" />
                Weekly Report
              </TabsTrigger>
              <TabsTrigger value="incidents" className="flex items-center gap-1" data-tour="driver-incidents">
                <Wrench className="h-3 w-3" />
                Incidents
              </TabsTrigger>
              <TabsTrigger value="agreements" className="flex items-center gap-1" data-tour="driver-agreements">
                <FileText className="h-3 w-3" />
                Agreements
              </TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="settings" data-tour="driver-settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Vehicle Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Current Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={vehicle.image} 
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Make & Model</p>
                        <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Year</p>
                        <p className="font-medium">{vehicle.year}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Plate Number</p>
                        <p className="font-medium">{vehicle.plateNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <Badge>{vehicle.category}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rental Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Rental Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weekly Rate</span>
                        <span className="font-medium">{formatCurrency(weeklyRate, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Admin Fee (20%)</span>
                        <span className="font-medium">+{formatCurrency(adminFee, currency)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Weekly</span>
                        <span className="text-primary">{formatCurrency(totalDue, currency)}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => setShowPaymentModal(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Make Payment
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Reminder */}
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  <strong>Payment Reminder:</strong> Your next payment of {formatCurrency(totalDue, currency)} is due on {rental.nextPaymentDate}.
                  {!isUSA && ' Payment via Paystack or bank transfer.'}
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              {showPaymentModal ? (
                <PaymentOptionsSelector
                  baseAmount={weeklyRate}
                  currency={currency}
                  country={country}
                  onPaymentSubmit={handlePaymentSubmit}
                  isProcessing={isProcessing}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Your recent payments and transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockRentalData.payments.map((payment) => (
                        <div 
                          key={payment.id} 
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">Weekly Payment</p>
                              <p className="text-sm text-muted-foreground">{payment.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {formatCurrency(isUSA ? payment.amount : payment.amount * 500, currency)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {payment.method === 'paypal' ? 'PayPal' : 'Paystack'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button 
                      className="w-full mt-6" 
                      onClick={() => setShowPaymentModal(true)}
                    >
                      Make New Payment
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Payment Methods Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-medium">
                          {isUSA ? 'PayPal' : 'Paystack'}
                        </span>
                        <Badge>Instant</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isUSA 
                          ? 'Pay instantly with your PayPal account or credit card'
                          : 'Pay with card, bank, or USSD via Paystack'
                        }
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="h-5 w-5" />
                        <span className="font-medium">Bank Transfer</span>
                        <Badge variant="secondary">1-2 days</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isUSA 
                          ? 'Transfer directly to our Chase bank account'
                          : 'Transfer to our GTBank account'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Reminder Notification Preview */}
              <PaymentReminderPreview 
                driverName={user?.user_metadata?.full_name || 'Driver'}
                amountDue={isUSA ? totalDue : totalDue}
                currency={currency}
                paymentFrequency={rental.paymentFrequency}
              />
            </TabsContent>

            {/* Price Negotiation Tab */}
            <TabsContent value="negotiate" className="space-y-6">
              <DriverPriceNegotiation />
            </TabsContent>

            {/* Lease to Own Tab */}
            <TabsContent value="lease-to-own">
              <RentToOwnSearch />
            </TabsContent>

            {/* Weekly Inspection Tab */}
            <TabsContent value="inspection" className="space-y-6">
              <WeeklyInspectionReport
                vehicleId={vehicle.id}
                vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                ownerId={null}
              />
            </TabsContent>

            {/* Incidents Tab */}
            <TabsContent value="incidents" className="space-y-6">
              <IncidentReportForm 
                vehicleId={vehicle.id}
                vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              />
            </TabsContent>

            {/* Agreements Tab */}
            <TabsContent value="agreements" className="space-y-6">
              <UserAgreementsList userType="driver" />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <DocumentUpload userType="driver" />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Email Verification */}
              <EmailVerification />
              
              {/* Phone Verification */}
              <PhoneVerification onVerified={() => setPhoneVerified(true)} />

              {/* Notification Preferences */}
              <NotificationPreferences phoneVerified={phoneVerified} />
            </TabsContent>
          </Tabs>
        </div>
        </main>

        <Footer />
        <SupportChatWidget />
        <CallSupportButton userType="driver" variant="floating" />
      </div>
    </VerificationGate>
  );
}
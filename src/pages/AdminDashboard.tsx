import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Car, Users, DollarSign, AlertTriangle, CheckCircle, Clock, MapPin, Power, Eye, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VehicleTrackingMap from "@/components/tracking/VehicleTrackingMap";
import { PaymentDefaultAlert } from "@/components/payment/PaymentDefaultAlert";
import { PaymentBreakdownCard } from "@/components/payment/PaymentBreakdownCard";
import { type PaymentDefault } from "@/lib/payment-config";
import { toast } from "sonner";

const stats = [
  { label: "Active Vehicles", value: "156", icon: Car, color: "text-accent" },
  { label: "Active Drivers", value: "234", icon: Users, color: "text-success" },
  { label: "Monthly Revenue", value: "$48,320", icon: DollarSign, color: "text-warning" },
  { label: "Payment Defaults", value: "7", icon: AlertTriangle, color: "text-destructive" },
];

const pendingApprovals = [
  { id: 1, type: "Driver", name: "John D.", location: "Maryland", status: "pending" },
  { id: 2, type: "Vehicle", name: "Toyota Camry 2022", location: "Lagos", status: "pending" },
  { id: 3, type: "Driver", name: "Sarah M.", location: "Abuja", status: "pending" },
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
    daysOverdue: 2,
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
    daysOverdue: 3,
    notificationsSent: 3,
    lastNotificationAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    deactivationEligible: true,
    status: "active",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  { 
    id: "DEF-003",
    driverId: "DRV-003",
    vehicleId: "VEH-003",
    rentalId: "RNT-003",
    amountDue: 72,
    currency: "USD",
    daysOverdue: 1,
    notificationsSent: 1,
    deactivationEligible: false,
    status: "active",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="tracking" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="tracking">Vehicle Tracking</TabsTrigger>
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="defaults">Payment Defaults</TabsTrigger>
              <TabsTrigger value="fees">Fee Structure</TabsTrigger>
            </TabsList>

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

            <TabsContent value="approvals">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pending Approvals ({pendingApprovals.length})</h3>
                <div className="space-y-3">
                  {pendingApprovals.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.type} • {item.location}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="hero">Approve</Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                      <li>3-day notification sequence (SMS/WhatsApp)</li>
                      <li>Vehicle deactivation eligible after 3rd notification</li>
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
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;

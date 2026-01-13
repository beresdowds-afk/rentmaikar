import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Car, Users, DollarSign, AlertTriangle, CheckCircle, Clock, MapPin, Power, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VehicleTrackingMap from "@/components/tracking/VehicleTrackingMap";

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

const defaultAlerts = [
  { id: 1, driver: "Mike T.", vehicle: "Honda Accord", daysOverdue: 2, amount: 96 },
  { id: 2, driver: "Grace O.", vehicle: "Toyota Corolla", daysOverdue: 1, amount: 48 },
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
            <TabsList>
              <TabsTrigger value="tracking">Vehicle Tracking</TabsTrigger>
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="defaults">Payment Defaults</TabsTrigger>
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
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Defaults</h3>
                <div className="space-y-3">
                  {defaultAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{alert.driver} - {alert.vehicle}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.daysOverdue} day(s) overdue • ${alert.amount} owed
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Contact</Button>
                        <Button size="sm" variant="destructive" className="gap-1">
                          <Power className="w-4 h-4" /> Disable
                        </Button>
                      </div>
                    </div>
                  ))}
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

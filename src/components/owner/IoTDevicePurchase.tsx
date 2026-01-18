import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Cpu, 
  MapPin, 
  Shield, 
  Truck,
  CheckCircle,
  Clock,
  CreditCard,
  Building2,
  Copy
} from 'lucide-react';
import { formatCurrency, type PaymentBreakdown } from '@/lib/payment-config';

interface DevicePricing {
  id: string;
  region: string;
  currency: string;
  price: number;
  description: string | null;
}

interface DeviceOrder {
  id: string;
  device_price: number;
  currency: string;
  payment_status: string;
  payment_method: string | null;
  shipping_status: string;
  tracking_number: string | null;
  created_at: string;
}

const BANK_DETAILS = {
  usa: {
    bankName: 'Chase Bank',
    accountName: 'Rentmaikar LLC',
    accountNumber: '123456789',
    routingNumber: '021000021',
    accountType: 'Business Checking',
  },
  nigeria: {
    bankName: 'Access Bank',
    accountName: 'Rentmaikar Nigeria Ltd',
    accountNumber: '0123456789',
    bankCode: '044',
  },
};

export function IoTDevicePurchase() {
  const { user } = useAuth();
  const { country } = useRegion();
  const [pricing, setPricing] = useState<DevicePricing | null>(null);
  const [orders, setOrders] = useState<DeviceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'online'>('bank_transfer');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentRegion = country === 'Nigeria' ? 'nigeria' : 'usa';
  const currentCurrency: 'USD' | 'NGN' = country === 'Nigeria' ? 'NGN' : 'USD';

  useEffect(() => {
    fetchData();
  }, [currentRegion, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [pricingRes, ordersRes] = await Promise.all([
        supabase
          .from('iot_device_pricing')
          .select('*')
          .eq('region', currentRegion)
          .single(),
        supabase
          .from('iot_device_orders')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (pricingRes.error && pricingRes.error.code !== 'PGRST116') {
        throw pricingRes.error;
      }
      if (ordersRes.error) throw ordersRes.error;

      setPricing(pricingRes.data);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load device information');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !pricing) return;
    
    if (!shippingAddress.trim()) {
      toast.error('Please enter your shipping address');
      return;
    }
    if (paymentMethod === 'bank_transfer' && !paymentReference.trim()) {
      toast.error('Please enter your payment reference/receipt number');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase.from('iot_device_orders').insert({
        owner_id: user.id,
        device_price: pricing.price,
        currency: pricing.currency,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        shipping_address: shippingAddress,
        owner_email: user.email,
        owner_phone: phone || null,
      });

      if (error) throw error;

      toast.success('Order placed successfully!', {
        description: 'We will confirm your payment and ship the device soon.',
      });
      setPurchaseOpen(false);
      setShippingAddress('');
      setPaymentReference('');
      setPhone('');
      fetchData();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  const copyBankDetails = () => {
    const details = currentRegion === 'nigeria' ? BANK_DETAILS.nigeria : BANK_DETAILS.usa;
    const text = currentRegion === 'nigeria'
      ? `Bank: ${details.bankName}\nAccount Name: ${details.accountName}\nAccount Number: ${details.accountNumber}`
      : `Bank: ${details.bankName}\nAccount Name: ${details.accountName}\nAccount Number: ${details.accountNumber}\nRouting: ${(details as typeof BANK_DETAILS.usa).routingNumber}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Bank details copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (paymentStatus: string, shippingStatus: string) => {
    if (paymentStatus === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Awaiting Payment Confirmation</Badge>;
    }
    if (paymentStatus === 'confirmed' && shippingStatus === 'pending') {
      return <Badge className="bg-blue-500"><Truck className="h-3 w-3 mr-1" />Processing Shipment</Badge>;
    }
    if (shippingStatus === 'shipped') {
      return <Badge className="bg-purple-500"><Truck className="h-3 w-3 mr-1" />Shipped</Badge>;
    }
    if (shippingStatus === 'delivered') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
    }
    return <Badge variant="secondary">{paymentStatus}</Badge>;
  };

  const bankDetails = currentRegion === 'nigeria' ? BANK_DETAILS.nigeria : BANK_DETAILS.usa;

  return (
    <div className="space-y-6">
      {/* Device Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>IoT Tracking Device</CardTitle>
              <CardDescription>GPS tracking for your fleet vehicles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Real-time Tracking</p>
                <p className="text-sm text-muted-foreground">Monitor vehicle location 24/7</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Anti-theft Protection</p>
                <p className="text-sm text-muted-foreground">Remote engine disable & alerts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Free Shipping</p>
                <p className="text-sm text-muted-foreground">Delivered to your address</p>
              </div>
            </div>
          </div>

          <Separator />

          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading pricing...</div>
          ) : pricing ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Device Price ({currentRegion.toUpperCase()})</p>
                <p className="text-3xl font-bold">{formatCurrency(pricing.price, pricing.currency as 'USD' | 'NGN')}</p>
                {pricing.description && (
                  <p className="text-sm text-muted-foreground mt-1">{pricing.description}</p>
                )}
              </div>
              <Button size="lg" onClick={() => setPurchaseOpen(true)}>
                Purchase Device
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Pricing not available for your region
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Device Orders</CardTitle>
            <CardDescription>Track your IoT device purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">
                      IoT Tracking Device
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ordered {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(order.device_price, order.currency as 'USD' | 'NGN')}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(order.payment_status, order.shipping_status)}
                    {order.tracking_number && (
                      <p className="text-sm text-muted-foreground">
                        Tracking: {order.tracking_number}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Purchase IoT Device</DialogTitle>
            <DialogDescription>
              Complete your order for the GPS tracking device
            </DialogDescription>
          </DialogHeader>

          {pricing && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>IoT Tracking Device</span>
                  <span className="font-bold">{formatCurrency(pricing.price, pricing.currency as 'USD' | 'NGN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(pricing.price, pricing.currency as 'USD' | 'NGN')}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'bank_transfer' | 'online')}
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="bank_transfer" id="bank" />
                    <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="h-4 w-4" />
                      Bank Transfer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg opacity-50">
                    <RadioGroupItem value="online" id="online" disabled />
                    <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="h-4 w-4" />
                      Online Payment (Coming Soon)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Bank Details */}
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Bank Details</Label>
                    <Button variant="ghost" size="sm" onClick={copyBankDetails}>
                      <Copy className="h-4 w-4 mr-1" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-medium">{bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-medium">{bankDetails.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-medium">{bankDetails.accountNumber}</span>
                    </div>
                    {currentRegion === 'usa' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Routing Number:</span>
                        <span className="font-medium">{(bankDetails as typeof BANK_DETAILS.usa).routingNumber}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Payment Reference / Receipt Number *</Label>
                    <Input
                      id="reference"
                      placeholder="Enter your payment reference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Shipping Info */}
              <div className="space-y-3">
                <Label htmlFor="address">Shipping Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter your full shipping address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  rows={3}
                />
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (for delivery)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={processing}>
              {processing ? 'Placing Order...' : 'Place Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

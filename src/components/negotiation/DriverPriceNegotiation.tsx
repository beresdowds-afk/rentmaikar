import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DollarSign, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Lock, 
  MessageSquare,
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useRegion } from '@/contexts/RegionContext';

interface PriceNegotiation {
  id: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleCategory: 'budget' | 'standard' | 'premium';
  requestedDailyRate: number;
  adminCounterOffer: number | null;
  finalDailyRate: number | null;
  currency: 'USD' | 'NGN';
  status: 'pending' | 'counter_offer' | 'approved' | 'rejected' | 'locked';
  isLocked: boolean;
  driverMessage: string;
  adminResponse: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const requestSchema = z.object({
  vehicleCategory: z.enum(['budget', 'standard', 'premium']),
  vehicleMake: z.string().min(2, 'Vehicle make is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleYear: z.number().min(2015).max(2025),
  requestedDailyRate: z.number().min(1, 'Daily rate must be positive'),
  driverMessage: z.string().max(500).optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

const modificationRequestSchema = z.object({
  requestedRate: z.number().min(1, 'Rate must be positive'),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)').max(500),
});

type ModificationRequestData = z.infer<typeof modificationRequestSchema>;

// Mock data for demonstration
const mockNegotiations: PriceNegotiation[] = [
  {
    id: '1',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleYear: 2022,
    vehicleCategory: 'premium',
    requestedDailyRate: 55,
    adminCounterOffer: 50,
    finalDailyRate: null,
    currency: 'USD',
    status: 'counter_offer',
    isLocked: false,
    driverMessage: 'I believe this rate is fair given the vehicle condition and mileage.',
    adminResponse: 'We can offer $50/day based on current market rates for this category.',
    rejectionReason: null,
    createdAt: '2024-01-18T10:00:00Z',
  },
  {
    id: '2',
    vehicleMake: 'Honda',
    vehicleModel: 'Accord',
    vehicleYear: 2023,
    vehicleCategory: 'premium',
    requestedDailyRate: 50,
    adminCounterOffer: null,
    finalDailyRate: 50,
    currency: 'USD',
    status: 'locked',
    isLocked: true,
    driverMessage: 'Looking to rent for rideshare work.',
    adminResponse: 'Approved at requested rate.',
    rejectionReason: null,
    createdAt: '2024-01-15T14:30:00Z',
  },
  {
    id: '3',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2019,
    vehicleCategory: 'standard',
    requestedDailyRate: 45,
    adminCounterOffer: null,
    finalDailyRate: null,
    currency: 'USD',
    status: 'pending',
    isLocked: false,
    driverMessage: 'New to the platform, looking for a reliable vehicle.',
    adminResponse: null,
    rejectionReason: null,
    createdAt: '2024-01-20T09:15:00Z',
  },
];

const PRICE_CEILINGS = {
  budget: { min: 2015, max: 2016, ceiling: 250, label: 'Smart Start' },
  standard: { min: 2017, max: 2020, ceiling: 300, label: 'Earnings Optimizer' },
  premium: { min: 2021, max: 2025, ceiling: 350, label: 'Top Earner' },
};

export const DriverPriceNegotiation = () => {
  const { country } = useRegion();
  const currency = country === 'Nigeria' ? 'NGN' : 'USD';
  const currencySymbol = currency === 'NGN' ? '₦' : '$';
  
  const [negotiations, setNegotiations] = useState<PriceNegotiation[]>(mockNegotiations);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isModificationOpen, setIsModificationOpen] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState<PriceNegotiation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      vehicleCategory: 'standard',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: 2022,
      requestedDailyRate: 0,
      driverMessage: '',
    },
  });

  const modificationForm = useForm<ModificationRequestData>({
    resolver: zodResolver(modificationRequestSchema),
    defaultValues: {
      requestedRate: 0,
      reason: '',
    },
  });

  const handleNewRequest = async (data: RequestFormData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newNegotiation: PriceNegotiation = {
      id: Date.now().toString(),
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      vehicleCategory: data.vehicleCategory,
      requestedDailyRate: data.requestedDailyRate,
      adminCounterOffer: null,
      finalDailyRate: null,
      currency,
      status: 'pending',
      isLocked: false,
      driverMessage: data.driverMessage || '',
      adminResponse: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    };

    setNegotiations([newNegotiation, ...negotiations]);
    setIsNewRequestOpen(false);
    requestForm.reset();
    setIsSubmitting(false);
    
    toast.success('Price request submitted!', {
      description: 'An admin will review your request shortly.',
    });
  };

  const handleAcceptCounterOffer = async (negotiation: PriceNegotiation) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setNegotiations(negotiations.map(n => 
      n.id === negotiation.id 
        ? { ...n, status: 'approved' as const, finalDailyRate: n.adminCounterOffer }
        : n
    ));
    
    setIsSubmitting(false);
    toast.success('Counter offer accepted!', {
      description: 'Your daily rate has been confirmed.',
    });
  };

  const handleModificationRequest = async (data: ModificationRequestData) => {
    if (!selectedNegotiation) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsModificationOpen(false);
    modificationForm.reset();
    setSelectedNegotiation(null);
    
    toast.success('Modification request submitted!', {
      description: 'An admin will review your request.',
    });
  };

  const openModificationDialog = (negotiation: PriceNegotiation) => {
    setSelectedNegotiation(negotiation);
    modificationForm.setValue('requestedRate', negotiation.finalDailyRate || negotiation.requestedDailyRate);
    setIsModificationOpen(true);
  };

  const getStatusBadge = (status: PriceNegotiation['status'], isLocked: boolean) => {
    if (isLocked) {
      return <Badge className="bg-purple-500"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>;
    }
    
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      counter_offer: { variant: 'default' as const, icon: MessageSquare, label: 'Counter Offer' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' },
      locked: { variant: 'outline' as const, icon: Lock, label: 'Locked' },
    };
    
    const { variant, icon: Icon, label } = config[status];
    return (
      <Badge variant={variant}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const selectedCategory = requestForm.watch('vehicleCategory');
  const categoryInfo = PRICE_CEILINGS[selectedCategory];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Price Negotiation</h2>
          <p className="text-muted-foreground">Request and negotiate daily rental rates with administrators</p>
        </div>
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Price Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Daily Rate</DialogTitle>
              <DialogDescription>
                Submit a price request for your rental. An admin will review and respond.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={requestForm.handleSubmit(handleNewRequest)}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Vehicle Category</Label>
                  <Select
                    value={requestForm.watch('vehicleCategory')}
                    onValueChange={(v: 'budget' | 'standard' | 'premium') => requestForm.setValue('vehicleCategory', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget (2015-2016) - Up to {currencySymbol}250/week</SelectItem>
                      <SelectItem value="standard">Standard (2017-2020) - Up to {currencySymbol}300/week</SelectItem>
                      <SelectItem value="premium">Premium (2021-2025) - Up to {currencySymbol}350/week</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Category: {categoryInfo.label} | Max weekly: {currencySymbol}{categoryInfo.ceiling}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Vehicle Make</Label>
                    <Input
                      id="make"
                      placeholder="Toyota"
                      {...requestForm.register('vehicleMake')}
                    />
                    {requestForm.formState.errors.vehicleMake && (
                      <p className="text-xs text-destructive">{requestForm.formState.errors.vehicleMake.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Vehicle Model</Label>
                    <Input
                      id="model"
                      placeholder="Camry"
                      {...requestForm.register('vehicleModel')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      min={categoryInfo.min}
                      max={categoryInfo.max}
                      {...requestForm.register('vehicleYear', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Daily Rate ({currency})</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="rate"
                        type="number"
                        className="pl-9"
                        placeholder="50"
                        {...requestForm.register('requestedDailyRate', { valueAsNumber: true })}
                      />
                    </div>
                    {requestForm.formState.errors.requestedDailyRate && (
                      <p className="text-xs text-destructive">{requestForm.formState.errors.requestedDailyRate.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Any additional information for the admin..."
                    {...requestForm.register('driverMessage')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Price Tiers Info */}
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Weekly Price Ceilings:</strong> Budget (2015-16): {currencySymbol}250 | Standard (2017-20): {currencySymbol}300 | Premium (2021-25): {currencySymbol}350
        </AlertDescription>
      </Alert>

      {/* Negotiations List */}
      <div className="space-y-4">
        {negotiations.length === 0 ? (
          <Card className="p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Negotiations Yet</h3>
            <p className="text-muted-foreground mb-4">Submit your first price request to get started</p>
            <Button onClick={() => setIsNewRequestOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Price Request
            </Button>
          </Card>
        ) : (
          negotiations.map((negotiation) => (
            <Card key={negotiation.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {negotiation.vehicleYear} {negotiation.vehicleMake} {negotiation.vehicleModel}
                    </CardTitle>
                    <CardDescription>
                      {PRICE_CEILINGS[negotiation.vehicleCategory].label} • Submitted {new Date(negotiation.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(negotiation.status, negotiation.isLocked)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Your Request</p>
                    <p className="text-lg font-semibold">
                      {currencySymbol}{negotiation.requestedDailyRate}/day
                    </p>
                  </div>
                  {negotiation.adminCounterOffer && (
                    <div>
                      <p className="text-muted-foreground">Counter Offer</p>
                      <p className="text-lg font-semibold text-primary">
                        {currencySymbol}{negotiation.adminCounterOffer}/day
                      </p>
                    </div>
                  )}
                  {negotiation.finalDailyRate && (
                    <div>
                      <p className="text-muted-foreground">Final Rate</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currencySymbol}{negotiation.finalDailyRate}/day
                      </p>
                    </div>
                  )}
                </div>

                {negotiation.driverMessage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your Message</p>
                    <p className="text-sm">{negotiation.driverMessage}</p>
                  </div>
                )}

                {negotiation.adminResponse && (
                  <div className="p-3 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                    <p className="text-xs text-muted-foreground mb-1">Admin Response</p>
                    <p className="text-sm">{negotiation.adminResponse}</p>
                  </div>
                )}

                {negotiation.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{negotiation.rejectionReason}</AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {negotiation.status === 'counter_offer' && (
                    <Button 
                      onClick={() => handleAcceptCounterOffer(negotiation)}
                      disabled={isSubmitting}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept {currencySymbol}{negotiation.adminCounterOffer}/day
                    </Button>
                  )}
                  
                  {negotiation.isLocked && (
                    <Button 
                      variant="outline"
                      onClick={() => openModificationDialog(negotiation)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Request Modification
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modification Request Dialog */}
      <Dialog open={isModificationOpen} onOpenChange={setIsModificationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Price Modification</DialogTitle>
            <DialogDescription>
              Your current rate is locked. Submit a modification request for admin review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={modificationForm.handleSubmit(handleModificationRequest)}>
            <div className="space-y-4 py-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Only admins can approve modifications to locked prices.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Current Rate</Label>
                <p className="text-lg font-semibold">
                  {currencySymbol}{selectedNegotiation?.finalDailyRate || selectedNegotiation?.requestedDailyRate}/day
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newRate">Requested New Rate ({currency})</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newRate"
                    type="number"
                    className="pl-9"
                    {...modificationForm.register('requestedRate', { valueAsNumber: true })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Modification</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you're requesting this change..."
                  {...modificationForm.register('reason')}
                />
                {modificationForm.formState.errors.reason && (
                  <p className="text-xs text-destructive">{modificationForm.formState.errors.reason.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModificationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

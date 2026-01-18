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
  Car,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useRegion } from '@/contexts/RegionContext';

interface OwnerNegotiation {
  id: string;
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleCategory: 'budget' | 'standard' | 'premium';
  requestedWeeklyRate: number;
  adminCounterOffer: number | null;
  finalWeeklyRate: number | null;
  currency: 'USD' | 'NGN';
  status: 'pending' | 'counter_offer' | 'approved' | 'rejected' | 'locked';
  isLocked: boolean;
  ownerMessage: string;
  adminResponse: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const requestSchema = z.object({
  vehicleId: z.string().min(1, 'Please select a vehicle'),
  requestedWeeklyRate: z.number().min(1, 'Weekly rate must be positive'),
  ownerMessage: z.string().max(500).optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

const modificationRequestSchema = z.object({
  requestedRate: z.number().min(1, 'Rate must be positive'),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)').max(500),
});

type ModificationRequestData = z.infer<typeof modificationRequestSchema>;

// Mock data for demonstration
const mockVehicles = [
  { id: 'v-001', make: 'Toyota', model: 'Camry', year: 2021, category: 'premium' as const },
  { id: 'v-002', make: 'Honda', model: 'Accord', year: 2019, category: 'standard' as const },
  { id: 'v-003', make: 'Hyundai', model: 'Elantra', year: 2016, category: 'budget' as const },
];

const mockNegotiations: OwnerNegotiation[] = [
  {
    id: '1',
    vehicleId: 'v-001',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleYear: 2021,
    vehicleCategory: 'premium',
    requestedWeeklyRate: 320,
    adminCounterOffer: 300,
    finalWeeklyRate: null,
    currency: 'USD',
    status: 'counter_offer',
    isLocked: false,
    ownerMessage: 'This vehicle is in excellent condition with low mileage.',
    adminResponse: 'We can offer $300/week based on current market rates.',
    rejectionReason: null,
    createdAt: '2024-01-18T10:00:00Z',
  },
  {
    id: '2',
    vehicleId: 'v-002',
    vehicleMake: 'Honda',
    vehicleModel: 'Accord',
    vehicleYear: 2019,
    vehicleCategory: 'standard',
    requestedWeeklyRate: 280,
    adminCounterOffer: null,
    finalWeeklyRate: 280,
    currency: 'USD',
    status: 'locked',
    isLocked: true,
    ownerMessage: 'Well-maintained vehicle with full service history.',
    adminResponse: 'Approved at requested rate.',
    rejectionReason: null,
    createdAt: '2024-01-15T14:30:00Z',
  },
];

const PRICE_CEILINGS = {
  budget: { min: 2015, max: 2016, ceiling: 250, label: 'Smart Start' },
  standard: { min: 2017, max: 2020, ceiling: 300, label: 'Earnings Optimizer' },
  premium: { min: 2021, max: 2025, ceiling: 350, label: 'Top Earner' },
};

export const OwnerPriceNegotiation = () => {
  const { country } = useRegion();
  const currency = country === 'Nigeria' ? 'NGN' : 'USD';
  const currencySymbol = currency === 'NGN' ? '₦' : '$';
  
  const [negotiations, setNegotiations] = useState<OwnerNegotiation[]>(mockNegotiations);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isModificationOpen, setIsModificationOpen] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState<OwnerNegotiation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      vehicleId: '',
      requestedWeeklyRate: 0,
      ownerMessage: '',
    },
  });

  const modificationForm = useForm<ModificationRequestData>({
    resolver: zodResolver(modificationRequestSchema),
    defaultValues: {
      requestedRate: 0,
      reason: '',
    },
  });

  const selectedVehicleId = requestForm.watch('vehicleId');
  const selectedVehicle = mockVehicles.find(v => v.id === selectedVehicleId);
  const categoryInfo = selectedVehicle ? PRICE_CEILINGS[selectedVehicle.category] : null;

  const handleNewRequest = async (data: RequestFormData) => {
    setIsSubmitting(true);
    
    const vehicle = mockVehicles.find(v => v.id === data.vehicleId);
    if (!vehicle) {
      toast.error('Please select a valid vehicle');
      setIsSubmitting(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newNegotiation: OwnerNegotiation = {
      id: Date.now().toString(),
      vehicleId: data.vehicleId,
      vehicleMake: vehicle.make,
      vehicleModel: vehicle.model,
      vehicleYear: vehicle.year,
      vehicleCategory: vehicle.category,
      requestedWeeklyRate: data.requestedWeeklyRate,
      adminCounterOffer: null,
      finalWeeklyRate: null,
      currency,
      status: 'pending',
      isLocked: false,
      ownerMessage: data.ownerMessage || '',
      adminResponse: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    };

    setNegotiations([newNegotiation, ...negotiations]);
    setIsNewRequestOpen(false);
    requestForm.reset();
    setIsSubmitting(false);
    
    toast.success('Rate request submitted!', {
      description: 'An admin will review your request shortly.',
    });
  };

  const handleAcceptCounterOffer = async (negotiation: OwnerNegotiation) => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setNegotiations(negotiations.map(n => 
      n.id === negotiation.id 
        ? { ...n, status: 'approved' as const, finalWeeklyRate: n.adminCounterOffer }
        : n
    ));
    
    setIsSubmitting(false);
    toast.success('Counter offer accepted!', {
      description: 'Your weekly rate has been confirmed.',
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

  const openModificationDialog = (negotiation: OwnerNegotiation) => {
    setSelectedNegotiation(negotiation);
    modificationForm.setValue('requestedRate', negotiation.finalWeeklyRate || negotiation.requestedWeeklyRate);
    setIsModificationOpen(true);
  };

  const getStatusBadge = (status: OwnerNegotiation['status'], isLocked: boolean) => {
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

  // Get vehicles without active negotiations
  const availableVehicles = mockVehicles.filter(
    v => !negotiations.some(n => n.vehicleId === v.id && !['rejected'].includes(n.status))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vehicle Rate Negotiation</h2>
          <p className="text-muted-foreground">Request and negotiate weekly rental rates for your vehicles</p>
        </div>
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={availableVehicles.length === 0}>
              <Plus className="h-4 w-4" />
              New Rate Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Weekly Rate</DialogTitle>
              <DialogDescription>
                Submit a rate request for your vehicle. An admin will review and respond.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={requestForm.handleSubmit(handleNewRequest)}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Vehicle</Label>
                  <Select
                    value={requestForm.watch('vehicleId')}
                    onValueChange={(v) => requestForm.setValue('vehicleId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          <span className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {requestForm.formState.errors.vehicleId && (
                    <p className="text-xs text-destructive">{requestForm.formState.errors.vehicleId.message}</p>
                  )}
                </div>

                {selectedVehicle && categoryInfo && (
                  <Alert>
                    <Car className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{categoryInfo.label}</strong> category ({selectedVehicle.year})
                      <br />
                      Maximum weekly rate: {currencySymbol}{categoryInfo.ceiling}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="rate">Requested Weekly Rate ({currency})</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rate"
                      type="number"
                      className="pl-9"
                      placeholder={categoryInfo ? `Up to ${categoryInfo.ceiling}` : '0'}
                      max={categoryInfo?.ceiling}
                      {...requestForm.register('requestedWeeklyRate', { valueAsNumber: true })}
                    />
                  </div>
                  {requestForm.formState.errors.requestedWeeklyRate && (
                    <p className="text-xs text-destructive">{requestForm.formState.errors.requestedWeeklyRate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe vehicle condition, features, or any relevant information..."
                    {...requestForm.register('ownerMessage')}
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
          <strong>Weekly Rate Ceilings by Category:</strong> Smart Start (2015-16): {currencySymbol}250 | Earnings Optimizer (2017-20): {currencySymbol}300 | Top Earner (2021-25): {currencySymbol}350
        </AlertDescription>
      </Alert>

      {/* Negotiations List */}
      <div className="space-y-4">
        {negotiations.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Rate Negotiations Yet</h3>
            <p className="text-muted-foreground mb-4">Submit a rate request for your vehicle to get started</p>
            <Button onClick={() => setIsNewRequestOpen(true)} disabled={availableVehicles.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              New Rate Request
            </Button>
          </Card>
        ) : (
          negotiations.map((negotiation) => (
            <Card key={negotiation.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5" />
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
                      {currencySymbol}{negotiation.requestedWeeklyRate}/week
                    </p>
                  </div>
                  {negotiation.adminCounterOffer && (
                    <div>
                      <p className="text-muted-foreground">Counter Offer</p>
                      <p className="text-lg font-semibold text-primary">
                        {currencySymbol}{negotiation.adminCounterOffer}/week
                      </p>
                    </div>
                  )}
                  {negotiation.finalWeeklyRate && (
                    <div>
                      <p className="text-muted-foreground">Final Rate</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currencySymbol}{negotiation.finalWeeklyRate}/week
                      </p>
                    </div>
                  )}
                </div>

                {negotiation.ownerMessage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your Message</p>
                    <p className="text-sm">{negotiation.ownerMessage}</p>
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
                    <AlertDescription>
                      <strong>Rejected:</strong> {negotiation.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {negotiation.status === 'counter_offer' && (
                    <>
                      <Button 
                        onClick={() => handleAcceptCounterOffer(negotiation)}
                        disabled={isSubmitting}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept {currencySymbol}{negotiation.adminCounterOffer}/week
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setIsNewRequestOpen(true)}
                      >
                        Submit New Request
                      </Button>
                    </>
                  )}

                  {negotiation.isLocked && (
                    <Button 
                      variant="outline" 
                      onClick={() => openModificationDialog(negotiation)}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Request Rate Modification
                    </Button>
                  )}

                  {negotiation.status === 'rejected' && (
                    <Button 
                      onClick={() => setIsNewRequestOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Submit New Request
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
            <DialogTitle>Request Rate Modification</DialogTitle>
            <DialogDescription>
              Your current rate is locked. Submit a modification request for admin review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={modificationForm.handleSubmit(handleModificationRequest)}>
            <div className="space-y-4 py-4">
              {selectedNegotiation && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Current Rate:</strong> {currencySymbol}{selectedNegotiation.finalWeeklyRate}/week
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedNegotiation.vehicleYear} {selectedNegotiation.vehicleMake} {selectedNegotiation.vehicleModel}
                  </p>
                </div>
              )}

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
                {modificationForm.formState.errors.requestedRate && (
                  <p className="text-xs text-destructive">{modificationForm.formState.errors.requestedRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Modification</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you're requesting this rate change..."
                  {...modificationForm.register('reason')}
                />
                {modificationForm.formState.errors.reason && (
                  <p className="text-xs text-destructive">{modificationForm.formState.errors.reason.message}</p>
                )}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Only admins can approve rate modifications for locked prices.
                </AlertDescription>
              </Alert>
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
  );
};

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Lock, 
  MessageSquare,
  Loader2,
  Eye,
  Send,
  AlertTriangle,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface PriceNegotiation {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
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
  createdAt: string;
}

interface ModificationRequest {
  id: string;
  negotiationId: string;
  driverName: string;
  vehicleInfo: string;
  currentRate: number;
  requestedRate: number;
  reason: string;
  requesterType: 'driver' | 'owner';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Mock data
const mockNegotiations: PriceNegotiation[] = [
  {
    id: '1',
    driverId: 'drv-001',
    driverName: 'John Smith',
    driverEmail: 'john.smith@example.com',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleYear: 2022,
    vehicleCategory: 'premium',
    requestedDailyRate: 55,
    adminCounterOffer: null,
    finalDailyRate: null,
    currency: 'USD',
    status: 'pending',
    isLocked: false,
    driverMessage: 'I believe this rate is fair given the vehicle condition.',
    adminResponse: null,
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: '2',
    driverId: 'drv-002',
    driverName: 'Sarah Johnson',
    driverEmail: 'sarah.j@example.com',
    vehicleMake: 'Honda',
    vehicleModel: 'Accord',
    vehicleYear: 2023,
    vehicleCategory: 'premium',
    requestedDailyRate: 60,
    adminCounterOffer: 52,
    finalDailyRate: null,
    currency: 'USD',
    status: 'counter_offer',
    isLocked: false,
    driverMessage: 'New to rideshare, looking for premium vehicle.',
    adminResponse: 'We can offer $52/day based on market rates.',
    createdAt: '2024-01-18T14:30:00Z',
  },
  {
    id: '3',
    driverId: 'drv-003',
    driverName: 'Michael Brown',
    driverEmail: 'mike.b@example.com',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2019,
    vehicleCategory: 'standard',
    requestedDailyRate: 42,
    adminCounterOffer: null,
    finalDailyRate: 42,
    currency: 'USD',
    status: 'locked',
    isLocked: true,
    driverMessage: 'Experienced driver, excellent record.',
    adminResponse: 'Approved at requested rate. Good luck!',
    createdAt: '2024-01-15T09:15:00Z',
  },
  {
    id: '4',
    driverId: 'drv-004',
    driverName: 'Chidi Okonkwo',
    driverEmail: 'chidi.o@example.com',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2018,
    vehicleCategory: 'standard',
    requestedDailyRate: 15000,
    adminCounterOffer: null,
    finalDailyRate: null,
    currency: 'NGN',
    status: 'pending',
    isLocked: false,
    driverMessage: 'Looking to start with Bolt in Lagos.',
    adminResponse: null,
    createdAt: '2024-01-20T08:00:00Z',
  },
];

const mockModificationRequests: ModificationRequest[] = [
  {
    id: 'mod-1',
    negotiationId: '3',
    driverName: 'Michael Brown',
    vehicleInfo: '2019 Toyota Corolla',
    currentRate: 42,
    requestedRate: 48,
    reason: 'Fuel prices have increased significantly, need adjustment to maintain profitability.',
    requesterType: 'driver',
    status: 'pending',
    createdAt: '2024-01-19T11:30:00Z',
  },
];

const PRICE_CEILINGS = {
  budget: { ceiling: 250, label: 'Smart Start' },
  standard: { ceiling: 300, label: 'Earnings Optimizer' },
  premium: { ceiling: 350, label: 'Top Earner' },
};

export const AdminPriceNegotiation = () => {
  const [negotiations, setNegotiations] = useState<PriceNegotiation[]>(mockNegotiations);
  const [modificationRequests, setModificationRequests] = useState<ModificationRequest[]>(mockModificationRequests);
  const [selectedNegotiation, setSelectedNegotiation] = useState<PriceNegotiation | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterOffer, setCounterOffer] = useState<string>('');
  const [adminResponse, setAdminResponse] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const pendingNegotiations = negotiations.filter(n => n.status === 'pending');
  const counterOfferNegotiations = negotiations.filter(n => n.status === 'counter_offer');
  const lockedNegotiations = negotiations.filter(n => n.isLocked);
  const pendingModifications = modificationRequests.filter(m => m.status === 'pending');

  const openReview = (negotiation: PriceNegotiation) => {
    setSelectedNegotiation(negotiation);
    setCounterOffer(negotiation.requestedDailyRate.toString());
    setAdminResponse('');
    setRejectionReason('');
    setIsReviewOpen(true);
  };

  const handleApprove = async (withLock: boolean = false) => {
    if (!selectedNegotiation) return;
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    setNegotiations(negotiations.map(n => 
      n.id === selectedNegotiation.id 
        ? { 
            ...n, 
            status: withLock ? 'locked' as const : 'approved' as const,
            isLocked: withLock,
            finalDailyRate: parseFloat(counterOffer) || n.requestedDailyRate,
            adminResponse,
          }
        : n
    ));

    setIsSubmitting(false);
    setIsReviewOpen(false);
    toast.success(withLock ? 'Price approved and locked!' : 'Price approved!');
  };

  const handleCounterOffer = async () => {
    if (!selectedNegotiation || !counterOffer) return;
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    setNegotiations(negotiations.map(n => 
      n.id === selectedNegotiation.id 
        ? { 
            ...n, 
            status: 'counter_offer' as const,
            adminCounterOffer: parseFloat(counterOffer),
            adminResponse,
          }
        : n
    ));

    setIsSubmitting(false);
    setIsReviewOpen(false);
    toast.success('Counter offer sent to driver!');
  };

  const handleReject = async () => {
    if (!selectedNegotiation || !rejectionReason) return;
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    setNegotiations(negotiations.map(n => 
      n.id === selectedNegotiation.id 
        ? { ...n, status: 'rejected' as const, adminResponse: rejectionReason }
        : n
    ));

    setIsSubmitting(false);
    setIsReviewOpen(false);
    toast.success('Request rejected');
  };

  const handleModificationRequest = async (request: ModificationRequest, action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    setModificationRequests(modificationRequests.map(m => 
      m.id === request.id 
        ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' }
        : m
    ));

    if (action === 'approve') {
      setNegotiations(negotiations.map(n => 
        n.id === request.negotiationId 
          ? { ...n, finalDailyRate: request.requestedRate }
          : n
      ));
    }

    setIsSubmitting(false);
    toast.success(`Modification request ${action === 'approve' ? 'approved' : 'rejected'}`);
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
    return <Badge variant={variant}><Icon className="w-3 h-3 mr-1" />{label}</Badge>;
  };

  const getCurrencySymbol = (currency: string) => currency === 'NGN' ? '₦' : '$';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Price Negotiation Management</h2>
        <p className="text-muted-foreground">Review, approve, and lock driver rental prices</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingNegotiations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Counter Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counterOfferNegotiations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              Locked Prices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lockedNegotiations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Modification Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingModifications.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending <Badge variant="secondary">{pendingNegotiations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="counter" className="gap-2">
            Counter Offers <Badge variant="secondary">{counterOfferNegotiations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="locked" className="gap-2">
            Locked <Badge variant="secondary">{lockedNegotiations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="modifications" className="gap-2">
            Modifications <Badge variant="secondary">{pendingModifications.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Price Requests</CardTitle>
              <CardDescription>Review and respond to new price requests from drivers</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingNegotiations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>All price requests have been processed!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Requested Rate</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingNegotiations.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{n.driverName}</p>
                            <p className="text-xs text-muted-foreground">{n.driverEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {n.vehicleYear} {n.vehicleMake} {n.vehicleModel}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{PRICE_CEILINGS[n.vehicleCategory].label}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {getCurrencySymbol(n.currency)}{n.requestedDailyRate}/day
                        </TableCell>
                        <TableCell>{new Date(n.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => openReview(n)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Counter Offers Tab */}
        <TabsContent value="counter">
          <Card>
            <CardHeader>
              <CardTitle>Awaiting Driver Response</CardTitle>
              <CardDescription>Counter offers waiting for driver acceptance</CardDescription>
            </CardHeader>
            <CardContent>
              {counterOfferNegotiations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3" />
                  <p>No pending counter offers</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Original Request</TableHead>
                      <TableHead>Your Offer</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {counterOfferNegotiations.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.driverName}</TableCell>
                        <TableCell>{n.vehicleYear} {n.vehicleMake} {n.vehicleModel}</TableCell>
                        <TableCell>{getCurrencySymbol(n.currency)}{n.requestedDailyRate}/day</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {getCurrencySymbol(n.currency)}{n.adminCounterOffer}/day
                        </TableCell>
                        <TableCell>{getStatusBadge(n.status, n.isLocked)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locked Tab */}
        <TabsContent value="locked">
          <Card>
            <CardHeader>
              <CardTitle>Locked Prices</CardTitle>
              <CardDescription>Finalized prices that can only be modified by admin</CardDescription>
            </CardHeader>
            <CardContent>
              {lockedNegotiations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-3" />
                  <p>No locked prices yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Final Rate</TableHead>
                      <TableHead>Weekly Projection</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockedNegotiations.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.driverName}</TableCell>
                        <TableCell>{n.vehicleYear} {n.vehicleMake} {n.vehicleModel}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {getCurrencySymbol(n.currency)}{n.finalDailyRate}/day
                        </TableCell>
                        <TableCell>
                          {getCurrencySymbol(n.currency)}{(n.finalDailyRate || 0) * 7}/week
                        </TableCell>
                        <TableCell>{getStatusBadge(n.status, n.isLocked)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openReview(n)}>
                            Modify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modification Requests Tab */}
        <TabsContent value="modifications">
          <Card>
            <CardHeader>
              <CardTitle>Modification Requests</CardTitle>
              <CardDescription>Requests from drivers/owners to modify locked prices</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingModifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3" />
                  <p>No pending modification requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingModifications.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{request.requesterType}</Badge>
                              <span className="font-medium">{request.driverName}</span>
                              <span className="text-muted-foreground">• {request.vehicleInfo}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span>Current: <strong>${request.currentRate}/day</strong></span>
                              <span>→</span>
                              <span className="text-primary">Requested: <strong>${request.requestedRate}/day</strong></span>
                            </div>
                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              "{request.reason}"
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleModificationRequest(request, 'reject')}
                              disabled={isSubmitting}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleModificationRequest(request, 'approve')}
                              disabled={isSubmitting}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Price Request</DialogTitle>
            <DialogDescription>
              {selectedNegotiation?.driverName} - {selectedNegotiation?.vehicleYear} {selectedNegotiation?.vehicleMake} {selectedNegotiation?.vehicleModel}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNegotiation && (
            <div className="space-y-4 py-4">
              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Requested Rate</p>
                  <p className="text-xl font-bold">
                    {getCurrencySymbol(selectedNegotiation.currency)}{selectedNegotiation.requestedDailyRate}/day
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category Ceiling</p>
                  <p className="text-xl font-bold">
                    {getCurrencySymbol(selectedNegotiation.currency)}{PRICE_CEILINGS[selectedNegotiation.vehicleCategory].ceiling}/week
                  </p>
                </div>
              </div>

              {selectedNegotiation.driverMessage && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Driver's Message</p>
                  <p className="text-sm">{selectedNegotiation.driverMessage}</p>
                </div>
              )}

              {/* Counter Offer Input */}
              <div className="space-y-2">
                <Label htmlFor="counterOffer">Your Rate ({selectedNegotiation.currency}/day)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="counterOffer"
                    type="number"
                    className="pl-9"
                    value={counterOffer}
                    onChange={(e) => setCounterOffer(e.target.value)}
                  />
                </div>
              </div>

              {/* Admin Response */}
              <div className="space-y-2">
                <Label htmlFor="response">Response Message</Label>
                <Textarea
                  id="response"
                  placeholder="Optional message to the driver..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                />
              </div>

              {/* Rejection Reason */}
              <div className="space-y-2">
                <Label htmlFor="rejection">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejection"
                  placeholder="Required if rejecting..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCounterOffer}
              disabled={isSubmitting || !counterOffer}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Counter Offer
            </Button>
            <Button 
              onClick={() => handleApprove(false)}
              disabled={isSubmitting}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => handleApprove(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Approve & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

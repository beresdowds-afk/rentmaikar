import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Send,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import SignaturePad from '@/components/legal/SignaturePad';
import LegalAgreementDocument from '@/components/legal/LegalAgreementDocument';
import { SplitPane } from '@/components/ui/split-pane';
import { Checkbox } from '@/components/ui/checkbox';

interface Agreement {
  id: string;
  driver_id: string;
  owner_id: string;
  vehicle_id: string | null;
  status: string;
  driver_signature: string | null;
  owner_signature: string | null;
  admin_witness_signature: string | null;
  driver_signed_at: string | null;
  owner_signed_at: string | null;
  admin_witnessed_at: string | null;
  created_at: string;
  email_sent_at: string | null;
  driver_profile?: { full_name: string; email: string };
  owner_profile?: { full_name: string; email: string };
  vehicle?: { make: string; model: string; year: number; license_plate: string; vin: string | null };
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string | null;
  owner_id: string;
}

const LegalAgreementsManagement: React.FC = () => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // New agreement form state
  const [showNewAgreementDialog, setShowNewAgreementDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [adminSignature, setAdminSignature] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // View agreement state
  const [viewAgreement, setViewAgreement] = useState<Agreement | null>(null);
  const [isWitnessing, setIsWitnessing] = useState(false);
  const [witnessSignature, setWitnessSignature] = useState<string | null>(null);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch agreements
      const { data: agreementsData, error: agreementsError } = await supabase
        .from('legal_agreements')
        .select('*')
        .order('created_at', { ascending: false });

      if (agreementsError) throw agreementsError;

      // Fetch profiles for drivers and owners
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      // Fetch user roles to identify drivers and owners
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const driverIds = rolesData?.filter(r => r.role === 'driver').map(r => r.user_id) || [];
      const ownerIds = rolesData?.filter(r => r.role === 'owner').map(r => r.user_id) || [];

      setDrivers(profilesData?.filter(p => driverIds.includes(p.user_id)) || []);
      setOwners(profilesData?.filter(p => ownerIds.includes(p.user_id)) || []);

      // Fetch vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*');

      setVehicles(vehiclesData || []);

      // Enrich agreements with profile and vehicle data
      const enrichedAgreements = agreementsData?.map(agreement => {
        const driverProfile = profilesData?.find(p => p.user_id === agreement.driver_id);
        const ownerProfile = profilesData?.find(p => p.user_id === agreement.owner_id);
        const vehicle = vehiclesData?.find(v => v.id === agreement.vehicle_id);

        return {
          ...agreement,
          driver_profile: driverProfile ? { full_name: driverProfile.full_name || 'Unknown', email: driverProfile.email || '' } : undefined,
          owner_profile: ownerProfile ? { full_name: ownerProfile.full_name || 'Unknown', email: ownerProfile.email || '' } : undefined,
          vehicle: vehicle || undefined,
        };
      }) || [];

      setAgreements(enrichedAgreements);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgreement = async () => {
    if (!selectedDriver || !selectedOwner || !selectedVehicle || !adminSignature) {
      toast.error('Please fill all fields and provide your witness signature');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const driver = drivers.find(d => d.user_id === selectedDriver);
      const owner = owners.find(o => o.user_id === selectedOwner);
      const vehicle = vehicles.find(v => v.id === selectedVehicle);

      const agreementContent = `
VEHICLE RENTAL AGREEMENT

Agreement Date: ${new Date().toISOString()}

PARTIES:
Owner: ${owner?.full_name} (${owner?.email})
Driver: ${driver?.full_name} (${driver?.email})

VEHICLE:
${vehicle?.year} ${vehicle?.make} ${vehicle?.model}
License Plate: ${vehicle?.license_plate}
${vehicle?.vin ? `VIN: ${vehicle.vin}` : ''}

This agreement is governed by the RentMaiKar Terms of Use and Privacy Policy.
All pricing and payment terms are as displayed on the RentMaiKar platform.
      `.trim();

      const { error } = await supabase
        .from('legal_agreements')
        .insert({
          driver_id: selectedDriver,
          owner_id: selectedOwner,
          vehicle_id: selectedVehicle,
          agreement_content: agreementContent,
          admin_witness_signature: adminSignature,
          admin_witnessed_at: new Date().toISOString(),
          admin_witness_id: user.id,
          status: 'pending_signatures',
        });

      if (error) throw error;

      toast.success('Agreement created successfully. Awaiting signatures from driver and owner.');
      setShowNewAgreementDialog(false);
      setSelectedDriver('');
      setSelectedOwner('');
      setSelectedVehicle('');
      setAdminSignature(null);
      fetchData();
    } catch (error) {
      console.error('Error creating agreement:', error);
      toast.error('Failed to create agreement');
    } finally {
      setIsCreating(false);
    }
  };

  const handleWitnessAgreement = async (agreementId: string) => {
    if (!witnessSignature) {
      toast.error('Please provide your witness signature');
      return;
    }

    setIsWitnessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const agreement = agreements.find(a => a.id === agreementId);
      const willBeComplete = agreement?.driver_signature && agreement?.owner_signature;

      const updates: Record<string, unknown> = {
        admin_witness_signature: witnessSignature,
        admin_witnessed_at: new Date().toISOString(),
        admin_witness_id: user.id,
      };

      if (willBeComplete) {
        updates.status = 'completed';
      }

      const { error } = await supabase
        .from('legal_agreements')
        .update(updates)
        .eq('id', agreementId);

      if (error) throw error;

      // Send email if completed
      if (willBeComplete && agreement) {
        try {
          await supabase.functions.invoke('send-agreement-email', {
            body: {
              agreementId,
              driverEmail: agreement.driver_profile?.email,
              driverName: agreement.driver_profile?.full_name,
              ownerEmail: agreement.owner_profile?.email,
              ownerName: agreement.owner_profile?.full_name,
              vehicleInfo: agreement.vehicle 
                ? `${agreement.vehicle.year} ${agreement.vehicle.make} ${agreement.vehicle.model}`
                : 'Vehicle',
            },
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }

      toast.success(willBeComplete 
        ? 'Agreement completed and emails sent to both parties!'
        : 'Witness signature recorded');
      setViewAgreement(null);
      setWitnessSignature(null);
      fetchData();
    } catch (error) {
      console.error('Error witnessing agreement:', error);
      toast.error('Failed to witness agreement');
    } finally {
      setIsWitnessing(false);
    }
  };

  const getStatusBadge = (status: string, agreement: Agreement) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    
    const pendingSignatures = [];
    if (!agreement.driver_signature) pendingSignatures.push('Driver');
    if (!agreement.owner_signature) pendingSignatures.push('Owner');
    if (!agreement.admin_witness_signature) pendingSignatures.push('Admin');
    
    if (pendingSignatures.length > 0) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          <Clock className="h-3 w-3 mr-1" />
          Pending: {pendingSignatures.join(', ')}
        </Badge>
      );
    }
    
    return <Badge variant="secondary">{status}</Badge>;
  };

  const filteredAgreements = agreements.filter(agreement => {
    const matchesSearch = 
      agreement.driver_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.owner_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.vehicle?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || agreement.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const ownerVehicles = vehicles.filter(v => v.owner_id === selectedOwner);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Legal Agreements
            </CardTitle>
            <CardDescription>
              Manage and witness rental agreements between drivers and owners
            </CardDescription>
          </div>
          <Dialog open={showNewAgreementDialog} onOpenChange={setShowNewAgreementDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Agreement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Rental Agreement</DialogTitle>
                <DialogDescription>
                  Select the parties and vehicle for this agreement. You will witness the agreement as an administrator.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Owner</label>
                    <Select value={selectedOwner} onValueChange={(v) => { setSelectedOwner(v); setSelectedVehicle(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.filter(owner => owner.user_id).map(owner => (
                          <SelectItem key={owner.user_id} value={owner.user_id}>
                            {owner.full_name || owner.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Driver</label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.filter(driver => driver.user_id).map(driver => (
                          <SelectItem key={driver.user_id} value={driver.user_id}>
                            {driver.full_name || driver.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Vehicle</label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={!selectedOwner}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedOwner ? "Choose a vehicle" : "Select owner first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {ownerVehicles.filter(vehicle => vehicle.id).map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Administrator Witness Signature</label>
                  <SignaturePad onSignatureChange={setAdminSignature} />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowNewAgreementDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAgreement} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Create & Witness
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or license plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_signatures">Pending Signatures</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agreements Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agreements found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgreements.map((agreement) => (
                <TableRow key={agreement.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{agreement.driver_profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{agreement.driver_profile?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{agreement.owner_profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{agreement.owner_profile?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agreement.vehicle ? (
                      <div>
                        <p className="font-medium">{agreement.vehicle.year} {agreement.vehicle.make} {agreement.vehicle.model}</p>
                        <p className="text-sm text-muted-foreground">{agreement.vehicle.license_plate}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No vehicle</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(agreement.status, agreement)}</TableCell>
                  <TableCell>{format(new Date(agreement.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewAgreement(agreement)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* View Agreement Dialog */}
        <Dialog open={!!viewAgreement} onOpenChange={(open) => !open && setViewAgreement(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Agreement Details</DialogTitle>
              <DialogDescription>
                Review the agreement and signatures
              </DialogDescription>
            </DialogHeader>
            
            {viewAgreement && (
              <>
                <ScrollArea className="flex-1 pr-4">
                  <LegalAgreementDocument
                    driver={{
                      name: viewAgreement.driver_profile?.full_name || 'Unknown',
                      email: viewAgreement.driver_profile?.email || '',
                    }}
                    owner={{
                      name: viewAgreement.owner_profile?.full_name || 'Unknown',
                      email: viewAgreement.owner_profile?.email || '',
                    }}
                    vehicle={{
                      make: viewAgreement.vehicle?.make || 'Unknown',
                      model: viewAgreement.vehicle?.model || '',
                      year: viewAgreement.vehicle?.year || 0,
                      licensePlate: viewAgreement.vehicle?.license_plate || '',
                      vin: viewAgreement.vehicle?.vin || undefined,
                    }}
                    agreementDate={new Date(viewAgreement.created_at)}
                    driverSignature={viewAgreement.driver_signature}
                    ownerSignature={viewAgreement.owner_signature}
                    adminWitnessSignature={viewAgreement.admin_witness_signature}
                    driverSignedAt={viewAgreement.driver_signed_at ? new Date(viewAgreement.driver_signed_at) : null}
                    ownerSignedAt={viewAgreement.owner_signed_at ? new Date(viewAgreement.owner_signed_at) : null}
                    adminWitnessedAt={viewAgreement.admin_witnessed_at ? new Date(viewAgreement.admin_witnessed_at) : null}
                  />
                </ScrollArea>

                {/* Admin can witness if not yet witnessed but both parties have signed */}
                {!viewAgreement.admin_witness_signature && 
                 viewAgreement.driver_signature && 
                 viewAgreement.owner_signature && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Add Your Witness Signature</h3>
                      <SignaturePad onSignatureChange={setWitnessSignature} />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        onClick={() => handleWitnessAgreement(viewAgreement.id)}
                        disabled={!witnessSignature || isWitnessing}
                      >
                        {isWitnessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Witnessing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Witness & Complete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default LegalAgreementsManagement;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/legal/SignaturePad';
import LegalAgreementDocument from '@/components/legal/LegalAgreementDocument';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
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

interface Negotiation {
  id: string;
  driver_id: string;
  owner_id: string | null;
  vehicle_id: string | null;
  status: string;
  final_daily_rate: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  currency: string;
}

interface CreateAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedDriver?: string;
}

export function CreateAgreementDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedDriver,
}: CreateAgreementDialogProps) {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDriver, setSelectedDriver] = useState<string>(preSelectedDriver || '');
  const [selectedNegotiation, setSelectedNegotiation] = useState<string>('');
  const [adminSignature, setAdminSignature] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (preSelectedDriver) setSelectedDriver(preSelectedDriver);
  }, [preSelectedDriver]);

  // Reset negotiation selection when driver changes
  useEffect(() => {
    setSelectedNegotiation('');
  }, [selectedDriver]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      // Fetch user roles
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

      // Fetch approved negotiations (driver's choice of vehicles)
      const { data: negotiationsData } = await supabase
        .from('price_negotiations')
        .select('*')
        .eq('status', 'approved');

      setNegotiations(negotiationsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get negotiations for the selected driver
  const driverNegotiations = negotiations.filter(n => n.driver_id === selectedDriver);

  // Get the selected negotiation details
  const currentNegotiation = negotiations.find(n => n.id === selectedNegotiation);

  const handleCreate = async () => {
    if (!selectedDriver || !selectedNegotiation || !adminSignature) {
      toast.error('Please select a driver, their approved vehicle choice, and provide your witness signature');
      return;
    }

    const negotiation = negotiations.find(n => n.id === selectedNegotiation);
    if (!negotiation || !negotiation.owner_id || !negotiation.vehicle_id) {
      toast.error('Invalid negotiation selected');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const driver = drivers.find(d => d.user_id === selectedDriver);
      const owner = owners.find(o => o.user_id === negotiation.owner_id);
      const vehicle = vehicles.find(v => v.id === negotiation.vehicle_id);

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

NEGOTIATION REFERENCE: ${negotiation.id}
Agreed Daily Rate: As per RentMaiKar platform pricing

This agreement is governed by the RentMaiKar Terms of Use and Privacy Policy.
All pricing and payment terms are as displayed on the RentMaiKar platform.
      `.trim();

      const { error } = await supabase
        .from('legal_agreements')
        .insert({
          driver_id: selectedDriver,
          owner_id: negotiation.owner_id,
          vehicle_id: negotiation.vehicle_id,
          agreement_content: agreementContent,
          admin_witness_signature: adminSignature,
          admin_witnessed_at: new Date().toISOString(),
          admin_witness_id: user.id,
          status: 'pending_signatures',
        });

      if (error) throw error;

      toast.success('Agreement created successfully. Awaiting signatures from driver and owner.');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating agreement:', error);
      toast.error('Failed to create agreement');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedDriver(preSelectedDriver || '');
    setSelectedNegotiation('');
    setAdminSignature(null);
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Unknown Owner';
    const owner = owners.find(o => o.user_id === ownerId);
    return owner?.full_name || owner?.email || 'Unknown Owner';
  };

  const getVehicleInfo = (negotiation: Negotiation) => {
    if (negotiation.vehicle_id) {
      const vehicle = vehicles.find(v => v.id === negotiation.vehicle_id);
      if (vehicle) {
        return `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`;
      }
    }
    // Fallback to negotiation data if vehicle not found
    return `${negotiation.vehicle_year} ${negotiation.vehicle_make} ${negotiation.vehicle_model}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Rental Agreement
          </DialogTitle>
          <DialogDescription>
            Create an agreement based on the driver's approved vehicle negotiations. Only approved negotiations are shown.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Select Driver */}
            <div className="space-y-2">
              <label className="text-sm font-medium">1. Select Driver</label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(driver => driver.user_id).map(driver => (
                    <SelectItem key={driver.user_id} value={driver.user_id}>
                      {driver.full_name || driver.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select from Driver's Approved Negotiations */}
            <div className="space-y-2">
              <label className="text-sm font-medium">2. Select Driver's Vehicle Choice (Approved Negotiations)</label>
              {selectedDriver && driverNegotiations.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This driver has no approved vehicle negotiations. The driver must first negotiate and have a rate approved before an agreement can be created.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select 
                  value={selectedNegotiation} 
                  onValueChange={setSelectedNegotiation}
                  disabled={!selectedDriver || driverNegotiations.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDriver ? "Choose from driver's approved vehicles" : "Select driver first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {driverNegotiations.filter(n => n.id).map(negotiation => (
                      <SelectItem key={negotiation.id} value={negotiation.id}>
                        <div className="flex items-center gap-2">
                          <span>{getVehicleInfo(negotiation)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground text-sm">
                            Owner: {getOwnerName(negotiation.owner_id)}
                          </span>
                          {negotiation.final_daily_rate && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-xs">
                                {negotiation.currency} {negotiation.final_daily_rate}/day
                              </Badge>
                            </>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Show selected details */}
            {currentNegotiation && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Agreement Details Preview</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Driver:</span>{' '}
                    {drivers.find(d => d.user_id === selectedDriver)?.full_name || 'Unknown'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner:</span>{' '}
                    {getOwnerName(currentNegotiation.owner_id)}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Vehicle:</span>{' '}
                    {getVehicleInfo(currentNegotiation)}
                  </div>
                  {currentNegotiation.final_daily_rate && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Agreed Rate:</span>{' '}
                      <Badge variant="secondary">
                        {currentNegotiation.currency} {currentNegotiation.final_daily_rate}/day
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Admin Signature */}
            <div className="space-y-2">
              <label className="text-sm font-medium">3. Administrator Witness Signature</label>
              <SignaturePad onSignatureChange={setAdminSignature} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isCreating || !selectedDriver || !selectedNegotiation || !adminSignature}
              >
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
        )}
      </DialogContent>
    </Dialog>
  );
}

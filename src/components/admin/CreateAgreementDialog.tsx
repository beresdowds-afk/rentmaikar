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
import { Loader2, Send, FileText } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/legal/SignaturePad';
import { supabase } from '@/integrations/supabase/client';

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

interface CreateAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preSelectedDriver?: string;
  preSelectedOwner?: string;
}

export function CreateAgreementDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedDriver,
  preSelectedOwner,
}: CreateAgreementDialogProps) {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDriver, setSelectedDriver] = useState<string>(preSelectedDriver || '');
  const [selectedOwner, setSelectedOwner] = useState<string>(preSelectedOwner || '');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [adminSignature, setAdminSignature] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (preSelectedDriver) setSelectedDriver(preSelectedDriver);
    if (preSelectedOwner) setSelectedOwner(preSelectedOwner);
  }, [preSelectedDriver, preSelectedOwner]);

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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
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
    setSelectedOwner(preSelectedOwner || '');
    setSelectedVehicle('');
    setAdminSignature(null);
  };

  const ownerVehicles = vehicles.filter(v => v.owner_id === selectedOwner);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Rental Agreement
          </DialogTitle>
          <DialogDescription>
            Select the parties and vehicle for this agreement. You will witness the agreement as an administrator.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Owner</label>
                <Select 
                  value={selectedOwner} 
                  onValueChange={(v) => { setSelectedOwner(v); setSelectedVehicle(''); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map(owner => (
                      <SelectItem key={owner.user_id} value={owner.user_id}>
                        {owner.full_name || owner.email || 'Unknown'}
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
                    {drivers.map(driver => (
                      <SelectItem key={driver.user_id} value={driver.user_id}>
                        {driver.full_name || driver.email || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Vehicle</label>
              <Select 
                value={selectedVehicle} 
                onValueChange={setSelectedVehicle} 
                disabled={!selectedOwner}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedOwner ? "Choose a vehicle" : "Select owner first"} />
                </SelectTrigger>
                <SelectContent>
                  {ownerVehicles.length === 0 ? (
                    <SelectItem value="none" disabled>No vehicles found for this owner</SelectItem>
                  ) : (
                    ownerVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Administrator Witness Signature</label>
              <SignaturePad onSignatureChange={setAdminSignature} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isCreating || !selectedDriver || !selectedOwner || !selectedVehicle || !adminSignature}
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

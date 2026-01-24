import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Edit, Save, Car, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  pickup_location: string | null;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_instructions: string | null;
}

const usaCities = ['Baltimore', 'Washington DC', 'Arlington', 'Alexandria', 'Bethesda', 'Silver Spring', 'Rockville'];
const nigeriaCities = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu'];

export function VehiclePickupLocation() {
  const { user } = useAuth();
  const { country } = useRegion();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    pickup_location: '',
    pickup_address: '',
    pickup_city: '',
    pickup_instructions: '',
  });

  const cities = country === 'USA' ? usaCities : nigeriaCities;

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, license_plate, pickup_location, pickup_address, pickup_city, pickup_instructions')
        .eq('owner_id', user.id);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      pickup_location: vehicle.pickup_location || '',
      pickup_address: vehicle.pickup_address || '',
      pickup_city: vehicle.pickup_city || '',
      pickup_instructions: vehicle.pickup_instructions || '',
    });
  };

  const handleSave = async () => {
    if (!editingVehicle) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          pickup_location: formData.pickup_location || null,
          pickup_address: formData.pickup_address || null,
          pickup_city: formData.pickup_city || null,
          pickup_instructions: formData.pickup_instructions || null,
        })
        .eq('id', editingVehicle.id);

      if (error) throw error;

      toast.success('Pickup location updated successfully');
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error) {
      console.error('Error updating pickup location:', error);
      toast.error('Failed to update pickup location');
    } finally {
      setSaving(false);
    }
  };

  const hasPickupDetails = (vehicle: Vehicle) => {
    return vehicle.pickup_location || vehicle.pickup_address || vehicle.pickup_city;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Vehicle Pickup Locations
        </CardTitle>
        <CardDescription>
          Set pickup locations for your vehicles. This information will be shared with drivers after signing the rental agreement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vehicles found. Add a vehicle first to set pickup locations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div 
                key={vehicle.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </p>
                    <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                    {hasPickupDetails(vehicle) && (
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600">
                          {vehicle.pickup_city || vehicle.pickup_location || 'Location set'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {hasPickupDetails(vehicle) ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Set
                    </Badge>
                  )}
                  
                  <Dialog open={editingVehicle?.id === vehicle.id} onOpenChange={(open) => !open && setEditingVehicle(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(vehicle)}>
                        <Edit className="h-4 w-4 mr-1" />
                        {hasPickupDetails(vehicle) ? 'Edit' : 'Set Location'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Set Pickup Location</DialogTitle>
                        <DialogDescription>
                          {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.license_plate}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Location Name / Landmark</Label>
                          <Input 
                            placeholder="e.g. Downtown Office, Airport Area, Main Street"
                            value={formData.pickup_location}
                            onChange={(e) => setFormData(prev => ({ ...prev, pickup_location: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">A recognizable name or landmark near the pickup point</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Select 
                            value={formData.pickup_city} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, pickup_city: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Full Address</Label>
                          <Input 
                            placeholder="Enter the full street address"
                            value={formData.pickup_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, pickup_address: e.target.value }))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Special Instructions (Optional)</Label>
                          <Textarea 
                            placeholder="e.g. Park in visitor spot #5, call when arrived, bring valid ID..."
                            value={formData.pickup_instructions}
                            onChange={(e) => setFormData(prev => ({ ...prev, pickup_instructions: e.target.value }))}
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground">Any special instructions for the driver when picking up the vehicle</p>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                          <Button variant="outline" onClick={() => setEditingVehicle(null)} className="flex-1">
                            Cancel
                          </Button>
                          <Button onClick={handleSave} disabled={saving} className="flex-1">
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Location
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

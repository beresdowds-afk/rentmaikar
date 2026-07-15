import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link as LinkIcon, Unlink, Car, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Device {
  id: string;
  serial_number: string;
  imei: string;
  device_model: string | null;
  status: string;
  is_linked: boolean;
  vehicle_id: string | null;
}
interface Sim { id: string; iccid: string; msisdn: string | null; status: string; device_id: string | null; }
interface Vehicle { id: string; license_plate: string | null; make: string | null; model: string | null; year: number | null; owner_id: string | null; }

export const DeviceLinking = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sims, setSims] = useState<Sim[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Link SIM dialog
  const [linkSimFor, setLinkSimFor] = useState<Device | null>(null);
  const [pickedSim, setPickedSim] = useState<string>('');
  const [imeiConfirm, setImeiConfirm] = useState<string>('');
  const [linking, setLinking] = useState(false);

  // Link vehicle dialog
  const [linkVehicleFor, setLinkVehicleFor] = useState<Device | null>(null);
  const [pickedVehicle, setPickedVehicle] = useState<string>('');
  const [vehLinking, setVehLinking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [devRes, simRes, vehRes] = await Promise.all([
        supabase.functions.invoke('iot-admin', { body: { action: 'list_devices' } }),
        supabase.functions.invoke('iot-admin', { body: { action: 'list_available_sims' } }),
        supabase.from('vehicles').select('id, license_plate, make, model, year, owner_id').order('created_at', { ascending: false }),
      ]);
      if (devRes.error) throw devRes.error;
      if (simRes.error) throw simRes.error;
      if (vehRes.error) throw vehRes.error;
      setDevices((devRes.data as any).devices || []);
      setSims((simRes.data as any).sims || []);
      setVehicles((vehRes.data as Vehicle[]) || []);
    } catch (err: any) {
      toast.error('Failed to load', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const simsByDevice = useMemo(() => {
    // sims returned by list_available_sims are unlinked; we still show device→sim relationship from device.sim_provider etc.
    return new Map<string, Sim>();
  }, [sims]);

  const availableSims = sims;
  const vehiclesWithDevice = new Set(devices.filter(d => d.vehicle_id).map(d => d.vehicle_id));
  const availableVehicles = vehicles.filter(v => !vehiclesWithDevice.has(v.id));

  const openLinkSim = (d: Device) => {
    setLinkSimFor(d);
    setPickedSim('');
    setImeiConfirm('');
  };

  const submitLinkSim = async () => {
    if (!linkSimFor || !pickedSim) return;
    if (imeiConfirm.trim() !== linkSimFor.imei) {
      toast.error('IMEI does not match — type it exactly to confirm.');
      return;
    }
    setLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('iot-admin', {
        body: { action: 'link_sim_to_device', device_imei: linkSimFor.imei, sim_id: pickedSim },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success('SIM linked to device', { description: 'You can now activate the pair.' });
      setLinkSimFor(null);
      load();
    } catch (err: any) {
      toast.error('Link failed', { description: err.message });
    } finally { setLinking(false); }
  };

  const submitLinkVehicle = async () => {
    if (!linkVehicleFor || !pickedVehicle) return;
    setVehLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('iot-admin', {
        body: { action: 'link_to_vehicle', device_id: linkVehicleFor.id, vehicle_id: pickedVehicle },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success('Device linked to vehicle', { description: 'It will appear on the live tracking map once telemetry arrives.' });
      setLinkVehicleFor(null); setPickedVehicle('');
      load();
    } catch (err: any) {
      toast.error('Link failed', { description: err.message });
    } finally { setVehLinking(false); }
  };

  const unlinkVehicle = async (d: Device) => {
    try {
      const { data, error } = await supabase.functions.invoke('iot-admin', {
        body: { action: 'unlink_from_vehicle', device_id: d.id },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success('Device unlinked from vehicle');
      load();
    } catch (err: any) {
      toast.error('Unlink failed', { description: err.message });
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          <strong>Workflow:</strong> Register device → link eSIM by IMEI → activate the pair → link to vehicle. Only then will it appear live on maps.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Devices & their SIM / Vehicle</CardTitle>
          <CardDescription>Pair a SIM to each device using its IMEI, then attach the device to a vehicle.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>SIM</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Register devices in the Device Registry tab first.</TableCell></TableRow>
                ) : devices.map(d => {
                  const vehicle = vehicles.find(v => v.id === d.vehicle_id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell><div className="font-medium">{d.serial_number}</div><div className="text-xs text-muted-foreground">{d.device_model}</div></TableCell>
                      <TableCell className="font-mono text-xs">{d.imei}</TableCell>
                      <TableCell>
                        <Badge variant={d.is_linked ? 'default' : 'secondary'}>
                          {/* Whether SIM is linked is denormalized on device.sim_provider */}
                          {(d as any).sim_provider ? 'SIM linked' : 'No SIM'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vehicle
                          ? <div><div className="font-medium">{vehicle.license_plate}</div><div className="text-xs text-muted-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</div></div>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell><Badge variant={d.status === 'active' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => openLinkSim(d)} disabled={!!(d as any).sim_provider}>
                          <LinkIcon className="h-4 w-4 mr-1" /> Link SIM
                        </Button>
                        {d.vehicle_id
                          ? <Button size="sm" variant="outline" onClick={() => unlinkVehicle(d)}><Unlink className="h-4 w-4 mr-1" /> Unlink vehicle</Button>
                          : <Button size="sm" onClick={() => { setLinkVehicleFor(d); setPickedVehicle(''); }} disabled={d.status !== 'active'}>
                              <Car className="h-4 w-4 mr-1" /> Link vehicle
                            </Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Link SIM dialog */}
      <Dialog open={!!linkSimFor} onOpenChange={o => !o && setLinkSimFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link eSIM to device by IMEI</DialogTitle>
            <DialogDescription>
              Device IMEI: <span className="font-mono">{linkSimFor?.imei}</span>. Type it again to confirm you're pairing the right hardware.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Available eSIM</Label>
              <Select value={pickedSim} onValueChange={setPickedSim}>
                <SelectTrigger><SelectValue placeholder={availableSims.length ? 'Choose SIM…' : 'No available SIMs — buy one first'} /></SelectTrigger>
                <SelectContent>
                  {availableSims.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.iccid} {s.msisdn ? `• ${s.msisdn}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Confirm IMEI</Label>
              <Input value={imeiConfirm} onChange={e => setImeiConfirm(e.target.value.replace(/\D/g, ''))} maxLength={15} placeholder="Retype the 15-digit IMEI" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkSimFor(null)}>Cancel</Button>
            <Button onClick={submitLinkSim} disabled={linking || !pickedSim || imeiConfirm !== linkSimFor?.imei}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LinkIcon className="h-4 w-4 mr-1" />} Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link vehicle dialog */}
      <Dialog open={!!linkVehicleFor} onOpenChange={o => !o && setLinkVehicleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link device to vehicle</DialogTitle>
            <DialogDescription>Once linked and the device sends telemetry, the vehicle will appear on the live map.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Vehicle without a device</Label>
            <Select value={pickedVehicle} onValueChange={setPickedVehicle}>
              <SelectTrigger><SelectValue placeholder={availableVehicles.length ? 'Choose vehicle…' : 'All vehicles already have a device'} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {availableVehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.license_plate || v.id.slice(0, 8)} — {v.year} {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkVehicleFor(null)}>Cancel</Button>
            <Button onClick={submitLinkVehicle} disabled={vehLinking || !pickedVehicle}>
              {vehLinking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Car className="h-4 w-4 mr-1" />} Link vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

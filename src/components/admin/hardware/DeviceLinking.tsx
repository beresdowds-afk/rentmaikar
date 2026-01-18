import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, Unlink, Car, Cpu, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Device {
  id: string;
  serial_number: string;
  device_model: string;
  status: string;
  vehicle_id: string | null;
}

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  owner_name: string;
  has_device: boolean;
}

// Mock data
const mockDevices: Device[] = [
  { id: '1', serial_number: 'GPS-2024-001', device_model: 'GPS-01 Pro', status: 'active', vehicle_id: 'v1' },
  { id: '2', serial_number: 'GPS-2024-002', device_model: 'GPS-01', status: 'inactive', vehicle_id: null },
  { id: '3', serial_number: 'GPS-2024-003', device_model: 'GPS-01 Pro', status: 'active', vehicle_id: 'v2' },
  { id: '4', serial_number: 'GPS-2024-004', device_model: 'GPS-02', status: 'inactive', vehicle_id: null },
];

const mockVehicles: Vehicle[] = [
  { id: 'v1', license_plate: 'ABC-1234', make: 'Toyota', model: 'Camry', year: 2022, owner_name: 'John Doe', has_device: true },
  { id: 'v2', license_plate: 'XYZ-5678', make: 'Honda', model: 'Accord', year: 2023, owner_name: 'Jane Smith', has_device: true },
  { id: 'v3', license_plate: 'DEF-9012', make: 'Ford', model: 'Fusion', year: 2021, owner_name: 'Bob Johnson', has_device: false },
  { id: 'v4', license_plate: 'LAG-1234AB', make: 'Toyota', model: 'Corolla', year: 2020, owner_name: 'Chidi Okonkwo', has_device: false },
];

export const DeviceLinking = () => {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [vehicles] = useState<Vehicle[]>(mockVehicles);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);

  const unlinkedDevices = devices.filter((d) => !d.vehicle_id);
  const linkedDevices = devices.filter((d) => d.vehicle_id);
  const availableVehicles = vehicles.filter((v) => !v.has_device);

  const getVehicleInfo = (vehicleId: string) => {
    return vehicles.find((v) => v.id === vehicleId);
  };

  const handleLink = () => {
    if (!selectedDevice || !selectedVehicle) {
      toast.error('Please select both a device and a vehicle');
      return;
    }

    setDevices(
      devices.map((d) =>
        d.id === selectedDevice.id ? { ...d, vehicle_id: selectedVehicle } : d
      )
    );

    toast.success(
      `Device ${selectedDevice.serial_number} linked to vehicle successfully`
    );
    setIsLinkDialogOpen(false);
    setSelectedDevice(null);
    setSelectedVehicle('');
  };

  const handleUnlink = () => {
    if (!selectedDevice) return;

    setDevices(
      devices.map((d) =>
        d.id === selectedDevice.id ? { ...d, vehicle_id: null } : d
      )
    );

    toast.success(`Device ${selectedDevice.serial_number} unlinked from vehicle`);
    setIsUnlinkDialogOpen(false);
    setSelectedDevice(null);
  };

  const openLinkDialog = (device: Device) => {
    setSelectedDevice(device);
    setIsLinkDialogOpen(true);
  };

  const openUnlinkDialog = (device: Device) => {
    setSelectedDevice(device);
    setIsUnlinkDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linked Devices</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkedDevices.length}</div>
            <p className="text-xs text-muted-foreground">Devices paired with vehicles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unlinked Devices</CardTitle>
            <Cpu className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unlinkedDevices.length}</div>
            <p className="text-xs text-muted-foreground">Ready to be assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles Without Device</CardTitle>
            <Car className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableVehicles.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting device installation</p>
          </CardContent>
        </Card>
      </div>

      {/* Linked Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Linked Devices
          </CardTitle>
          <CardDescription>
            Devices currently paired with vehicles in the fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No linked devices
                    </TableCell>
                  </TableRow>
                ) : (
                  linkedDevices.map((device) => {
                    const vehicle = getVehicleInfo(device.vehicle_id!);
                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{device.serial_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {device.device_model}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle ? (
                            <div>
                              <div className="font-medium">{vehicle.license_plate}</div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{vehicle?.owner_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                            {device.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUnlinkDialog(device)}
                          >
                            <Unlink className="mr-2 h-4 w-4" />
                            Unlink
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unlinked Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Unlinked Devices
          </CardTitle>
          <CardDescription>
            Devices available for pairing with vehicles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlinkedDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      All devices are linked
                    </TableCell>
                  </TableRow>
                ) : (
                  unlinkedDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.serial_number}</TableCell>
                      <TableCell>{device.device_model}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{device.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openLinkDialog(device)}
                          disabled={availableVehicles.length === 0}
                        >
                          <Link className="mr-2 h-4 w-4" />
                          Link to Vehicle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Device to Vehicle</DialogTitle>
            <DialogDescription>
              Select a vehicle to pair with device {selectedDevice?.serial_number}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableVehicles.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No vehicles available for linking. All vehicles already have devices installed.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.license_plate} - {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.owner_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={!selectedVehicle}>
              Link Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Dialog */}
      <Dialog open={isUnlinkDialogOpen} onOpenChange={setIsUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink device {selectedDevice?.serial_number} from its vehicle?
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will remove the tracking capability from the associated vehicle. The device will need to be physically removed and can be reassigned later.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnlinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnlink}>
              Unlink Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Device {
  id: string;
  serial_number: string;
  imei: string;
  sim_number: string;
  sim_provider: string;
  device_model: string;
  firmware_version: string;
  status: 'inactive' | 'active' | 'offline' | 'maintenance';
  is_linked: boolean;
  created_at: string;
}

// Mock data for demonstration
const mockDevices: Device[] = [
  {
    id: '1',
    serial_number: 'GPS-2024-001',
    imei: '359876543210001',
    sim_number: '+1234567890',
    sim_provider: 'AT&T',
    device_model: 'GPS-01 Pro',
    firmware_version: '2.1.5',
    status: 'active',
    is_linked: true,
    created_at: '2024-01-15',
  },
  {
    id: '2',
    serial_number: 'GPS-2024-002',
    imei: '359876543210002',
    sim_number: '+1234567891',
    sim_provider: 'Verizon',
    device_model: 'GPS-01',
    firmware_version: '2.1.4',
    status: 'inactive',
    is_linked: false,
    created_at: '2024-01-18',
  },
  {
    id: '3',
    serial_number: 'GPS-2024-003',
    imei: '359876543210003',
    sim_number: '+2348012345678',
    sim_provider: 'MTN Nigeria',
    device_model: 'GPS-01 Pro',
    firmware_version: '2.1.5',
    status: 'offline',
    is_linked: true,
    created_at: '2024-01-20',
  },
];

export const DeviceRegistry = () => {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    serial_number: '',
    imei: '',
    sim_number: '',
    sim_provider: '',
    device_model: 'GPS-01',
    firmware_version: '',
    notes: '',
  });

  const filteredDevices = devices.filter(
    (device) =>
      device.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.imei.includes(searchTerm) ||
      device.sim_number.includes(searchTerm)
  );

  const handleAddDevice = () => {
    if (!newDevice.serial_number || !newDevice.imei) {
      toast.error('Serial number and IMEI are required');
      return;
    }

    const device: Device = {
      id: Date.now().toString(),
      ...newDevice,
      status: 'inactive',
      is_linked: false,
      created_at: new Date().toISOString().split('T')[0],
    };

    setDevices([...devices, device]);
    setNewDevice({
      serial_number: '',
      imei: '',
      sim_number: '',
      sim_provider: '',
      device_model: 'GPS-01',
      firmware_version: '',
      notes: '',
    });
    setIsAddDialogOpen(false);
    toast.success('Device registered successfully');
  };

  const handleDeleteDevice = (id: string) => {
    setDevices(devices.filter((d) => d.id !== id));
    toast.success('Device removed from registry');
  };

  const getStatusBadge = (status: Device['status']) => {
    const variants: Record<Device['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      offline: 'destructive',
      maintenance: 'outline',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Device Registry</CardTitle>
            <CardDescription>
              Register and manage IoT tracking devices
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Device</DialogTitle>
                <DialogDescription>
                  Enter the details of the IoT tracking device
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serial">Serial Number *</Label>
                    <Input
                      id="serial"
                      placeholder="GPS-2024-XXX"
                      value={newDevice.serial_number}
                      onChange={(e) =>
                        setNewDevice({ ...newDevice, serial_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imei">IMEI *</Label>
                    <Input
                      id="imei"
                      placeholder="15-digit IMEI"
                      value={newDevice.imei}
                      onChange={(e) =>
                        setNewDevice({ ...newDevice, imei: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sim">SIM Number</Label>
                    <Input
                      id="sim"
                      placeholder="+1234567890"
                      value={newDevice.sim_number}
                      onChange={(e) =>
                        setNewDevice({ ...newDevice, sim_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">SIM Provider</Label>
                    <Select
                      value={newDevice.sim_provider}
                      onValueChange={(value) =>
                        setNewDevice({ ...newDevice, sim_provider: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AT&T">AT&T</SelectItem>
                        <SelectItem value="Verizon">Verizon</SelectItem>
                        <SelectItem value="T-Mobile">T-Mobile</SelectItem>
                        <SelectItem value="MTN Nigeria">MTN Nigeria</SelectItem>
                        <SelectItem value="Airtel Nigeria">Airtel Nigeria</SelectItem>
                        <SelectItem value="Glo Nigeria">Glo Nigeria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">Device Model</Label>
                    <Select
                      value={newDevice.device_model}
                      onValueChange={(value) =>
                        setNewDevice({ ...newDevice, device_model: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GPS-01">GPS-01 (Basic)</SelectItem>
                        <SelectItem value="GPS-01 Pro">GPS-01 Pro (Advanced)</SelectItem>
                        <SelectItem value="GPS-02">GPS-02 (Fleet)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firmware">Firmware Version</Label>
                    <Input
                      id="firmware"
                      placeholder="2.1.5"
                      value={newDevice.firmware_version}
                      onChange={(e) =>
                        setNewDevice({ ...newDevice, firmware_version: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this device..."
                    value={newDevice.notes}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDevice}>Register Device</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by serial, IMEI, or SIM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>SIM Info</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No devices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.serial_number}</TableCell>
                    <TableCell className="font-mono text-sm">{device.imei}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{device.sim_number || '-'}</div>
                        <div className="text-muted-foreground">{device.sim_provider}</div>
                      </div>
                    </TableCell>
                    <TableCell>{device.device_model}</TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>
                      <Badge variant={device.is_linked ? 'default' : 'outline'}>
                        {device.is_linked ? 'Linked' : 'Unlinked'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDevice(device.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Power, PowerOff, RefreshCw, Shield, AlertTriangle, CheckCircle, XCircle, Wifi } from 'lucide-react';
import { toast } from 'sonner';

interface Device {
  id: string;
  serial_number: string;
  device_model: string;
  vehicle_plate: string | null;
  status: 'inactive' | 'active' | 'offline' | 'maintenance';
  is_linked: boolean;
  last_ping: string | null;
  activated_at: string | null;
}

// Mock data
const mockDevices: Device[] = [
  {
    id: '1',
    serial_number: 'GPS-2024-001',
    device_model: 'GPS-01 Pro',
    vehicle_plate: 'ABC-1234',
    status: 'active',
    is_linked: true,
    last_ping: '2024-01-20T14:30:00Z',
    activated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    serial_number: 'GPS-2024-002',
    device_model: 'GPS-01',
    vehicle_plate: null,
    status: 'inactive',
    is_linked: false,
    last_ping: null,
    activated_at: null,
  },
  {
    id: '3',
    serial_number: 'GPS-2024-003',
    device_model: 'GPS-01 Pro',
    vehicle_plate: 'XYZ-5678',
    status: 'offline',
    is_linked: true,
    last_ping: '2024-01-18T09:15:00Z',
    activated_at: '2024-01-16T11:30:00Z',
  },
  {
    id: '4',
    serial_number: 'GPS-2024-004',
    device_model: 'GPS-02',
    vehicle_plate: 'LAG-1234AB',
    status: 'maintenance',
    is_linked: true,
    last_ping: '2024-01-19T16:45:00Z',
    activated_at: '2024-01-17T08:00:00Z',
  },
];

export const DeviceActivation = () => {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    device: Device | null;
    action: 'activate' | 'deactivate';
  }>({ open: false, device: null, action: 'activate' });
  const [adminPin, setAdminPin] = useState('');

  const activeCount = devices.filter((d) => d.status === 'active').length;
  const inactiveCount = devices.filter((d) => d.status === 'inactive').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;
  const maintenanceCount = devices.filter((d) => d.status === 'maintenance').length;

  const handleToggleStatus = (device: Device) => {
    const newAction = device.status === 'active' ? 'deactivate' : 'activate';
    setConfirmDialog({ open: true, device, action: newAction });
  };

  const confirmAction = async () => {
    if (!confirmDialog.device) return;
    if (adminPin !== '1234') {
      toast.error('Invalid admin PIN');
      return;
    }

    setIsActivating(confirmDialog.device.id);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newStatus = confirmDialog.action === 'activate' ? 'active' : 'inactive';
    setDevices(
      devices.map((d) =>
        d.id === confirmDialog.device!.id
          ? {
              ...d,
              status: newStatus,
              activated_at: newStatus === 'active' ? new Date().toISOString() : d.activated_at,
            }
          : d
      )
    );

    toast.success(
      `Device ${confirmDialog.device.serial_number} ${confirmDialog.action}d successfully`
    );

    setIsActivating(null);
    setConfirmDialog({ open: false, device: null, action: 'activate' });
    setAdminPin('');
  };

  const handlePingDevice = async (device: Device) => {
    toast.info(`Pinging device ${device.serial_number}...`);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (device.status === 'offline') {
      toast.error(`Device ${device.serial_number} is not responding`);
    } else {
      setDevices(
        devices.map((d) =>
          d.id === device.id ? { ...d, last_ping: new Date().toISOString() } : d
        )
      );
      toast.success(`Device ${device.serial_number} responded successfully`);
    }
  };

  const getStatusIcon = (status: Device['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'offline':
        return <Wifi className="h-4 w-4 text-red-500" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: Device['status']) => {
    const variants: Record<Device['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      offline: 'destructive',
      maintenance: 'outline',
    };
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Power className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PowerOff className="h-4 w-4" />
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{inactiveCount}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{maintenanceCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Safety Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Safety Protocol Active</AlertTitle>
        <AlertDescription>
          Device activation/deactivation requires admin PIN verification. Remote vehicle controls follow safety guidelines: deactivation only when vehicle is stationary (&lt;2 mph).
        </AlertDescription>
      </Alert>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Device Activation Control</CardTitle>
          <CardDescription>
            Activate or deactivate IoT tracking devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Ping</TableHead>
                  <TableHead>Activated At</TableHead>
                  <TableHead>Toggle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
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
                      {device.vehicle_plate ? (
                        <Badge variant="outline">{device.vehicle_plate}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(device.last_ping)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(device.activated_at)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={device.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(device)}
                        disabled={
                          isActivating === device.id ||
                          device.status === 'maintenance' ||
                          !device.is_linked
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePingDevice(device)}
                        disabled={device.status === 'inactive'}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, device: null, action: 'activate' });
            setAdminPin('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'} Device
            </DialogTitle>
            <DialogDescription>
              You are about to {confirmDialog.action} device{' '}
              <strong>{confirmDialog.device?.serial_number}</strong>
              {confirmDialog.device?.vehicle_plate && (
                <> linked to vehicle <strong>{confirmDialog.device.vehicle_plate}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.action === 'deactivate' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Deactivating this device will stop all tracking and remote control capabilities for the associated vehicle.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Admin PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter admin PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground">
                For demo purposes, use PIN: 1234
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog({ open: false, device: null, action: 'activate' });
                setAdminPin('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'deactivate' ? 'destructive' : 'default'}
              onClick={confirmAction}
              disabled={!adminPin || isActivating === confirmDialog.device?.id}
            >
              {isActivating === confirmDialog.device?.id ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm ${confirmDialog.action === 'activate' ? 'Activation' : 'Deactivation'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

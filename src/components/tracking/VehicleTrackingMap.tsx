import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleLocation, mqttTracker, SafetyCheckResult } from '@/lib/mqtt-client';
import { regions, Region } from '@/lib/regions';
import VehicleMarker from './VehicleMarker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Wifi, WifiOff, Car, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Component to handle map view changes
const MapController = ({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  
  return null;
};

// Extended vehicle type with additional info
type ExtendedVehicle = VehicleLocation & { 
  make: string; 
  model: string; 
  licensePlate: string; 
  driverName: string;
  daysOverdue?: number;
};

// Mock vehicle data for demonstration
const generateMockVehicles = (region: Region): ExtendedVehicle[] => {
  const vehicles = [
    { make: 'Toyota', model: 'Camry', licensePlate: 'ABC-123' },
    { make: 'Honda', model: 'Accord', licensePlate: 'XYZ-789' },
    { make: 'Hyundai', model: 'Elantra', licensePlate: 'DEF-456' },
    { make: 'Nissan', model: 'Altima', licensePlate: 'GHI-321' },
    { make: 'Toyota', model: 'Corolla', licensePlate: 'JKL-654' },
  ];

  const drivers = ['John D.', 'Sarah M.', 'Mike T.', 'Grace O.', 'David K.'];
  const overdueOptions = [0, 0, 1, 2, 3]; // Some drivers have payment defaults

  return vehicles.map((v, i) => {
    const speed = Math.random() * 60;
    const vehicle: ExtendedVehicle = {
      vehicleId: `veh_${region.id}_${i + 1}`,
      latitude: region.center.lat + (Math.random() - 0.5) * 0.1,
      longitude: region.center.lng + (Math.random() - 0.5) * 0.1,
      speed,
      heading: Math.random() * 360,
      ignitionStatus: Math.random() > 0.2,
      batteryLevel: Math.floor(70 + Math.random() * 30),
      timestamp: new Date(),
      isParked: speed < 2,
      make: v.make,
      model: v.model,
      licensePlate: v.licensePlate,
      driverName: drivers[i],
      daysOverdue: overdueOptions[i],
    };
    
    // Update MQTT tracker with vehicle location for safety checks
    mqttTracker.updateVehicleLocation(vehicle.vehicleId, vehicle);
    
    return vehicle;
  });
};

const VehicleTrackingMap = () => {
  const [selectedRegion, setSelectedRegion] = useState<Region>(regions[0]);
  const [vehicles, setVehicles] = useState<ExtendedVehicle[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Safety confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    vehicleId: string;
    vehicleName: string;
    safetyCheck: SafetyCheckResult | null;
  }>({
    isOpen: false,
    vehicleId: '',
    vehicleName: '',
    safetyCheck: null,
  });

  // Initialize with mock data
  useEffect(() => {
    setVehicles(generateMockVehicles(selectedRegion));
  }, [selectedRegion]);

  const connectMQTT = useCallback(async () => {
    setIsConnecting(true);
    try {
      await mqttTracker.connect();
      setIsConnected(true);
      toast.success('Connected to vehicle tracking system');

      // Subscribe to all vehicle updates
      mqttTracker.subscribeToAllVehicles((location) => {
        setVehicles(prev => {
          const index = prev.findIndex(v => v.vehicleId === location.vehicleId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...location };
            return updated;
          }
          return prev;
        });
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to connect to tracking system');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectMQTT = useCallback(() => {
    mqttTracker.disconnect();
    setIsConnected(false);
    toast.info('Disconnected from tracking system');
  }, []);

  const handleDisableVehicle = async (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.vehicleId === vehicleId);
    if (!vehicle) return;

    // Check if this is after 3rd notification (3+ days overdue)
    const isAfterThirdNotification = (vehicle.daysOverdue || 0) >= 3;

    // Update local tracker with current vehicle state
    mqttTracker.updateVehicleLocation(vehicleId, vehicle);

    // Attempt disable with safety checks
    const result = await mqttTracker.sendCommand(vehicleId, 'disable', {
      isAfterThirdNotification,
      adminConfirmed: false,
    });

    if (result.success) {
      // Command succeeded, update UI
      setVehicles(prev => prev.map(v => 
        v.vehicleId === vehicleId ? { ...v, ignitionStatus: false } : v
      ));
      toast.success(result.message);
    } else if (result.safetyCheck?.requiresConfirmation) {
      // Show confirmation dialog
      setConfirmationDialog({
        isOpen: true,
        vehicleId,
        vehicleName: `${vehicle.make} ${vehicle.model}`,
        safetyCheck: result.safetyCheck,
      });
    } else {
      // Safety check failed completely
      toast.error(result.message, {
        duration: 5000,
        icon: <ShieldAlert className="w-5 h-5" />,
      });
    }
  };

  const handleConfirmedDisable = async () => {
    const { vehicleId } = confirmationDialog;
    const vehicle = vehicles.find(v => v.vehicleId === vehicleId);
    
    if (!vehicle) {
      setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const isAfterThirdNotification = (vehicle.daysOverdue || 0) >= 3;

    // Retry with admin confirmation
    const result = await mqttTracker.sendCommand(vehicleId, 'disable', {
      isAfterThirdNotification,
      adminConfirmed: true,
    });

    if (result.success) {
      setVehicles(prev => prev.map(v => 
        v.vehicleId === vehicleId ? { ...v, ignitionStatus: false } : v
      ));
      toast.success('Vehicle disabled with admin override');
    } else {
      toast.error(result.message);
    }

    setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleEnableVehicle = async (vehicleId: string) => {
    const result = await mqttTracker.sendCommand(vehicleId, 'enable');
    
    if (result.success) {
      setVehicles(prev => prev.map(v => 
        v.vehicleId === vehicleId ? { ...v, ignitionStatus: true } : v
      ));
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const refreshVehicles = () => {
    const newVehicles = generateMockVehicles(selectedRegion);
    setVehicles(newVehicles);
    toast.success('Vehicle positions refreshed');
  };

  const activeVehicles = vehicles.filter(v => v.ignitionStatus && !v.isParked).length;
  const parkedVehicles = vehicles.filter(v => v.isParked && v.ignitionStatus).length;
  const disabledVehicles = vehicles.filter(v => !v.ignitionStatus).length;

  return (
    <div className="space-y-4">
      {/* Safety Rules Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-amber-700">Vehicle Deactivation Safety Rules</p>
          <ul className="mt-1 text-amber-600/80 space-y-0.5">
            <li>• Vehicles can only be disabled when <strong>parked</strong> (speed &lt; 2 mph)</li>
            <li>• Automatic deactivation allowed only between <strong>1:00 AM - 5:00 AM</strong></li>
            <li>• Outside safe hours, <strong>admin confirmation</strong> is required</li>
            <li>• After 3rd payment notification, deactivation is allowed anytime (if parked)</li>
          </ul>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select 
            value={selectedRegion.id} 
            onValueChange={(id) => setSelectedRegion(regions.find(r => r.id === id) || regions[0])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="header-usa" disabled className="font-semibold text-primary">
                🇺🇸 USA (DMV States)
              </SelectItem>
              {regions.filter(r => r.country === 'USA').map(r => (
                <SelectItem key={r.id} value={r.id} className="pl-6">
                  {r.name}
                </SelectItem>
              ))}
              <SelectItem value="header-nigeria" disabled className="font-semibold text-primary">
                🇳🇬 Nigeria
              </SelectItem>
              {regions.filter(r => r.country === 'Nigeria').map(r => (
                <SelectItem key={r.id} value={r.id} className="pl-6">
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshVehicles}
            className="gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          
          {isConnected ? (
            <Button size="sm" variant="secondary" onClick={disconnectMQTT}>
              Disconnect
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="hero" 
              onClick={connectMQTT}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Live'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Car className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="font-semibold text-green-600">{activeVehicles}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Car className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground">Parked</p>
            <p className="font-semibold text-amber-600">{parkedVehicles}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-xs text-muted-foreground">Disabled</p>
            <p className="font-semibold text-red-600">{disabledVehicles}</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[500px] rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={[selectedRegion.center.lat, selectedRegion.center.lng]}
          zoom={selectedRegion.zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={selectedRegion.center} zoom={selectedRegion.zoom} />
          
          {vehicles.map(vehicle => (
            <VehicleMarker
              key={vehicle.vehicleId}
              vehicle={vehicle}
              onDisable={handleDisableVehicle}
              onEnable={handleEnableVehicle}
            />
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Active (Moving)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Parked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Disabled</span>
        </div>
      </div>

      {/* Admin Confirmation Dialog */}
      <AlertDialog 
        open={confirmationDialog.isOpen} 
        onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Admin Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are attempting to disable <strong>{confirmationDialog.vehicleName}</strong> outside 
                of the safe deactivation window (1:00 AM - 5:00 AM).
              </p>
              {confirmationDialog.safetyCheck?.vehicleStatus && (
                <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                  <p>• Vehicle is currently: <strong>{confirmationDialog.safetyCheck.vehicleStatus.isParked ? 'Parked' : 'Moving'}</strong></p>
                  <p>• Current speed: <strong>{Math.round(confirmationDialog.safetyCheck.vehicleStatus.speed)} mph</strong></p>
                  <p>• Current time: <strong>{new Date().toLocaleTimeString()}</strong></p>
                </div>
              )}
              <p className="text-destructive font-medium">
                Are you sure you want to proceed with vehicle deactivation?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleTrackingMap;

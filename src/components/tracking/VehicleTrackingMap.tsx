import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleLocation, mqttTracker } from '@/lib/mqtt-client';
import { regions, Region } from '@/lib/regions';
import VehicleMarker from './VehicleMarker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, Car, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Component to handle map view changes
const MapController = ({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  
  return null;
};

// Mock vehicle data for demonstration
const generateMockVehicles = (region: Region): (VehicleLocation & { make: string; model: string; licensePlate: string; driverName: string })[] => {
  const vehicles = [
    { make: 'Toyota', model: 'Camry', licensePlate: 'ABC-123' },
    { make: 'Honda', model: 'Accord', licensePlate: 'XYZ-789' },
    { make: 'Hyundai', model: 'Elantra', licensePlate: 'DEF-456' },
    { make: 'Nissan', model: 'Altima', licensePlate: 'GHI-321' },
    { make: 'Toyota', model: 'Corolla', licensePlate: 'JKL-654' },
  ];

  const drivers = ['John D.', 'Sarah M.', 'Mike T.', 'Grace O.', 'David K.'];

  return vehicles.map((v, i) => ({
    vehicleId: `veh_${region.id}_${i + 1}`,
    latitude: region.center.lat + (Math.random() - 0.5) * 0.1,
    longitude: region.center.lng + (Math.random() - 0.5) * 0.1,
    speed: Math.random() * 60,
    heading: Math.random() * 360,
    ignitionStatus: Math.random() > 0.2,
    batteryLevel: Math.floor(70 + Math.random() * 30),
    timestamp: new Date(),
    isParked: Math.random() > 0.6,
    make: v.make,
    model: v.model,
    licensePlate: v.licensePlate,
    driverName: drivers[i],
  }));
};

const VehicleTrackingMap = () => {
  const [selectedRegion, setSelectedRegion] = useState<Region>(regions[0]);
  const [vehicles, setVehicles] = useState<(VehicleLocation & { make: string; model: string; licensePlate: string; driverName: string })[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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
    try {
      if (isConnected) {
        await mqttTracker.sendCommand(vehicleId, 'disable');
      }
      // Update local state
      setVehicles(prev => prev.map(v => 
        v.vehicleId === vehicleId ? { ...v, ignitionStatus: false } : v
      ));
      toast.success('Vehicle disable command sent');
    } catch (error) {
      toast.error('Failed to send disable command');
    }
  };

  const handleEnableVehicle = async (vehicleId: string) => {
    try {
      if (isConnected) {
        await mqttTracker.sendCommand(vehicleId, 'enable');
      }
      // Update local state
      setVehicles(prev => prev.map(v => 
        v.vehicleId === vehicleId ? { ...v, ignitionStatus: true } : v
      ));
      toast.success('Vehicle enable command sent');
    } catch (error) {
      toast.error('Failed to send enable command');
    }
  };

  const refreshVehicles = () => {
    setVehicles(generateMockVehicles(selectedRegion));
    toast.success('Vehicle positions refreshed');
  };

  const activeVehicles = vehicles.filter(v => v.ignitionStatus && !v.isParked).length;
  const parkedVehicles = vehicles.filter(v => v.isParked).length;
  const disabledVehicles = vehicles.filter(v => !v.ignitionStatus).length;

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default VehicleTrackingMap;

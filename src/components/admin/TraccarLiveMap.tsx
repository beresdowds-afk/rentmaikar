import { useEffect, useMemo, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, Wifi, WifiOff, Power, PowerOff, MapPin, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fix default marker icons in Vite bundles
const carIcon = L.divIcon({
  className: "traccar-car-icon",
  html: `<div style="background:#10B981;border:2px solid #0A1628;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:#0A1628;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.35)">●</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string | null;
}
interface TraccarPosition {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number; // knots
  course: number;
  fixTime: string;
  address: string | null;
  attributes: Record<string, unknown>;
}

const KNOTS_TO_KMH = 1.852;

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  }, [points, map]);
  return null;
};

export default function TraccarLiveMap() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [positions, setPositions] = useState<TraccarPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyCmd, setBusyCmd] = useState<number | null>(null);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("traccar-admin", { body });
    if (error) throw error;
    return data as any;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await call({ action: "list_devices" });
      if (res?.configured === false) {
        setConfigured(false);
        setDevices([]);
        setPositions([]);
        return;
      }
      setConfigured(true);
      setDevices(res?.devices ?? []);
      setPositions(res?.positions ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load Traccar data");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const points = useMemo<[number, number][]>(
    () => positions.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]),
    [positions],
  );

  const posByDevice = useMemo(() => {
    const map = new Map<number, TraccarPosition>();
    positions.forEach(p => map.set(p.deviceId, p));
    return map;
  }, [positions]);

  const sendCommand = async (deviceId: number, type: "engineStop" | "engineResume") => {
    setBusyCmd(deviceId);
    try {
      await call({ action: "send_command", device_id: deviceId, command: type });
      toast.success(`${type === "engineStop" ? "Immobilize" : "Mobilize"} command sent`);
    } catch (e: any) {
      toast.error(e?.message ?? "Command failed");
    } finally {
      setBusyCmd(null);
    }
  };

  const online = devices.filter(d => d.status === "online").length;
  const center: [number, number] = points[0] ?? [9.082, 8.6753]; // Nigeria centroid fallback

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Live Vehicle Tracking Map (Traccar)
          </CardTitle>
          <CardDescription>
            Alternative to EMQX/MQTT — driven by the Traccar REST API. Auto-refreshes every 15 seconds.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={configured ? "default" : "secondary"} className="gap-1">
            {configured ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {configured === null ? "Checking…" : configured ? `${online}/${devices.length} online` : "Not configured"}
          </Badge>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {configured === false && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Traccar not configured</AlertTitle>
            <AlertDescription>
              Add <code>TRACCAR_BASE_URL</code> and either <code>TRACCAR_TOKEN</code> or{" "}
              <code>TRACCAR_EMAIL</code> + <code>TRACCAR_PASSWORD</code> as project secrets, then flip
              the Telemetry Provider switch to <b>Traccar</b>. EMQX/MQTT continues to work in parallel.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="h-[420px] w-full overflow-hidden rounded-md border">
          <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            {devices.map(d => {
              const p = posByDevice.get(d.id);
              if (!p) return null;
              const speedKmh = Math.round((p.speed ?? 0) * KNOTS_TO_KMH);
              return (
                <Marker key={d.id} position={[p.latitude, p.longitude]} icon={carIcon}>
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-semibold">{d.name || d.uniqueId}</div>
                      <div className="text-xs">Status: <b>{d.status}</b></div>
                      <div className="text-xs">Speed: {speedKmh} km/h</div>
                      <div className="text-xs">Last fix: {new Date(p.fixTime).toLocaleString()}</div>
                      {p.address && <div className="text-xs text-muted-foreground">{p.address}</div>}
                      <div className="flex gap-1 pt-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyCmd === d.id}
                          onClick={() => sendCommand(d.id, "engineStop")}
                        >
                          <PowerOff className="h-3 w-3 mr-1" /> Immobilize
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyCmd === d.id}
                          onClick={() => sendCommand(d.id, "engineResume")}
                        >
                          <Power className="h-3 w-3 mr-1" /> Mobilize
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="text-xs text-muted-foreground">
          Devices shown: {devices.length} · With live position: {positions.length} · Safety guard: immobilize
          commands are only executed by the backend when the vehicle is stopped and ignition is off.
        </div>
      </CardContent>
    </Card>
  );
}

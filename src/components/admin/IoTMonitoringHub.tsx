import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity, AlertTriangle, Battery, Car, CheckCircle, Clock, Cpu,
  Flame, Gauge, MapPin, Radio, RefreshCw, Satellite, Shield,
  Signal, Thermometer, Wifi, WifiOff, Zap, Siren, Eye,
  TrendingUp, BarChart3, CircleAlert, BellRing, Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TELEMETRY_SCHEDULES,
  ALERT_RULES,
  MONITORING_THRESHOLDS,
  type AlertSeverity,
} from '@/lib/telemetry-scheduler';

// ── Types ──────────────────────────────────────────────────

interface TelemetryEvent {
  id: string;
  vehicle_id: string;
  data_type: string;
  payload: Record<string, any>;
  mqtt_topic: string | null;
  received_at: string;
}

interface DeviceSummary {
  id: string;
  serial_number: string;
  vehicle_id: string | null;
  status: string;
  battery_level: number | null;
  signal_strength: number | null;
  last_ping: string | null;
  is_linked: boolean;
  device_model: string | null;
}

interface AccidentRecord {
  id: string;
  vehicle_id: string;
  event_type: string;
  severity: string;
  speed_at_event: number | null;
  total_g: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────

const timeAgo = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return 'destructive';
    case 'warning': return 'secondary';
    case 'info': return 'outline';
    default: return 'default';
  }
};

const severityIcon = (s: string) => {
  switch (s) {
    case 'critical': return <Flame className="h-3.5 w-3.5" />;
    case 'warning': return <AlertTriangle className="h-3.5 w-3.5" />;
    default: return <CircleAlert className="h-3.5 w-3.5" />;
  }
};

// ── Component ──────────────────────────────────────────────

export const IoTMonitoringHub = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([]);
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [telemetryFilter, setTelemetryFilter] = useState<string>('all');

  // ── Data Fetching ──────────────────────────────────────

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [devicesRes, telemetryRes, accidentsRes] = await Promise.all([
        supabase.from('iot_devices').select('id, serial_number, vehicle_id, status, battery_level, signal_strength, last_ping, is_linked, device_model').order('last_ping', { ascending: false, nullsFirst: false }),
        supabase.from('mqtt_telemetry_logs').select('*').order('received_at', { ascending: false }).limit(100),
        supabase.from('driver_behavior_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (devicesRes.data) setDevices(devicesRes.data as DeviceSummary[]);
      if (telemetryRes.data) setTelemetryLogs(telemetryRes.data as TelemetryEvent[]);
      if (accidentsRes.data) setAccidents(accidentsRes.data as AccidentRecord[]);
    } catch (err) {
      console.error('Failed to fetch IoT data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Computed Stats ─────────────────────────────────────

  const stats = useMemo(() => {
    const linked = devices.filter(d => d.is_linked);
    const online = linked.filter(d => d.status === 'active');
    const offline = linked.filter(d => {
      if (!d.last_ping) return true;
      return Date.now() - new Date(d.last_ping).getTime() > MONITORING_THRESHOLDS.vehicleOfflineTimeoutMs;
    });
    const lowBattery = linked.filter(d => d.battery_level !== null && d.battery_level < 15);
    const criticalAccidents = accidents.filter(a => a.severity === 'critical' || a.event_type === 'sudden_deceleration');

    return {
      totalDevices: devices.length,
      linkedDevices: linked.length,
      onlineDevices: online.length,
      offlineDevices: offline.length,
      lowBatteryDevices: lowBattery.length,
      totalTelemetryEvents: telemetryLogs.length,
      accidentEvents: accidents.length,
      criticalAccidents: criticalAccidents.length,
    };
  }, [devices, telemetryLogs, accidents]);

  const filteredTelemetry = useMemo(() => {
    if (telemetryFilter === 'all') return telemetryLogs;
    return telemetryLogs.filter(t => t.data_type.includes(telemetryFilter));
  }, [telemetryLogs, telemetryFilter]);

  // ── Render ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            IoT Monitoring Hub
          </h2>
          <p className="text-muted-foreground">
            Real-time telemetry, fleet health, accident alerts & rules engine
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Linked Devices</p>
                <p className="text-2xl font-bold">{stats.linkedDevices}</p>
              </div>
              <Cpu className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.totalDevices} total registered</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Online Now</p>
                <p className="text-2xl font-bold text-green-600">{stats.onlineDevices}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-500/60" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.offlineDevices} offline</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Battery</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowBatteryDevices}</p>
              </div>
              <Battery className="h-8 w-8 text-yellow-500/60" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Below 15% threshold</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Accident Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalAccidents}</p>
              </div>
              <Siren className="h-8 w-8 text-red-500/60" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.accidentEvents} total events</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Fleet Overview
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="gap-1.5">
            <Satellite className="h-3.5 w-3.5" />
            Telemetry Feed
          </TabsTrigger>
          <TabsTrigger value="accidents" className="gap-1.5">
            <Siren className="h-3.5 w-3.5" />
            Accident Alerts
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Alert Rules
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Schedules & QoS
          </TabsTrigger>
        </TabsList>

        {/* ── FLEET OVERVIEW ────────────────────────────── */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Fleet Device Status
              </CardTitle>
              <CardDescription>All linked IoT devices with real-time health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Battery</TableHead>
                      <TableHead>Signal</TableHead>
                      <TableHead>Last Ping</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.filter(d => d.is_linked).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No linked devices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      devices.filter(d => d.is_linked).map(device => {
                        const isOffline = !device.last_ping || Date.now() - new Date(device.last_ping).getTime() > MONITORING_THRESHOLDS.vehicleOfflineTimeoutMs;
                        return (
                          <TableRow key={device.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{device.serial_number}</div>
                                <div className="text-xs text-muted-foreground">{device.device_model || 'Unknown'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {device.vehicle_id ? (
                                <Badge variant="outline" className="text-xs">{device.vehicle_id.slice(0, 8)}...</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isOffline ? 'outline' : 'default'} className="gap-1">
                                {isOffline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                                {isOffline ? 'Offline' : 'Online'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {device.battery_level !== null ? (
                                <div className="flex items-center gap-2">
                                  <Battery className={`h-4 w-4 ${device.battery_level < 15 ? 'text-red-500' : device.battery_level < 30 ? 'text-yellow-500' : 'text-green-500'}`} />
                                  <Progress value={device.battery_level} className="h-2 w-14" />
                                  <span className="text-xs">{device.battery_level}%</span>
                                </div>
                              ) : <span className="text-muted-foreground text-sm">—</span>}
                            </TableCell>
                            <TableCell>
                              {device.signal_strength !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <Signal className={`h-4 w-4 ${device.signal_strength < 40 ? 'text-red-500' : device.signal_strength < 70 ? 'text-yellow-500' : 'text-green-500'}`} />
                                  <span className="text-xs">{device.signal_strength}%</span>
                                </div>
                              ) : <span className="text-muted-foreground text-sm">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {timeAgo(device.last_ping)}
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
        </TabsContent>

        {/* ── TELEMETRY FEED ────────────────────────────── */}
        <TabsContent value="telemetry">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Satellite className="h-5 w-5" />
                    Live Telemetry Feed
                  </CardTitle>
                  <CardDescription>Recent MQTT telemetry messages from fleet</CardDescription>
                </div>
                <Select value={telemetryFilter} onValueChange={setTelemetryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="gps">GPS</SelectItem>
                    <SelectItem value="engine">Engine</SelectItem>
                    <SelectItem value="diagnostics">Diagnostics</SelectItem>
                    <SelectItem value="health_alert">Health Alerts</SelectItem>
                    <SelectItem value="accident">Accidents</SelectItem>
                    <SelectItem value="batch">Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {filteredTelemetry.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Satellite className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No telemetry events found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTelemetry.map(event => {
                      const isAlert = event.data_type.includes('health_alert') || event.data_type.includes('accident');
                      return (
                        <div key={event.id} className={`flex items-start gap-3 p-3 rounded-lg border ${isAlert ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30'}`}>
                          <div className="mt-0.5">
                            {event.data_type.includes('gps') && <MapPin className="h-4 w-4 text-blue-500" />}
                            {event.data_type.includes('engine') && <Gauge className="h-4 w-4 text-orange-500" />}
                            {event.data_type.includes('diagnostics') && <Thermometer className="h-4 w-4 text-purple-500" />}
                            {event.data_type.includes('health_alert') && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {event.data_type.includes('accident') && <Siren className="h-4 w-4 text-red-600" />}
                            {event.data_type.includes('batch') && <BarChart3 className="h-4 w-4 text-muted-foreground" />}
                            {!['gps', 'engine', 'diagnostics', 'health_alert', 'accident', 'batch'].some(t => event.data_type.includes(t)) && <Radio className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{event.data_type}</Badge>
                              <span className="text-[10px] text-muted-foreground">{event.vehicle_id.slice(0, 12)}...</span>
                            </div>
                            {event.mqtt_topic && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{event.mqtt_topic}</p>
                            )}
                            <pre className="text-[11px] text-foreground/80 mt-1 whitespace-pre-wrap break-all max-h-20 overflow-hidden">
                              {JSON.stringify(event.payload, null, 1).slice(0, 200)}
                            </pre>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {timeAgo(event.received_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACCIDENT ALERTS ───────────────────────────── */}
        <TabsContent value="accidents">
          <div className="space-y-4">
            {/* Accident Pipeline Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-red-600">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium">Raw Impact ({'>'} 5G)</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{accidents.filter(a => a.event_type === 'sudden_deceleration' || a.event_type === 'impact').length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium">Rollover / Fire</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{accidents.filter(a => a.event_type === 'rollover' || a.event_type === 'fire').length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium">Airbag Deploy</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{accidents.filter(a => a.event_type === 'airbag').length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Siren className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium">Emergency Dispatched</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{accidents.filter(a => a.severity === 'critical').length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Accident Notification Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  MQTT Accident Topic Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <p className="font-sans text-sm font-medium text-foreground mb-2">Raw Sensor Data</p>
                    <p className="text-muted-foreground">.../accident/raw/impact</p>
                    <p className="text-muted-foreground">.../accident/raw/airbag</p>
                    <p className="text-muted-foreground">.../accident/raw/rollover</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-sans text-sm font-medium text-foreground mb-2">Verified Events</p>
                    <p className="text-muted-foreground">.../accident/verified/severe</p>
                    <p className="text-muted-foreground">.../accident/verified/minor</p>
                    <p className="text-muted-foreground">.../accident/verified/fire</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-sans text-sm font-medium text-foreground mb-2">Alert Routing</p>
                    <p className="text-red-500">.../alerts/emergency/{'{vehicle_id}'}</p>
                    <p className="text-orange-500">.../alerts/fleet/{'{vehicle_id}'}</p>
                    <p className="text-blue-500">.../alerts/insurance/{'{vehicle_id}'}</p>
                    <p className="text-purple-500">.../alerts/emergency_contact/{'{vehicle_id}'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accident Events Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Accident & Behavior Events
                </CardTitle>
                <CardDescription>Driver behavior logs including impact, harsh braking, and accident events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>G-Force</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Vehicle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accidents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No accident or behavior events recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        accidents.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs">{timeAgo(a.created_at)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize gap-1">
                                {a.event_type === 'sudden_deceleration' && <Zap className="h-3 w-3" />}
                                {a.event_type === 'rollover' && <RefreshCw className="h-3 w-3" />}
                                {a.event_type.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={severityColor(a.severity) as any} className="gap-1 text-xs">
                                {severityIcon(a.severity)}
                                {a.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {a.total_g ? `${a.total_g.toFixed(1)}G` : '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {a.speed_at_event !== null ? `${a.speed_at_event} mph` : '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {a.latitude && a.longitude ? (
                                <span className="text-muted-foreground">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {a.vehicle_id.slice(0, 8)}...
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── ALERT RULES ───────────────────────────────── */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Alert Rules Engine
              </CardTitle>
              <CardDescription>
                Configured rules that evaluate incoming telemetry and trigger alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ALERT_RULES.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.source === 'gps' ? 'bg-blue-500/10 text-blue-500' : rule.source === 'engine' ? 'bg-orange-500/10 text-orange-500' : rule.source === 'diagnostics' ? 'bg-purple-500/10 text-purple-500' : 'bg-red-500/10 text-red-500'}`}>
                        {rule.source === 'gps' && <MapPin className="h-5 w-5" />}
                        {rule.source === 'engine' && <Gauge className="h-5 w-5" />}
                        {rule.source === 'diagnostics' && <Thermometer className="h-5 w-5" />}
                        {rule.source === 'accident' && <Siren className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{rule.name}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">{rule.source}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <Switch checked={rule.enabled} disabled aria-label={`Toggle ${rule.name}`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SCHEDULES & QoS ──────────────────────────── */}
        <TabsContent value="schedules">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telemetry Schedules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Timer className="h-5 w-5" />
                  Telemetry Schedules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">GPS Location</span>
                    </div>
                    <Badge>QoS {TELEMETRY_SCHEDULES.GPS.qos}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Parked: Every {TELEMETRY_SCHEDULES.GPS.parkedIntervalMs / 60000} min</p>
                    <p>Moving: Every {TELEMETRY_SCHEDULES.GPS.movingIntervalMs / 1000}s</p>
                    <p>Motion threshold: {TELEMETRY_SCHEDULES.GPS.movingThresholdMph} mph</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">Engine Telemetry</span>
                    </div>
                    <Badge>QoS {TELEMETRY_SCHEDULES.ENGINE.qos}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Every {TELEMETRY_SCHEDULES.ENGINE.intervalMs / 60000} min</p>
                </div>

                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">Diagnostics</span>
                    </div>
                    <Badge>QoS {TELEMETRY_SCHEDULES.DIAGNOSTICS.qos}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">On occurrence (immediate)</p>
                </div>

                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Siren className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm">Accident Events</span>
                    </div>
                    <Badge variant="destructive">QoS {TELEMETRY_SCHEDULES.ACCIDENT.qos}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Exactly-once delivery (critical)</p>
                </div>

                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Batch Upload</span>
                    </div>
                    <Badge>QoS {TELEMETRY_SCHEDULES.BATCH.qos}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Max {TELEMETRY_SCHEDULES.BATCH.maxRecordsPerBatch} records per batch</p>
                </div>
              </CardContent>
            </Card>

            {/* Monitoring Thresholds & Session Config */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-5 w-5" />
                    Monitoring Thresholds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Offline Timeout</span>
                    </div>
                    <Badge variant="secondary">{MONITORING_THRESHOLDS.vehicleOfflineTimeoutMs / 60000} min</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Message Backlog Alert</span>
                    </div>
                    <Badge variant="secondary">{MONITORING_THRESHOLDS.messageBacklogThreshold.toLocaleString()} msgs</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Max Bandwidth/Vehicle/Hour</span>
                    </div>
                    <Badge variant="secondary">{MONITORING_THRESHOLDS.maxBandwidthPerVehiclePerHour / 1024 / 1024} MB</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Rate Limit</span>
                    </div>
                    <Badge variant="secondary">{MONITORING_THRESHOLDS.maxMessagesPerVehiclePerMinute} msgs/min</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wifi className="h-5 w-5" />
                    Session & LWT Config
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clean Session</span>
                    <Badge variant="outline">false (persistent)</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Expiry</span>
                    <span className="font-medium">24 hours</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receive Maximum</span>
                    <span className="font-medium">1,000 msgs</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Will Topic</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.../status</code>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Will QoS</span>
                    <Badge>QoS 1</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Will Retain</span>
                    <Badge variant="outline">true</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

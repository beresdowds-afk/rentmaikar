import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Wrench, 
  Car, 
  Shield,
  Search,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle,
  Eye,
  Filter,
  Bot,
  User
} from 'lucide-react';

interface Incident {
  id: string;
  vehicle_id: string;
  driver_id: string;
  owner_id: string | null;
  incident_type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  location_address: string | null;
  is_iot_detected: boolean;
  is_late_report: boolean;
  occurred_at: string;
  reported_at: string;
  estimated_downtime_hours: number | null;
  created_at: string;
}

interface DriverProfile {
  full_name: string | null;
  email: string | null;
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    accident: <AlertTriangle className="h-4 w-4 text-red-500" />,
    maintenance: <Wrench className="h-4 w-4 text-blue-500" />,
    breakdown: <Car className="h-4 w-4 text-orange-500" />,
    theft: <Shield className="h-4 w-4 text-purple-500" />,
    other: <Clock className="h-4 w-4 text-gray-500" />,
  };
  return icons[type] || icons.other;
};

const getSeverityBadge = (severity: string) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    low: 'secondary',
    medium: 'default',
    high: 'destructive',
    critical: 'destructive',
  };
  return (
    <Badge variant={variants[severity] || 'default'} className={severity === 'critical' ? 'animate-pulse' : ''}>
      {severity.toUpperCase()}
    </Badge>
  );
};

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    reported: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    acknowledged: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    in_progress: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    resolved: 'bg-green-500/10 text-green-600 border-green-500/30',
    closed: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  };
  return (
    <Badge variant="outline" className={colors[status] || colors.reported}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};

export function AdminIncidentManagement() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [driverProfiles, setDriverProfiles] = useState<Record<string, DriverProfile>>({});

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('vehicle_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('incident_type', typeFilter as 'accident' | 'maintenance' | 'breakdown' | 'theft' | 'other');
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'reported' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed');
      }

      const { data, error } = await query;

      if (error) throw error;
      setIncidents(data || []);

      // Fetch driver profiles
      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map(i => i.driver_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', driverIds);

        if (profiles) {
          const profileMap: Record<string, DriverProfile> = {};
          profiles.forEach(p => {
            profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
          });
          setDriverProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('[AdminIncidents] Error:', error);
      toast.error('Failed to fetch incidents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [typeFilter, statusFilter]);

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      } else if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('vehicle_incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      toast.success(`Status updated to ${newStatus}`);
      fetchIncidents();
      setSelectedIncident(null);
    } catch (error) {
      console.error('[AdminIncidents] Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const driver = driverProfiles[incident.driver_id];
    return (
      incident.title.toLowerCase().includes(query) ||
      incident.description.toLowerCase().includes(query) ||
      driver?.full_name?.toLowerCase().includes(query) ||
      driver?.email?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: incidents.length,
    pending: incidents.filter(i => i.status === 'reported').length,
    lateReports: incidents.filter(i => i.is_late_report).length,
    iotDetected: incidents.filter(i => i.is_iot_detected).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Incident Management</CardTitle>
              <CardDescription>
                View and manage vehicle incidents, accidents, and maintenance reports
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Total Incidents</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10">
            <p className="text-sm text-yellow-600">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10">
            <p className="text-sm text-red-600">Late Reports</p>
            <p className="text-2xl font-bold text-red-600">{stats.lateReports}</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10">
            <p className="text-sm text-blue-600">IoT Detected</p>
            <p className="text-2xl font-bold text-blue-600">{stats.iotDetected}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="accident">Accident</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="breakdown">Breakdown</SelectItem>
              <SelectItem value="theft">Theft</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h4 className="font-semibold text-lg">No Incidents</h4>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'No incidents match your filters'
                : 'No incidents have been reported yet'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id} className={incident.is_late_report ? 'bg-red-50/50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(incident.incident_type)}
                        <span className="capitalize">{incident.incident_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium max-w-[200px] truncate">{incident.title}</span>
                        {incident.is_iot_detected && (
                          <span title="IoT Detected">
                            <Bot className="h-4 w-4 text-blue-500" />
                          </span>
                        )}
                        {incident.is_late_report && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{driverProfiles[incident.driver_id]?.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                    <TableCell>{getStatusBadge(incident.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(incident.reported_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedIncident && getTypeIcon(selectedIncident.incident_type)}
                {selectedIncident?.title}
              </DialogTitle>
              <DialogDescription>
                Incident details and management
              </DialogDescription>
            </DialogHeader>

            {selectedIncident && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {getSeverityBadge(selectedIncident.severity)}
                  {getStatusBadge(selectedIncident.status)}
                  {selectedIncident.is_iot_detected && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                      <Bot className="h-3 w-3 mr-1" /> IoT Detected
                    </Badge>
                  )}
                  {selectedIncident.is_late_report && (
                    <Badge variant="destructive">Late Report</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Occurred At</p>
                    <p className="font-medium">{formatDate(selectedIncident.occurred_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reported At</p>
                    <p className="font-medium">{formatDate(selectedIncident.reported_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Driver</p>
                    <p className="font-medium">
                      {driverProfiles[selectedIncident.driver_id]?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {driverProfiles[selectedIncident.driver_id]?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Downtime</p>
                    <p className="font-medium">
                      {selectedIncident.estimated_downtime_hours 
                        ? `${selectedIncident.estimated_downtime_hours} hours`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedIncident.description}
                  </p>
                </div>

                {selectedIncident.location_address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="text-sm">{selectedIncident.location_address}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {selectedIncident.status === 'reported' && (
                    <Button 
                      onClick={() => handleStatusChange(selectedIncident.id, 'acknowledged')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acknowledge
                    </Button>
                  )}
                  {selectedIncident.status === 'acknowledged' && (
                    <Button 
                      onClick={() => handleStatusChange(selectedIncident.id, 'in_progress')}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {(selectedIncident.status === 'acknowledged' || selectedIncident.status === 'in_progress') && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedIncident.id, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedIncident(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

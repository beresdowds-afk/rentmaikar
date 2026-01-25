import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, FileCheck, Clock, CheckCircle, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InsuranceTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  city: string;
  region: string;
  driver_id: string | null;
  owner_id: string | null;
  vehicle_id: string | null;
  created_at: string;
  scheduled_date: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
}

const statusConfig = {
  pending_verification: { label: 'Pending Verification', color: 'bg-amber-500', icon: Clock },
  documents_requested: { label: 'Documents Requested', color: 'bg-blue-500', icon: FileText },
  under_review: { label: 'Under Review', color: 'bg-purple-500', icon: Shield },
  approved: { label: 'Approved', color: 'bg-success', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'bg-muted-foreground', icon: AlertTriangle },
};

export const InsuranceSupportDashboard = () => {
  const [tasks, setTasks] = useState<InsuranceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tasks')
        .select('*')
        .eq('task_type', 'insurance')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching insurance tasks:', error);
      toast.error('Failed to load insurance tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (task: InsuranceTask) => {
    // Derive status from resolution state
    const status = task.resolved_at ? 'approved' : 'pending_verification';
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_verification;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-destructive text-destructive-foreground',
      medium: 'bg-warning text-warning-foreground',
      low: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[priority] || colors.medium}>{priority}</Badge>;
  };

  const filteredTasks = tasks.filter(task => {
    if (filterRegion !== 'all' && task.region.toLowerCase() !== filterRegion) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => !t.resolved_at).length,
    approved: tasks.filter(t => t.resolved_at).length,
    highPriority: tasks.filter(t => t.priority === 'high' && !t.resolved_at).length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cases</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-success">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-destructive">{stats.highPriority}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Insurance Support Portal
              </CardTitle>
              <CardDescription>
                Manage vehicle insurance verification, claims, and documentation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="usa">USA</SelectItem>
                  <SelectItem value="nigeria">Nigeria</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchTasks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No insurance cases found</p>
              <p className="text-sm">Insurance verification tasks will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(task)}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{task.city}</p>
                        <p className="text-xs text-muted-foreground">{task.region}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(task.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        <FileCheck className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

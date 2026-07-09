import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Search, Users, Loader2, Mail, UserPlus, Trash2, AlertTriangle, History, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AdminAssistantManagement } from './AdminAssistantManagement';
import { PasswordInput } from '@/components/ui/password-input';

type AppRole = 'admin' | 'admin_assistant' | 'owner' | 'driver' | 'legal_support' | 'iot_support' | 'vehicle_support';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  target_user_id: string;
  action: string;
  old_role: AppRole | null;
  new_role: AppRole | null;
  notes: string | null;
  created_at: string;
  actor_profile?: { full_name: string | null; email: string | null };
  target_profile?: { full_name: string | null; email: string | null };
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrator',
  admin_assistant: 'Admin Assistant',
  owner: 'Vehicle Owner',
  driver: 'Driver',
  legal_support: 'Legal Support',
  iot_support: 'IoT Support',
  vehicle_support: 'Vehicle Support',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  admin_assistant: 'bg-amber-500 text-white',
  owner: 'bg-primary text-primary-foreground',
  driver: 'bg-accent text-accent-foreground',
  legal_support: 'bg-blue-500 text-white',
  iot_support: 'bg-purple-500 text-white',
  vehicle_support: 'bg-orange-500 text-white',
};

const actionLabels: Record<string, string> = {
  created: 'User Created',
  role_assigned: 'Role Assigned',
  role_changed: 'Role Changed',
  role_removed: 'Role Removed',
};

export function RoleManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('driver');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('driver');
  
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchUsersWithRoles();
    fetchAuditLogs();
  }, []);

  const fetchUsersWithRoles = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || [])
        .map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.user_id);
          if (!userRole) return null;
          return {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            role: userRole.role as AppRole,
            created_at: profile.created_at || '',
          };
        })
        .filter((u): u is UserWithRole => u !== null);

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users with roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLogsLoading(true);
      
      const { data: logs, error: logsError } = await supabase
        .from('role_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Fetch profiles for actors and targets
      const userIds = new Set<string>();
      logs?.forEach(log => {
        if (log.actor_id) userIds.add(log.actor_id);
        if (log.target_user_id) userIds.add(log.target_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(userIds));

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enrichedLogs: AuditLogEntry[] = (logs || []).map(log => ({
        ...log,
        actor_profile: log.actor_id ? profilesMap.get(log.actor_id) : undefined,
        target_profile: profilesMap.get(log.target_user_id),
      }));

      setAuditLogs(enrichedLogs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const logAuditEntry = async (
    targetUserId: string,
    action: string,
    oldRole?: AppRole | null,
    newRole?: AppRole | null,
    notes?: string
  ) => {
    try {
      await supabase.from('role_audit_log').insert({
        actor_id: user?.id,
        target_user_id: targetUserId,
        action,
        old_role: oldRole || null,
        new_role: newRole || null,
        notes: notes || null,
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsUpdating(true);
    try {
      // Sign up the new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserFullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Assign the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: newUserRole,
        });

      if (roleError) throw roleError;

      // Ensure the user is enabled platform-wide on creation by an administrator
      const { error: activeError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('user_id', authData.user.id);

      if (activeError) {
        console.error('Failed to set is_active on new user:', activeError);
      }

      // Log the audit entry
      await logAuditEntry(
        authData.user.id,
        'created',
        null,
        newUserRole,
        `User created with email: ${newUserEmail} (enabled platform-wide)`
      );

      toast.success('User created successfully', {
        description: `${newUserFullName} has been created with ${roleLabels[newUserRole]} role.`,
      });

      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRole('driver');
      setCreateUserDialogOpen(false);
      
      fetchUsersWithRoles();
      fetchAuditLogs();
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user', {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;

    setIsUpdating(true);
    try {
      const oldRole = selectedUser.role;
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      // Log the audit entry
      await logAuditEntry(
        selectedUser.user_id,
        'role_changed',
        oldRole,
        newRole,
        `Role changed from ${roleLabels[oldRole]} to ${roleLabels[newRole]}`
      );

      toast.success(`Role updated to ${roleLabels[newRole]}`, {
        description: `${selectedUser.full_name || selectedUser.email}'s role has been changed.`,
      });

      setChangeRoleDialogOpen(false);
      fetchUsersWithRoles();
      fetchAuditLogs();
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role', {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const oldRole = selectedUser.role;
      
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      // Log the audit entry
      await logAuditEntry(
        selectedUser.user_id,
        'role_removed',
        oldRole,
        null,
        `Role ${roleLabels[oldRole]} was removed`
      );

      toast.success('Role removed', {
        description: `${selectedUser.full_name || selectedUser.email}'s role has been removed.`,
      });

      setDeleteRoleDialogOpen(false);
      fetchUsersWithRoles();
      fetchAuditLogs();
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error('Failed to remove role', {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openChangeRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setChangeRoleDialogOpen(true);
  };

  const openDeleteRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setDeleteRoleDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading role assignments...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Assign and manage user roles across the platform
              </CardDescription>
            </div>
            <Button onClick={() => setCreateUserDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users ({users.length})
              </TabsTrigger>
              <TabsTrigger value="assistants" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Admin Assistants
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="h-4 w-4" />
                Audit Log ({auditLogs.length})
              </TabsTrigger>
            </TabsList>


            <TabsContent value="users">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles ({users.length})</SelectItem>
                    <SelectItem value="admin">Admin ({roleCounts.admin || 0})</SelectItem>
                    <SelectItem value="admin_assistant">Admin Assistant ({roleCounts.admin_assistant || 0})</SelectItem>
                    <SelectItem value="owner">Owner ({roleCounts.owner || 0})</SelectItem>
                    <SelectItem value="driver">Driver ({roleCounts.driver || 0})</SelectItem>
                    <SelectItem value="legal_support">Legal Support ({roleCounts.legal_support || 0})</SelectItem>
                    <SelectItem value="iot_support">IoT Support ({roleCounts.iot_support || 0})</SelectItem>
                    <SelectItem value="vehicle_support">Vehicle Support ({roleCounts.vehicle_support || 0})</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                  <Card 
                    key={role} 
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${roleFilter === role ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
                  >
                    <div className="text-center">
                      <Badge className={roleColors[role]}>{roleLabels[role]}</Badge>
                      <p className="text-2xl font-bold mt-2">{roleCounts[role] || 0}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* User List */}
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No users found with the selected criteria</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {filteredUsers.map(user => (
                      <Card key={user.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Shield className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{user.full_name || 'No name'}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {user.email || 'No email'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={roleColors[user.role]}>
                                {roleLabels[user.role]}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openChangeRoleDialog(user)}
                                className="gap-1"
                              >
                                <UserPlus className="h-4 w-4" />
                                Change Role
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteRoleDialog(user)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="assistants">
              <AdminAssistantManagement />
            </TabsContent>

            <TabsContent value="audit">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading audit logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-4">
                    {auditLogs.map(log => (
                      <Card key={log.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <History className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{actionLabels[log.action] || log.action}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(log.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm">
                                  <span className="font-medium">
                                    {log.target_profile?.full_name || log.target_profile?.email || 'Unknown User'}
                                  </span>
                                </p>
                                {log.old_role && log.new_role && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge className={roleColors[log.old_role]}>{roleLabels[log.old_role]}</Badge>
                                    <span className="text-muted-foreground">→</span>
                                    <Badge className={roleColors[log.new_role]}>{roleLabels[log.new_role]}</Badge>
                                  </div>
                                )}
                                {log.new_role && !log.old_role && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Assigned:</span>
                                    <Badge className={roleColors[log.new_role]}>{roleLabels[log.new_role]}</Badge>
                                  </div>
                                )}
                                {log.old_role && !log.new_role && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Removed:</span>
                                    <Badge className={roleColors[log.old_role]}>{roleLabels[log.old_role]}</Badge>
                                  </div>
                                )}
                                {log.notes && (
                                  <p className="text-sm text-muted-foreground italic">{log.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>By: {log.actor_profile?.full_name || log.actor_profile?.email || 'System'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account with a specific role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="Enter full name"
                value={newUserFullName}
                onChange={(e) => setNewUserFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter password"
                autoComplete="new-password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {(['admin', 'admin_assistant', 'owner', 'driver', 'legal_support', 'iot_support', 'vehicle_support'] as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUserRole === 'admin' && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Warning: Admin role grants full platform access</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <Badge className={selectedUser ? roleColors[selectedUser.role] : ''}>
                {selectedUser ? roleLabels[selectedUser.role] : ''}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newRole === 'admin' && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Warning: Admin role grants full platform access</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isUpdating || newRole === selectedUser?.role}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove User Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the role for {selectedUser?.full_name || selectedUser?.email}? 
              This will revoke all their access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                'Remove Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

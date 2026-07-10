import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserCog, UserPlus, X, Search, Save } from 'lucide-react';

type Profile = { user_id: string; full_name: string | null; email: string | null };
type Assignment = {
  id: string;
  assistant_id: string;
  target_user_id: string;
  notes: string | null;
  created_at: string;
};

/**
 * Admin-only portal section: assign which end-users each Admin Assistant may access.
 * Add / remove is explicit, dirty state is shown before Save.
 */
export function AdminAssistantUserAssignments() {
  const [assistants, setAssistants] = useState<Profile[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Local editable set (dirty) for the current assistant
  const [draft, setDraft] = useState<{ ids: Set<string>; notes: Record<string, string> }>({
    ids: new Set(),
    notes: {},
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: roleRows, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin_assistant' as any);
      if (rErr) throw rErr;

      const assistantIds = (roleRows || []).map(r => r.user_id);
      const { data: assistantProfiles } = assistantIds.length
        ? await supabase.from('profiles').select('user_id, full_name, email').in('user_id', assistantIds)
        : { data: [] as Profile[] };
      setAssistants(assistantProfiles || []);

      const { data: userProfiles } = await supabase
        .from('profiles').select('user_id, full_name, email').order('full_name');
      setUsers(userProfiles || []);

      const { data: assignRows, error: aErr } = await supabase
        .from('admin_assistant_user_assignments' as any)
        .select('id, assistant_id, target_user_id, notes, created_at');
      if (aErr) throw aErr;

      const grouped: Record<string, Assignment[]> = {};
      ((assignRows as unknown as Assignment[]) || []).forEach(a => {
        (grouped[a.assistant_id] ||= []).push(a);
      });
      setAssignments(grouped);
    } catch (e: any) {
      toast.error('Failed to load assignments', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const userMap = useMemo(() => new Map(users.map(u => [u.user_id, u])), [users]);

  const openEditor = (assistantId: string) => {
    setSelectedAssistant(assistantId);
    const current = assignments[assistantId] || [];
    setDraft({
      ids: new Set(current.map(a => a.target_user_id)),
      notes: Object.fromEntries(current.map(a => [a.target_user_id, a.notes || ''])),
    });
    setSearch('');
    setDialogOpen(true);
  };

  const toggle = (userId: string) => {
    setDraft(d => {
      const ids = new Set(d.ids);
      if (ids.has(userId)) ids.delete(userId); else ids.add(userId);
      return { ...d, ids };
    });
  };

  const currentAssignments = assignments[selectedAssistant] || [];
  const originalIds = new Set(currentAssignments.map(a => a.target_user_id));
  const added = [...draft.ids].filter(id => !originalIds.has(id));
  const removed = [...originalIds].filter(id => !draft.ids.has(id));
  const dirty = added.length > 0 || removed.length > 0;

  const save = async () => {
    if (!selectedAssistant) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (added.length) {
        const rows = added.map(target_user_id => ({
          assistant_id: selectedAssistant,
          target_user_id,
          assigned_by: user?.id,
          notes: draft.notes[target_user_id] || null,
        }));
        const { error } = await supabase.from('admin_assistant_user_assignments' as any).insert(rows);
        if (error) throw error;
      }

      if (removed.length) {
        const { error } = await supabase
          .from('admin_assistant_user_assignments' as any)
          .delete()
          .eq('assistant_id', selectedAssistant)
          .in('target_user_id', removed);
        if (error) throw error;
      }

      toast.success('Assignments saved', {
        description: `${added.length} added, ${removed.length} removed`,
      });
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error('Save failed', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          Assistant → User Assignments
        </h3>
        <p className="text-sm text-muted-foreground">
          Scope each Admin Assistant to the specific users they can access. Enables division of labor across regions or workloads.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : assistants.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No Admin Assistants yet. Grant the role in User Accounts first.
        </Card>
      ) : (
        <div className="grid gap-3">
          {assistants.map(a => {
            const list = assignments[a.user_id] || [];
            return (
              <Card key={a.user_id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{a.full_name || 'Unnamed'}</div>
                    <div className="text-sm text-muted-foreground">{a.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{list.length} assigned users</Badge>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditor(a.user_id)}>
                      <UserPlus className="h-3.5 w-3.5" /> Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage assigned users</DialogTitle>
            <DialogDescription>
              Add or remove users this assistant can access. Changes are saved together.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {dirty && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                <strong>Unsaved changes:</strong>{' '}
                {added.length > 0 && <span className="text-emerald-600">+{added.length} added</span>}
                {added.length > 0 && removed.length > 0 && ' · '}
                {removed.length > 0 && <span className="text-red-600">-{removed.length} removed</span>}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search users by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Assigned chips (draft) */}
            {draft.ids.size > 0 && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assigned ({draft.ids.size})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[...draft.ids].map(id => {
                    const u = userMap.get(id);
                    return (
                      <Badge
                        key={id}
                        variant={originalIds.has(id) ? 'secondary' : 'default'}
                        className="gap-1 pr-1"
                      >
                        {u?.full_name || u?.email || id.slice(0, 8)}
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          className="ml-1 rounded hover:bg-black/10 p-0.5"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <ScrollArea className="h-72 border rounded-md">
              <div className="divide-y">
                {filteredUsers.map(u => {
                  const checked = draft.ids.has(u.user_id);
                  return (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => toggle(u.user_id)}
                      className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-accent ${checked ? 'bg-accent/50' : ''}`}
                    >
                      <div>
                        <div className="text-sm font-medium">{u.full_name || 'Unnamed'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <Badge variant={checked ? 'default' : 'outline'}>
                        {checked ? 'Assigned' : 'Add'}
                      </Badge>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No matching users.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !dirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminAssistantUserAssignments;

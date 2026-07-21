import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRegion } from '@/contexts/RegionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

type AgreementRegion = 'USA' | 'Nigeria';

interface LegalAgreementTemplate {
  id: string;
  template_key: string;
  agreement_type: string;
  region: AgreementRegion;
  title: string;
  version: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONTENT = `VEHICLE RENTAL AGREEMENT

Agreement Date: {{agreement_date}}

PARTIES:
Owner: {{owner_name}} ({{owner_email}})
Driver: {{driver_name}} ({{driver_email}})

VEHICLE:
{{vehicle_year}} {{vehicle_make}} {{vehicle_model}}
License Plate: {{license_plate}}
{{vin_line}}

NEGOTIATION REFERENCE: {{negotiation_id}}
Agreed Daily Rate: {{currency}} {{daily_rate}}/day

This agreement is governed by the RentMaiKar Terms of Use and Privacy Policy. All pricing and payment terms are as displayed on the RentMaiKar platform.`;

const emptyForm = (region: AgreementRegion) => ({
  template_key: 'vehicle_rental_standard',
  agreement_type: 'vehicle_rental',
  region,
  title: `Vehicle Rental Agreement - ${region}`,
  version: '1.0',
  content: DEFAULT_CONTENT,
  is_active: false,
});

export function LegalAgreementTemplateManagement() {
  const { country } = useRegion();
  const defaultRegion: AgreementRegion = country === 'Nigeria' ? 'Nigeria' : 'USA';
  const [templates, setTemplates] = useState<LegalAgreementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regionFilter, setRegionFilter] = useState<'all' | AgreementRegion>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegalAgreementTemplate | null>(null);
  const [form, setForm] = useState(emptyForm(defaultRegion));

  const visibleTemplates = useMemo(
    () => templates.filter((template) => regionFilter === 'all' || template.region === regionFilter),
    [templates, regionFilter],
  );

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('legal_agreement_templates')
      .select('*')
      .order('updated_at', { ascending: false });

    setLoading(false);
    if (error) {
      toast.error(`Failed to load agreement templates: ${error.message}`);
      return;
    }
    setTemplates((data ?? []) as LegalAgreementTemplate[]);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(defaultRegion));
    setDialogOpen(true);
  };

  const openEdit = (template: LegalAgreementTemplate) => {
    setEditing(template);
    setForm({
      template_key: template.template_key,
      agreement_type: template.agreement_type,
      region: template.region,
      title: template.title,
      version: template.version,
      content: template.content,
      is_active: template.is_active,
    });
    setDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!form.template_key.trim() || !form.agreement_type.trim() || !form.title.trim() || !form.version.trim() || !form.content.trim()) {
      toast.error('Template key, type, title, version, and content are required');
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      ...form,
      updated_by: userData.user?.id ?? null,
      ...(editing ? {} : { created_by: userData.user?.id ?? null }),
    };

    const { error } = editing
      ? await (supabase as any).from('legal_agreement_templates').update(payload).eq('id', editing.id)
      : await (supabase as any).from('legal_agreement_templates').insert(payload);

    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }

    toast.success('Legal agreement template saved');
    setDialogOpen(false);
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Legal Agreement Templates</h2>
          <p className="text-muted-foreground">Manage reusable legal agreement content by country and version.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Template Library
              </CardTitle>
              <CardDescription>Use placeholders like {'{{driver_name}}'}, {'{{owner_name}}'}, and {'{{daily_rate}}'} in the body.</CardDescription>
            </div>
            <Select value={regionFilter} onValueChange={(value) => setRegionFilter(value as 'all' | AgreementRegion)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : visibleTemplates.length === 0 ? (
            <Alert>
              <AlertDescription>No agreement templates match the selected region.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="font-medium">{template.title}</div>
                      <div className="text-xs text-muted-foreground">{template.template_key}</div>
                    </TableCell>
                    <TableCell>{template.agreement_type}</TableCell>
                    <TableCell>{template.region}</TableCell>
                    <TableCell>{template.version}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>{template.is_active ? 'Active' : 'Draft'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(template)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Legal Agreement Template' : 'Create Legal Agreement Template'}</DialogTitle>
            <DialogDescription>Template changes are versioned by key, country, and version.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Template key</Label>
              <Input value={form.template_key} onChange={(event) => setForm((current) => ({ ...current, template_key: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Agreement type</Label>
              <Input value={form.agreement_type} onChange={(event) => setForm((current) => ({ ...current, agreement_type: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(value) => setForm((current) => ({ ...current, region: value as AgreementRegion }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Nigeria">Nigeria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Template content</Label>
              <Textarea rows={16} value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
              <Label>Active template</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
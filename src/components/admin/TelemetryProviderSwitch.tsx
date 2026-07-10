import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Provider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  priority: number;
}

export function TelemetryProviderSwitch() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("telemetry_providers")
      .select("id, name, display_name, is_active, priority")
      .order("priority", { ascending: true });
    if (error) {
      toast.error("Failed to load telemetry providers");
    } else {
      setProviders(data || []);
      const act = (data || []).find((p) => p.is_active);
      setActive(act?.name || "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flip = async (name: string) => {
    if (name === active) return;
    setSaving(true);
    const target = providers.find((p) => p.name === name);
    if (!target) { setSaving(false); return; }

    // Deactivate all, activate target, then bump its priority to 1.
    const { error: off } = await supabase
      .from("telemetry_providers")
      .update({ is_active: false })
      .neq("id", target.id);
    if (off) { toast.error("Failed to deactivate other providers"); setSaving(false); return; }

    const { error: on } = await supabase
      .from("telemetry_providers")
      .update({ is_active: true, priority: 1 })
      .eq("id", target.id);
    if (on) { toast.error("Failed to activate provider"); setSaving(false); return; }

    toast.success(`Active telemetry provider: ${target.display_name}`);
    setActive(name);
    await load();
    setSaving(false);
  };

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading providers…
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Telemetry Provider
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Flip the active IoT tracking backend. Both adapters stay registered so vehicles keep
          reporting; only the active one drives commands and health checks.
        </p>
      </CardHeader>
      <CardContent>
        <RadioGroup value={active} onValueChange={flip} className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem value={p.name} id={`prov-${p.id}`} disabled={saving} />
                <Label htmlFor={`prov-${p.id}`} className="cursor-pointer">
                  <div className="font-medium">{p.display_name || p.name}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{p.name}</div>
                </Label>
              </div>
              {p.is_active && <Badge variant="default">Active</Badge>}
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Search, PowerOff, Power, Download, Shield } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  performed_by: string | null;
  action: string;
  device_id: string | null;
  vehicle_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

interface EnrichedRow extends AuditRow {
  actor_email: string | null;
  vehicle_label: string | null;
  device_serial: string | null;
  traccar_device_id: number | null;
  command: string;
  response_ok: boolean | null;
  response_status: number | null;
  response_body: unknown;
}

const COMMAND_LABEL: Record<string, { label: string; icon: JSX.Element; variant: "destructive" | "default" }> = {
  engineStop: { label: "Immobilize", icon: <PowerOff className="h-3 w-3" />, variant: "destructive" },
  engineResume: { label: "Mobilize", icon: <Power className="h-3 w-3" />, variant: "default" },
};

export default function TraccarCommandAuditPage() {
  const [rows, setRows] = useState<EnrichedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "engineStop" | "engineResume" | "success" | "failure">(
    "all",
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("iot_audit_log")
      .select("*")
      .like("action", "traccar_command_%")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const base = (data ?? []) as AuditRow[];

    const actorIds = Array.from(new Set(base.map((r) => r.performed_by).filter(Boolean))) as string[];
    const vehicleIds = Array.from(new Set(base.map((r) => r.vehicle_id).filter(Boolean))) as string[];
    const deviceIds = Array.from(new Set(base.map((r) => r.device_id).filter(Boolean))) as string[];

    const [profilesRes, vehiclesRes, devicesRes] = await Promise.all([
      actorIds.length
        ? supabase.from("profiles").select("id, email, full_name").in("id", actorIds)
        : Promise.resolve({ data: [] as any[] }),
      vehicleIds.length
        ? supabase.from("vehicles").select("id, make, model, license_plate").in("id", vehicleIds)
        : Promise.resolve({ data: [] as any[] }),
      deviceIds.length
        ? supabase.from("iot_devices").select("id, serial_number").in("id", deviceIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const vehicleMap = new Map((vehiclesRes.data ?? []).map((v: any) => [v.id, v]));
    const deviceMap = new Map((devicesRes.data ?? []).map((d: any) => [d.id, d]));

    const enriched: EnrichedRow[] = base.map((r) => {
      const command = r.action.replace(/^traccar_command_/, "");
      const details = r.details ?? {};
      const response = (details.response ?? {}) as any;
      const p = r.performed_by ? profileMap.get(r.performed_by) : null;
      const v = r.vehicle_id ? vehicleMap.get(r.vehicle_id) : null;
      const d = r.device_id ? deviceMap.get(r.device_id) : null;
      return {
        ...r,
        command,
        response_ok: typeof response.ok === "boolean" ? response.ok : (details.ok ?? null),
        response_status: response.status ?? null,
        response_body: response.body ?? null,
        actor_email: p ? p.email ?? p.full_name ?? null : null,
        vehicle_label: v
          ? `${v.make ?? ""} ${v.model ?? ""} · ${v.license_plate ?? ""}`.trim()
          : null,
        device_serial: d?.serial_number ?? details.serial_number ?? null,
        traccar_device_id: details.traccar_device_id ?? null,
      };
    });
    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "engineStop" && r.command !== "engineStop") return false;
      if (filter === "engineResume" && r.command !== "engineResume") return false;
      if (filter === "success" && r.response_ok !== true) return false;
      if (filter === "failure" && r.response_ok === true) return false;
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return [
        r.actor_email,
        r.vehicle_label,
        r.device_serial,
        String(r.traccar_device_id ?? ""),
        r.command,
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle));
    });
  }, [rows, q, filter]);

  const exportCsv = () => {
    const header = [
      "timestamp",
      "actor",
      "command",
      "vehicle",
      "device_serial",
      "traccar_device_id",
      "ok",
      "status",
      "response",
    ];
    const lines = [header.join(",")].concat(
      filtered.map((r) =>
        [
          r.created_at,
          r.actor_email ?? r.performed_by ?? "",
          r.command,
          r.vehicle_label ?? r.vehicle_id ?? "",
          r.device_serial ?? "",
          r.traccar_device_id ?? "",
          r.response_ok ?? "",
          r.response_status ?? "",
          JSON.stringify(r.response_body ?? {}),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traccar-commands-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Traccar Command Audit
            </CardTitle>
            <CardDescription>
              Every Immobilize / Mobilize command sent from the Live Map, with actor, timestamp,
              device id and Traccar server response.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search actor, vehicle, serial or device id…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All commands</SelectItem>
                <SelectItem value="engineStop">Immobilize only</SelectItem>
                <SelectItem value="engineResume">Mobilize only</SelectItem>
                <SelectItem value="success">Success only</SelectItem>
                <SelectItem value="failure">Failures only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No commands recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((r) => {
                    const meta = COMMAND_LABEL[r.command] ?? {
                      label: r.command,
                      icon: <Shield className="h-3 w-3" />,
                      variant: "default" as const,
                    };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.actor_email ?? (
                            <span className="text-muted-foreground">{r.performed_by ?? "system"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.variant} className="gap-1">
                            {meta.icon}
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.vehicle_label ?? (
                            <span className="text-muted-foreground">
                              {r.vehicle_id ?? "unlinked"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono">{r.device_serial ?? "—"}</div>
                          {r.traccar_device_id != null && (
                            <div className="text-muted-foreground">
                              Traccar ID: {r.traccar_device_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.response_ok === true ? (
                            <Badge>OK{r.response_status ? ` · ${r.response_status}` : ""}</Badge>
                          ) : r.response_ok === false ? (
                            <Badge variant="destructive">
                              FAIL{r.response_status ? ` · ${r.response_status}` : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">unknown</Badge>
                          )}
                          {r.response_body != null && (
                            <div className="mt-1 max-w-[280px] truncate text-muted-foreground font-mono">
                              {typeof r.response_body === "string"
                                ? r.response_body
                                : JSON.stringify(r.response_body)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, RefreshCw, Radio, ShieldCheck, ShieldAlert, Download, Play, Pause,
  Signal, Search, Database, KeyRound,
} from "lucide-react";
import { toast } from "sonner";

interface SimCard {
  id: string;
  iccid: string;
  msisdn: string | null;
  imsi: string | null;
  provider: string;
  provider_sim_id: string | null;
  status: string;
  plan_name: string | null;
  data_usage_mb: number | null;
  data_limit_mb: number | null;
  last_session_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  vehicle_id: string | null;
}

type StatusResp = {
  ok?: boolean;
  configured?: boolean;
  message?: string;
  probe?: { ok?: boolean; status?: number };
};

const StatusPill = ({ status }: { status: string }) => {
  const s = (status || "unknown").toLowerCase();
  const variant =
    s === "live" || s === "active" ? "default"
      : s === "paused" || s === "suspended" ? "secondary"
        : s === "deactivated" ? "destructive" : "outline";
  return <Badge variant={variant as never}>{s}</Badge>;
};

export function HologramDashboard() {
  const [sims, setSims] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [planId, setPlanId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("iot_sim_cards")
      .select("*")
      .eq("provider", "hologram")
      .order("created_at", { ascending: false })
      .limit(500);
    setSims((data as SimCard[]) || []);
    setLoading(false);
  };

  const refreshStatus = async () => {
    const { data, error } = await supabase.functions.invoke("hologram-admin", {
      body: { action: "status" },
    });
    if (error) return setStatus({ ok: false, configured: false, message: error.message });
    setStatus(data as StatusResp);
  };

  useEffect(() => { load(); refreshStatus(); }, []);

  const run = async (action: string, body: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("hologram-admin", {
        body: { action, ...body },
      });
      if (error) throw new Error(error.message);
      const res = data as { ok?: boolean; imported?: number; updated?: number };
      if (res?.ok === false) throw new Error(JSON.stringify(res));
      if (action === "import_sims") toast.success(`Imported ${res?.imported ?? 0} SIMs`);
      else if (action === "sync_usage") toast.success(`Synced usage for ${res?.updated ?? 0} SIMs`);
      else toast.success("Action complete");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    const total = sims.length;
    const live = sims.filter(s => ["live", "active"].includes((s.status || "").toLowerCase())).length;
    const paused = sims.filter(s => ["paused", "suspended"].includes((s.status || "").toLowerCase())).length;
    const usageMb = sims.reduce((a, s) => a + (s.data_usage_mb || 0), 0);
    const linked = sims.filter(s => s.vehicle_id).length;
    return { total, live, paused, linked, usageMb };
  }, [sims]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sims;
    return sims.filter(s =>
      [s.iccid, s.msisdn, s.imsi, s.provider_sim_id, s.plan_name, s.status]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q)));
  }, [sims, query]);

  const configured = status?.configured === true;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            Hologram eUICC IoT SIM Cards
          </h2>
          <p className="text-muted-foreground">
            Manage Hyper eUICC connectivity. Import, activate, suspend and monitor
            data usage across the Rentmaikar fleet.
          </p>
        </div>
        <Button variant="outline" onClick={() => { load(); refreshStatus(); }} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Alert variant={configured ? "default" : "destructive"}>
        {configured ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        <AlertTitle>{configured ? "Hologram API connected" : "Hologram API not configured"}</AlertTitle>
        <AlertDescription className="text-sm">
          {status?.message ||
            (configured
              ? "Secrets are present. Live provisioning, usage sync and lifecycle actions are enabled."
              : "Add HOLOGRAM_API_KEY and HOLOGRAM_ORG_ID as backend secrets, then click Refresh.")}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total SIMs</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Live</p>
          <p className="text-2xl font-bold text-green-600">{stats.live}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Paused</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Linked to Vehicles</p>
          <p className="text-2xl font-bold">{stats.linked}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Usage (MB)</p>
          <p className="text-2xl font-bold">{stats.usageMb.toFixed(1)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="sims" className="w-full">
        <TabsList>
          <TabsTrigger value="sims">SIM Inventory</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
          <TabsTrigger value="setup">API Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="sims" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ICCID, MSISDN, plan…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm" variant="outline"
              disabled={!configured || busy === "sync_usage"}
              onClick={() => run("sync_usage")}
              className="gap-2"
            >
              {busy === "sync_usage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Signal className="h-4 w-4" />}
              Sync usage
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No Hologram SIMs recorded. Use <strong>Import from Hologram</strong> in Operations to pull your inventory.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ICCID</TableHead>
                      <TableHead>MSISDN</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage (MB)</TableHead>
                      <TableHead>Last Session</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.iccid}</TableCell>
                        <TableCell>{s.msisdn || "—"}</TableCell>
                        <TableCell>{s.plan_name || "—"}</TableCell>
                        <TableCell><StatusPill status={s.status} /></TableCell>
                        <TableCell>
                          {(s.data_usage_mb ?? 0).toFixed(1)}
                          {s.data_limit_mb ? ` / ${s.data_limit_mb}` : ""}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.last_session_at ? new Date(s.last_session_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm" variant="ghost"
                            disabled={!configured || !s.provider_sim_id || !planId || busy === "activate"}
                            onClick={() => run("activate_sim", { sim_id: s.provider_sim_id, plan_id: Number(planId) })}
                            title={planId ? "Activate SIM" : "Enter a plan ID in Operations first"}
                          ><Play className="h-3.5 w-3.5" /></Button>
                          <Button
                            size="sm" variant="ghost"
                            disabled={!configured || !s.provider_sim_id || busy === "suspend"}
                            onClick={() => run("suspend_sim", { sim_id: s.provider_sim_id })}
                            title="Suspend SIM"
                          ><Pause className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk operations</CardTitle>
              <CardDescription>Pull the Hologram inventory and refresh usage counters.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button disabled={!configured || busy === "import_sims"} onClick={() => run("import_sims")} className="gap-2">
                {busy === "import_sims" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Import from Hologram
              </Button>
              <Button variant="outline" disabled={!configured || busy === "sync_usage"} onClick={() => run("sync_usage")} className="gap-2">
                {busy === "sync_usage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Signal className="h-4 w-4" />}
                Sync usage now
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activation plan</CardTitle>
              <CardDescription>Hologram data plan ID applied when you activate an individual SIM.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number" inputMode="numeric" placeholder="Plan ID (e.g. 73)"
                value={planId} onChange={(e) => setPlanId(e.target.value)}
                className="max-w-xs"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Required secrets</CardTitle>
              <CardDescription>Add these in backend secrets to enable the Hologram integration.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><code>HOLOGRAM_API_KEY</code> — API key from Hologram dashboard → Account → API</div>
              <div><code>HOLOGRAM_ORG_ID</code> — Numeric organization ID from your Hologram URL</div>
              <div className="text-muted-foreground text-xs pt-2">
                Base URL: <code>https://dashboard.hologram.io/api/1</code>. Auth: Basic (<code>apikey:$KEY</code>).
                Endpoints used: <code>/links/cellular</code>, <code>/links/cellular/{"{id}"}/state</code>,
                <code> /links/cellular/{"{id}"}/usage</code>.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Data flow</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Imports write to <code>iot_sim_cards</code> (provider = hologram, unique on ICCID).
              The <code>hologram-sync</code> cron refreshes usage every schedule tick; on-demand actions
              here use the <code>hologram-admin</code> edge function.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

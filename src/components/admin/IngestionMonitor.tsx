import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, Activity, AlertTriangle, CheckCircle2, PlayCircle, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface VehicleOpt { id: string; label: string; }

interface SyncState {
  provider: string;
  state: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  devices_synced: number | null;
  positions_imported: number | null;
  updated_at: string | null;
}

interface Props {
  provider: "traccar" | "hologram";
  functionName: string;
  syncAction?: string;
  disabled?: boolean;
  onSynced?: () => void;
}

export function IngestionMonitor({
  provider,
  functionName,
  syncAction = "sync",
  disabled,
  onSynced,
}: Props) {
  const [state, setState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("iot_sync_state").select("*").eq("provider", provider).maybeSingle();
    setState((data as SyncState) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [provider]);

  const retry = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: syncAction },
      });
      if (error) throw new Error(error.message);
      const res = data as { ok?: boolean; devices_synced?: number; positions_imported?: number };
      if (res?.ok === false) throw new Error(JSON.stringify(res));
      toast.success(
        `Sync complete — ${res?.devices_synced ?? 0} devices, ${res?.positions_imported ?? 0} positions`,
      );
      await load();
      onSynced?.();
    } catch (e) {
      toast.error(`Sync failed: ${(e as Error).message}`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const currentState = (state?.state || "idle").toLowerCase();
  const isError = currentState === "error";
  const isRunning = currentState === "running";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Ingestion monitor
          </CardTitle>
          <CardDescription>
            Live status of the {provider} pull job — last run, records imported, and errors.
          </CardDescription>
        </div>
        <Button size="sm" onClick={retry} disabled={disabled || busy} className="gap-2">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
          {isError ? "Retry sync" : "Run sync now"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">State</p>
                <Badge variant={isError ? "destructive" : isRunning ? "secondary" : "default"}>
                  {currentState}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last sync</p>
                <p className="text-sm">
                  {state?.last_sync_at ? new Date(state.last_sync_at).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Devices synced</p>
                <p className="text-sm font-semibold">{state?.devices_synced ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Positions imported</p>
                <p className="text-sm font-semibold">{state?.positions_imported ?? 0}</p>
              </div>
            </div>

            {isError && state?.last_error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Last sync failed</AlertTitle>
                <AlertDescription className="text-xs break-all">
                  {state.last_error}
                  {state.last_error_at && (
                    <div className="mt-1 opacity-70">
                      at {new Date(state.last_error_at).toLocaleString()}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {!isError && state?.last_success_at && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Last successful sync</AlertTitle>
                <AlertDescription className="text-xs">
                  {new Date(state.last_success_at).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
            {!state && (
              <p className="text-sm text-muted-foreground">
                No sync has run yet. Click <strong>Run sync now</strong> to pull the first batch.
              </p>
            )}
            <Button size="sm" variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh state
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

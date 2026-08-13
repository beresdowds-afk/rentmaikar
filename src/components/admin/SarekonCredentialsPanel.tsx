import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

/**
 * Sarekon credentials screen. The user ID / password are written through
 * `provider_write_credentials`, which stores them encrypted in the vault —
 * only masked previews are ever readable back. Saving immediately runs a live
 * session test so the admin sees the real connection status.
 */

interface Version {
  id: string;
  masked: Record<string, string>;
  status: string;
  created_at: string;
}

interface Diagnosis {
  title?: string;
  detail?: string;
  hints?: string[];
}

interface ConnStatus {
  configured: boolean;
  authenticated?: boolean;
  base_url?: string;
  latency_ms?: number;
  diagnosis?: Diagnosis;
}

export default function SarekonCredentialsPanel({ onStatusChange }: { onStatusChange?: () => void }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<ConnStatus | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  const loadVersions = useCallback(async () => {
    const { data } = await supabase
      .from("provider_credential_versions" as never)
      .select("id, masked, status, created_at")
      .eq("provider", "sarekon")
      .order("created_at", { ascending: false })
      .limit(10);
    setVersions((data ?? []) as unknown as Version[]);
  }, []);

  const runTest = useCallback(async (refreshCredentials = false) => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sarekon-admin", {
        body: { action: "test_connection", refresh_credentials: refreshCredentials },
      });
      if (error) throw new Error(error.message);
      const d = data as Record<string, unknown>;
      const next: ConnStatus = {
        configured: d.configured !== false,
        authenticated: Boolean(d.authenticated),
        base_url: d.base_url as string,
        latency_ms: d.latency_ms as number,
        diagnosis: d.diagnosis as Diagnosis,
      };
      setStatus(next);
      onStatusChange?.();
      return next;
    } catch (e) {
      const next: ConnStatus = { configured: false, diagnosis: { title: "Test failed", detail: (e as Error).message } };
      setStatus(next);
      return next;
    } finally {
      setTesting(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    loadVersions();
    runTest(false);
  }, [loadVersions, runTest]);

  const save = async () => {
    if (!userId.trim() || !password.trim()) {
      toast.error("Enter both the Sarekon user ID and password");
      return;
    }
    setSaving(true);
    try {
      const values: Record<string, string> = { user_id: userId.trim(), password: password.trim() };
      if (baseUrl.trim()) values.base_url = baseUrl.trim().replace(/\/$/, "");
      const { error } = await supabase.rpc("provider_write_credentials" as never, {
        _provider: "sarekon",
        _values: values,
        _notes: "Sarekon credentials saved from the admin panel",
      } as never);
      if (error) throw error;
      setPassword("");
      toast.success("Credentials stored securely — testing the session…");
      await loadVersions();
      const res = await runTest(true);
      if (res.authenticated) toast.success(`Sarekon session created (${res.latency_ms ?? 0}ms)`);
      else toast.error(res.diagnosis?.title ?? "Sarekon rejected the credentials");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Sarekon credentials
          </CardTitle>
          <CardDescription>
            Stored encrypted in the platform vault and picked up by the sync jobs within a minute. Only a masked
            preview is ever readable back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sarekon-user">User ID</Label>
              <Input
                id="sarekon-user"
                autoComplete="off"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Sarekon account user ID"
              />
            </div>
            <div>
              <Label htmlFor="sarekon-pass">Password</Label>
              <Input
                id="sarekon-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sarekon account password"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="sarekon-base">API base URL (optional)</Label>
              <Input
                id="sarekon-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={status?.base_url ?? "https://api.sarekon.com/v1"}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              <span className="ml-2">Save &amp; test session</span>
            </Button>
            <Button variant="outline" onClick={() => runTest(true)} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span className="ml-2">Test connection</span>
            </Button>
          </div>

          {status && (
            status.configured && status.authenticated ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                <Badge>Connected</Badge>
                <span className="text-muted-foreground">
                  {status.base_url} · session created in {status.latency_ms ?? 0}ms
                </span>
              </div>
            ) : (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>{status.diagnosis?.title ?? "Not connected"}</AlertTitle>
                <AlertDescription>
                  {status.diagnosis?.detail} {status.diagnosis?.hints?.join(" ")}
                </AlertDescription>
              </Alert>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credential history</CardTitle>
          <CardDescription>Masked previews of every stored version.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No admin-managed credentials yet — deployed secrets are in use if present.
            </p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <span className="text-muted-foreground">
                  {Object.entries(v.masked ?? {}).map(([k, m]) => `${k}: ${m}`).join(" · ")}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={v.status === "active" ? "default" : "outline"}>{v.status}</Badge>
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

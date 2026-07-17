import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, Send, CreditCard, Loader2, Info } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";

interface Props { userId?: string }

export function ProxyBillingSettings({ userId }: Props) {
  const { country } = useRegion();
  const [proxy, setProxy] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    proxy_full_name: "", proxy_email: "", proxy_phone: "", proxy_relationship: "",
    channels: { email: true, sms: false, whatsapp: false },
    use_type: "recurring" as "recurring" | "one_time",
    validity_days: 90,
    max_uses: 12,
  });

  const load = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("driver_proxy_billing_accounts" as any)
      .select("*")
      .eq("driver_id", userId)
      .in("status", ["pending", "awaiting_consent", "awaiting_card", "active"])
      .order("created_at", { ascending: false })
      .maybeSingle();
    setProxy(data);
  };
  useEffect(() => { load(); }, [userId]);

  const create = async () => {
    const channels = Object.entries(form.channels).filter(([, v]) => v).map(([k]) => k);
    if (!channels.length) return toast.error("Pick at least one notification channel");
    if (!form.proxy_full_name.trim() || !form.proxy_email.trim()) return toast.error("Name and email are required");
    setLoading(true);
    const now = new Date();
    const expires = new Date(now.getTime() + form.validity_days * 86400 * 1000);
    const idem = crypto.randomUUID();
    const { data, error } = await supabase.functions.invoke("proxy-consent-manager", {
      body: {
        action: "create",
        proxy_full_name: form.proxy_full_name,
        proxy_email: form.proxy_email,
        proxy_phone: form.proxy_phone || undefined,
        proxy_relationship: form.proxy_relationship || undefined,
        channels,
        region: country === "Nigeria" ? "NG" : "US",
        use_type: form.use_type,
        validity_starts_at: now.toISOString(),
        validity_expires_at: expires.toISOString(),
        max_uses: form.use_type === "one_time" ? 1 : form.max_uses,
      },
      headers: { "x-idempotency-key": idem } as any,
    });
    setLoading(false);
    if (error || !data?.ok) return toast.error(data?.error?.message ?? "Could not create proxy request");
    toast.success("Consent request sent to your proxy");
    load();
  };


  const resend = async () => {
    if (!proxy) return;
    setLoading(true);
    const channels = Object.entries(form.channels).filter(([, v]) => v).map(([k]) => k);
    const { data, error } = await supabase.functions.invoke("proxy-consent-manager", {
      body: { action: "resend", proxy_account_id: proxy.id, channels: channels.length ? channels : ["email"] },
    });
    setLoading(false);
    if (error || !data?.ok) return toast.error("Resend failed");
    toast.success("Consent link resent");
    load();
  };

  const statusColor = (s: string) => ({
    pending: "secondary", awaiting_consent: "secondary", awaiting_card: "secondary",
    active: "default", revoked: "destructive", disabled: "outline",
  } as Record<string, any>)[s] ?? "outline";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Proxy Billing Account</CardTitle>
        <CardDescription>
          Use another person's card for your rental payments. They must verify their identity and sign a consent form
          before their card can be charged. Only one active proxy is allowed at a time — revoking requires an admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {proxy ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">{proxy.proxy_full_name}</p>
                <p className="text-sm text-muted-foreground">{proxy.proxy_email}{proxy.proxy_phone ? ` · ${proxy.proxy_phone}` : ""}</p>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Badge variant={statusColor(proxy.status)}>{proxy.status.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />ID: {proxy.identity_status}</Badge>
                  <Badge variant="outline">Consent: {proxy.consent_status}</Badge>
                  {proxy.card_last4 && (
                    <Badge variant="outline" className="gap-1">
                      <CreditCard className="h-3 w-3" />{proxy.card_brand ?? "Card"} •••• {proxy.card_last4}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {proxy.status !== "active" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Waiting on your proxy to complete identity verification, sign the consent form, and add their card.
                  You can resend the invite below.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Checkbox checked={form.channels.email} onCheckedChange={(v) => setForm({ ...form, channels: { ...form.channels, email: !!v } })} /> Email</div>
              <div className="flex items-center gap-2"><Checkbox checked={form.channels.sms} onCheckedChange={(v) => setForm({ ...form, channels: { ...form.channels, sms: !!v } })} /> SMS</div>
              <div className="flex items-center gap-2"><Checkbox checked={form.channels.whatsapp} onCheckedChange={(v) => setForm({ ...form, channels: { ...form.channels, whatsapp: !!v } })} /> WhatsApp</div>
              <Button onClick={resend} disabled={loading || proxy.status === "active"} size="sm" variant="outline" className="ml-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Resend consent link
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              To end this proxy relationship, contact admin support — proxy revocation is admin-mediated for your safety.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Proxy full name</Label><Input value={form.proxy_full_name} onChange={(e) => setForm({ ...form, proxy_full_name: e.target.value })} maxLength={120} /></div>
              <div><Label>Proxy email</Label><Input type="email" value={form.proxy_email} onChange={(e) => setForm({ ...form, proxy_email: e.target.value })} maxLength={200} /></div>
              <div><Label>Proxy phone (E.164)</Label><Input value={form.proxy_phone} onChange={(e) => setForm({ ...form, proxy_phone: e.target.value })} placeholder="+1 555…" /></div>
              <div>
                <Label>Relationship</Label>
                <Select value={form.proxy_relationship} onValueChange={(v) => setForm({ ...form, proxy_relationship: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Spouse", "Parent", "Sibling", "Guardian", "Employer", "Friend", "Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Notify via:</span>
              <div className="flex items-center gap-2"><Checkbox checked={form.channels.email} onCheckedChange={(v) => setForm({ ...form, channels: { ...form.channels, email: !!v } })} /> Email</div>
              <div className="flex items-center gap-2"><Checkbox checked={form.channels.sms} onCheckedChange={(v) => setForm({ ...form, channels: { ...form.channels, sms: !!v } })} /> SMS</div>
              <div className="flex items-center gap-2"><Checkbox checked={form.channels.whatsapp} onCheckedChange={(v) => setForm({ ...form, channels: { ...form.channels, whatsapp: !!v } })} /> WhatsApp</div>
            </div>
            <Button onClick={create} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send consent request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

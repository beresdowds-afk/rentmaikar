import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Globe2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RegionRow {
  id: string;
  country_name: string;
  country_code: string;
  currency: string;
  currency_symbol: string;
  phone_prefix: string;
  flag_emoji: string | null;
  status: string;
  payment_gateway: string;
  sms_provider: string;
  build_error: string | null;
  updated_at: string;
}

const emptyForm = {
  country_name: "",
  country_code: "",
  currency: "",
  currency_symbol: "",
  phone_prefix: "",
  timezone: "",
  primary_language: "en",
  sms_provider: "twilio",
  voice_provider: "twilio",
  whatsapp_provider: "twilio",
  payment_gateway: "paypal",
  support_hours: "",
  flag_emoji: "",
  cultural_tone: "warm, trustworthy, community-oriented",
};

export const RegionAutoBuildWorker = () => {
  const [form, setForm] = useState(emptyForm);
  const [building, setBuilding] = useState(false);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("region_definitions")
      .select("id,country_name,country_code,currency,currency_symbol,phone_prefix,flag_emoji,status,payment_gateway,sms_provider,build_error,updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRegions((data ?? []) as RegionRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const build = async () => {
    if (!form.country_name || !form.country_code || !form.currency || !form.currency_symbol || !form.phone_prefix) {
      toast.error("Country name, code, currency, symbol, and phone prefix are required");
      return;
    }
    setBuilding(true);
    const t = toast.loading(`Auto-building region for ${form.country_name}…`);
    try {
      const { data, error } = await supabase.functions.invoke("region-autobuild", { body: form });
      if (error) throw error;
      toast.success(`Region built for ${form.country_name}`, { id: t, description: `${data?.log?.length ?? 0} content blocks generated` });
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast.error("Auto-build failed", { id: t, description: e.message });
    } finally {
      setBuilding(false);
    }
  };

  const rebuild = async (r: RegionRow) => {
    setForm({
      country_name: r.country_name,
      country_code: r.country_code,
      currency: r.currency,
      currency_symbol: r.currency_symbol,
      phone_prefix: r.phone_prefix,
      timezone: "",
      primary_language: "en",
      sms_provider: r.sms_provider,
      voice_provider: "twilio",
      whatsapp_provider: "twilio",
      payment_gateway: r.payment_gateway,
      support_hours: "",
      flag_emoji: r.flag_emoji ?? "",
      cultural_tone: "warm, trustworthy, community-oriented",
    });
    toast.info("Loaded region into form. Click Auto-Build to regenerate.");
  };

  const publish = async (r: RegionRow) => {
    const next = r.status === "published" ? "ready" : "published";
    const { error } = await (supabase as any).from("region_definitions").update({ status: next }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "Region published" : "Region unpublished");
    load();
  };

  const remove = async (r: RegionRow) => {
    if (!confirm(`Delete region ${r.country_name}? This removes all generated content.`)) return;
    const { error } = await (supabase as any).from("region_definitions").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Region deleted");
    load();
  };

  const statusColor = (s: string) =>
    s === "ready" ? "default" : s === "published" ? "default" : s === "building" ? "secondary" : s === "failed" ? "destructive" : "outline";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Region Auto-Build Worker</h3>
            <p className="text-sm text-muted-foreground">Spin up a new region: config + AI-generated localized copy across hero, categories, features, testimonials, CTA and how-it-works.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Country name</Label>
            <Input value={form.country_name} onChange={(e) => setForm({ ...form, country_name: e.target.value })} placeholder="Ghana" />
          </div>
          <div className="space-y-1.5">
            <Label>Country code (ISO-2)</Label>
            <Input value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} placeholder="GH" maxLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Flag emoji</Label>
            <Input value={form.flag_emoji} onChange={(e) => setForm({ ...form, flag_emoji: e.target.value })} placeholder="🇬🇭" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} placeholder="GHS" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency symbol</Label>
            <Input value={form.currency_symbol} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} placeholder="₵" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone prefix</Label>
            <Input value={form.phone_prefix} onChange={(e) => setForm({ ...form, phone_prefix: e.target.value })} placeholder="+233" />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Africa/Accra" />
          </div>
          <div className="space-y-1.5">
            <Label>Support hours</Label>
            <Input value={form.support_hours} onChange={(e) => setForm({ ...form, support_hours: e.target.value })} placeholder="8am-8pm GMT" />
          </div>
          <div className="space-y-1.5">
            <Label>Primary language</Label>
            <Input value={form.primary_language} onChange={(e) => setForm({ ...form, primary_language: e.target.value })} placeholder="en" />
          </div>
          <div className="space-y-1.5">
            <Label>SMS / WhatsApp provider</Label>
            <Select value={form.sms_provider} onValueChange={(v) => setForm({ ...form, sms_provider: v, whatsapp_provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="termii">Termii</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Voice provider</Label>
            <Select value={form.voice_provider} onValueChange={(v) => setForm({ ...form, voice_provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="termii">Termii</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment gateway</Label>
            <Select value={form.payment_gateway} onValueChange={(v) => setForm({ ...form, payment_gateway: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="paystack">Paystack</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="flutterwave">Flutterwave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>Cultural tone / copy guidance</Label>
            <Textarea rows={2} value={form.cultural_tone} onChange={(e) => setForm({ ...form, cultural_tone: e.target.value })} placeholder="e.g. warm, community-first, uses local rideshare brands (Bolt, Yango)" />
          </div>
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <Button variant="outline" onClick={() => setForm(emptyForm)} disabled={building}>Reset</Button>
          <Button onClick={build} disabled={building}>
            {building ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building…</> : <><Sparkles className="w-4 h-4 mr-2" /> Auto-Build Region</>}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Generated Regions ({regions.length})</h3>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {regions.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">No regions yet. Build your first region above.</p>
        )}

        <div className="space-y-2">
          {regions.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.flag_emoji || "🌐"}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.country_name}</p>
                    <Badge variant={statusColor(r.status) as any}>{r.status}</Badge>
                    {r.status === "ready" && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {r.status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.country_code} · {r.currency_symbol} {r.currency} · {r.phone_prefix} · {r.payment_gateway} · {r.sms_provider}
                  </p>
                  {r.build_error && <p className="text-xs text-destructive mt-1">Error: {r.build_error}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => rebuild(r)}>Edit / Rebuild</Button>
                <Button size="sm" variant={r.status === "published" ? "secondary" : "hero"} onClick={() => publish(r)} disabled={r.status === "building" || r.status === "failed"}>
                  {r.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(r)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default RegionAutoBuildWorker;

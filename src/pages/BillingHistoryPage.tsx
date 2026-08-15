import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletLedgerPanel } from "@/components/payments/WalletLedgerPanel";
import { toast } from "sonner";
import { CreditCard, Download, FileText, Receipt, RefreshCw, Send, ShieldCheck } from "lucide-react";

interface PaymentRow {
  id: string; amount: number; currency: string; status: string; purpose: string | null;
  payment_method: string | null; transaction_id: string | null; created_at: string;
  settled_at: string | null; driver_id: string | null; owner_id: string | null;
}
interface SubRow {
  id: string; status: string; started_at: string; expires_at: string | null;
  auto_renew: boolean | null; payment_method: string | null;
  subscription_plans: { name: string; plan_type: string; price: number; currency: string; billing_interval: string } | null;
}
interface DocRow {
  id: string; created_at: string; currency: string; status: string;
  invoice_number?: string; receipt_number?: string; total_amount?: number; amount?: number;
  due_date?: string | null; invoice_type?: string | null; payment_method?: string | null;
}

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency", currency, maximumFractionDigits: 2,
    }).format(Number(amount ?? 0));
  } catch {
    return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
  }
};

const PURPOSE_LABELS: Record<string, string> = {
  rental: "Rental payment",
  security_deposit: "Security deposit",
  late_fee: "Late fee",
  subscription_training: "Driver training subscription",
  subscription_insurance: "Insurance subscription",
  subscription_roadside: "Roadside support subscription",
};

const statusVariant = (s: string) =>
  s === "completed" || s === "paid" || s === "active" ? "default"
    : s === "failed" || s === "expired" || s === "cancelled" ? "destructive"
      : "secondary";

/**
 * Unified billing history for drivers and owners: current subscription status,
 * subscription periods, every payment, and all invoices/receipts.
 */
export default function BillingHistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [invoices, setInvoices] = useState<DocRow[]>([]);
  const [receipts, setReceipts] = useState<DocRow[]>([]);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [pay, sub, inv, rcp] = await Promise.all([
      supabase.from("payments")
        .select("id, amount, currency, status, purpose, payment_method, transaction_id, created_at, settled_at, driver_id, owner_id")
        .or(`driver_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("user_subscriptions")
        .select("id, status, started_at, expires_at, auto_renew, payment_method, subscription_plans(name, plan_type, price, currency, billing_interval)")
        .eq("user_id", user.id).order("started_at", { ascending: false }),
      supabase.from("invoices")
        .select("id, invoice_number, status, total_amount, currency, due_date, invoice_type, created_at")
        .or(`driver_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("receipts")
        .select("id, receipt_number, status, amount, currency, payment_method, created_at")
        .or(`driver_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(100),
    ]);
    setPayments((pay.data as PaymentRow[]) ?? []);
    setSubs((sub.data as unknown as SubRow[]) ?? []);
    setInvoices((inv.data as DocRow[]) ?? []);
    setReceipts((rcp.data as DocRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const activeSubs = useMemo(
    () => subs.filter((s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at) > new Date())),
    [subs],
  );
  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === "completed")
      .reduce<Record<string, number>>((acc, p) => {
        acc[p.currency] = (acc[p.currency] ?? 0) + Number(p.amount);
        return acc;
      }, {}),
    [payments],
  );

  const viewDoc = async (kind: "invoice" | "receipt", id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch("https://bwvocmhcledbwqlpcswp.functions.supabase.co/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: "render_html", kind, id }),
      });
      const html = await res.text();
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); }
    } catch {
      toast.error("Unable to open document");
    }
  };

  const emailDoc = async (kind: "invoice" | "receipt", id: string) => {
    const action = kind === "invoice" ? "send_invoice" : "send_receipt";
    const key = kind === "invoice" ? "invoice_id" : "receipt_id";
    const { data, error } = await supabase.functions.invoke("billing-portal", { body: { action, [key]: id } });
    if (error || !data?.ok) { toast.error("Send failed"); return; }
    toast.success(`${kind === "invoice" ? "Invoice" : "Receipt"} emailed`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Billing History | Rentmaikar"
        description="View your Rentmaikar payments, subscription periods, invoices and receipts in one place."
      />
      <Header />
      <main className="pt-24 pb-16 max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Billing history</h1>
            <p className="text-muted-foreground">
              Payments, subscription periods, invoices and receipts for your account.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/subscriptions">Manage subscriptions</Link></Button>
            <Button size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Current subscription status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Current subscription status</CardTitle>
            <CardDescription>Active plans and the period each one covers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : activeSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active subscription. <Link className="underline" to="/subscriptions">Browse plans</Link>.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeSubs.map((s) => (
                  <div key={s.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.subscription_plans?.name ?? s.subscription_plans?.plan_type ?? "Plan"}</p>
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.subscription_plans
                        ? `${money(Number(s.subscription_plans.price), s.subscription_plans.currency)} / ${s.subscription_plans.billing_interval}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(s.started_at).toLocaleDateString()} –{" "}
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "ongoing"}
                      {s.auto_renew ? " · auto-renews" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(totalPaid).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Lifetime settled:{" "}
                {Object.entries(totalPaid).map(([c, v]) => money(v, c)).join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="payments">
          <TabsList className="flex-wrap">
            <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
            <TabsTrigger value="periods">Subscription periods ({subs.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            <TabsTrigger value="receipts">Receipts ({receipts.length})</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4 space-y-2">
            {loading && <Skeleton className="h-16 w-full" />}
            {!loading && payments.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No payments yet.</p>
            )}
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    {PURPOSE_LABELS[p.purpose ?? "rental"] ?? (p.purpose ?? "Payment").replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(p.created_at).toLocaleString()}
                    {p.payment_method ? ` · ${p.payment_method}` : ""}
                    {p.settled_at ? " · settled" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{money(Number(p.amount), p.currency)}</p>
                  <Badge variant={statusVariant(p.status)} className="text-[10px]">{p.status}</Badge>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="periods" className="mt-4 space-y-2">
            {!loading && subs.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No subscription history yet.</p>
            )}
            {subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.subscription_plans?.name ?? "Plan"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleDateString()} –{" "}
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "ongoing"}
                    {s.payment_method ? ` · ${s.payment_method}` : ""}
                  </p>
                </div>
                <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4 space-y-2">
            {!loading && invoices.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet.</p>
            )}
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs flex items-center gap-1"><FileText className="h-3 w-3" /> {i.invoice_number}</p>
                  <p className="text-sm">
                    {money(Number(i.total_amount ?? 0), i.currency)}{" "}
                    <Badge variant={statusVariant(i.status)} className="text-[10px]">{i.status}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.created_at).toLocaleDateString()}
                    {i.due_date ? ` · due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => viewDoc("invoice", i.id)} aria-label="Open invoice">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => emailDoc("invoice", i.id)} aria-label="Email invoice">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="receipts" className="mt-4 space-y-2">
            {!loading && receipts.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No receipts yet.</p>
            )}
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs flex items-center gap-1"><Receipt className="h-3 w-3" /> {r.receipt_number}</p>
                  <p className="text-sm">
                    {money(Number(r.amount ?? 0), r.currency)}{" "}
                    <Badge variant="outline" className="text-[10px]">{r.payment_method ?? "—"}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => viewDoc("receipt", r.id)} aria-label="Open receipt">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => emailDoc("receipt", r.id)} aria-label="Email receipt">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="wallet" className="mt-4">
            <WalletLedgerPanel />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

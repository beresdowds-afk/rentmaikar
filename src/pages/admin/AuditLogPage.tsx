import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Shield, ArrowLeft, Search } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface DeniedEntry {
  id: string;
  user_id: string | null;
  attempted_at: string;
  target_table: string;
  target_row_id: string | null;
  reason: string | null;
  attempted_fields: string[] | null;
  attempted_values: Record<string, unknown> | null;
  session_role: string | null;
}

const AuditLogPage = () => {
  const [entries, setEntries] = useState<DeniedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("permission_denied_log")
      .select("*")
      .order("attempted_at", { ascending: false })
      .limit(500);
    if (!error && data) setEntries(data as DeniedEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) => {
    if (tableFilter && !e.target_table?.toLowerCase().includes(tableFilter.toLowerCase())) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      e.reason?.toLowerCase().includes(needle) ||
      e.user_id?.toLowerCase().includes(needle) ||
      e.target_row_id?.toLowerCase().includes(needle) ||
      e.attempted_fields?.some((f) => f.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Back to admin</Link>
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Security Audit Log
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Every RLS-denied update and blocked field change is recorded here. Latest 500 entries.
            </p>
          </div>
          <Button onClick={load} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reason, user id, row id, field…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter by table name (e.g. rentals)"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Denied attempts <span className="text-muted-foreground font-normal">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No denied attempts recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((e) => (
                    <div key={e.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{e.target_table}</Badge>
                          {e.session_role && <Badge variant="secondary" className="text-xs">{e.session_role}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(e.attempted_at), "MMM d, yyyy h:mm:ss a")}
                        </span>
                      </div>
                      {e.reason && <p className="text-sm">{e.reason}</p>}
                      {e.attempted_fields && e.attempted_fields.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {e.attempted_fields.map((f) => (
                            <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <span>User: <code className="text-[11px]">{e.user_id ?? "—"}</code></span>
                        <span>Row: <code className="text-[11px]">{e.target_row_id ?? "—"}</code></span>
                      </div>
                      {e.attempted_values && Object.keys(e.attempted_values).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground">Attempted values</summary>
                          <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto text-[11px]">
                            {JSON.stringify(e.attempted_values, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AuditLogPage;

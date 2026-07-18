import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Car, Search, Send, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VehicleRow {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  license_plate: string;
  vin: string | null;
  status: string | null;
  pickup_city: string | null;
  pickup_location: string | null;
  owner_id: string;
}

interface DriverRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const inferCountry = (v: VehicleRow): "USA" | "Nigeria" => {
  const c = (v.pickup_city || v.pickup_location || "").toLowerCase();
  if (/(lagos|abuja|port harcourt|ikeja|lekki|victoria|maitama|garki|wuse|surulere)/.test(c)) return "Nigeria";
  return "USA";
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminVehicleCataloguePage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const [recommendVehicle, setRecommendVehicle] = useState<VehicleRow | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["admin-catalogue-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, make, model, year, color, license_plate, vin, status, pickup_city, pickup_location, owner_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VehicleRow[];
    },
  });

  const { data: drivers } = useQuery({
    queryKey: ["admin-catalogue-drivers"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "driver");
      if (rolesErr) throw rolesErr;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [] as DriverRow[];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      if (error) throw error;
      return (data ?? []) as DriverRow[];
    },
  });

  const makes = useMemo(
    () => Array.from(new Set((vehicles ?? []).map((v) => v.make))).sort(),
    [vehicles]
  );

  const filtered = useMemo(() => {
    return (vehicles ?? []).filter((v) => {
      const country = inferCountry(v);
      if (countryFilter !== "all" && country !== countryFilter) return false;
      if (statusFilter !== "all" && (v.status || "pending") !== statusFilter) return false;
      if (makeFilter && v.make !== makeFilter) return false;
      if (minYear && v.year < Number(minYear)) return false;
      if (maxYear && v.year > Number(maxYear)) return false;
      if (cityFilter) {
        const c = `${v.pickup_city ?? ""} ${v.pickup_location ?? ""}`.toLowerCase();
        if (!c.includes(cityFilter.toLowerCase())) return false;
      }
      if (q) {
        const hay = `${v.make} ${v.model} ${v.license_plate} ${v.vin ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [vehicles, q, statusFilter, countryFilter, makeFilter, minYear, maxYear, cityFilter]);

  const handleRecommend = async () => {
    if (!recommendVehicle || !selectedDriverId || !user) return;
    setSubmitting(true);
    try {
      const driver = drivers?.find((d) => d.user_id === selectedDriverId);
      const { error } = await supabase.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "vehicle_recommendation",
        target_table: "vehicles",
        target_id: recommendVehicle.id,
        details: {
          driver_id: selectedDriverId,
          driver_email: driver?.email ?? null,
          driver_name: driver?.full_name ?? null,
          vehicle: `${recommendVehicle.year} ${recommendVehicle.make} ${recommendVehicle.model}`,
          license_plate: recommendVehicle.license_plate,
          note: note || null,
        },
      });
      if (error) throw error;
      toast.success("Recommendation logged", {
        description: `Recommended ${recommendVehicle.make} ${recommendVehicle.model} to ${driver?.full_name || driver?.email}.`,
      });
      setRecommendVehicle(null);
      setSelectedDriverId("");
      setNote("");
    } catch (e: any) {
      toast.error("Failed to send recommendation", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to Admin
              </Link>
              <h1 className="text-3xl font-display font-bold mt-2 flex items-center gap-2">
                <Car className="h-7 w-7 text-primary" /> Admin Vehicle Catalogue
              </h1>
              <p className="text-muted-foreground">
                Search the full fleet, apply filters, and recommend vehicles to registered drivers.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search make, model, plate, VIN..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={makeFilter || "all"} onValueChange={(v) => setMakeFilter(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Make" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {makes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Min year" value={minYear} onChange={(e) => setMinYear(e.target.value)} />
                <Input type="number" placeholder="Max year" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} />
                <Input placeholder="City contains..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isLoading ? "Loading..." : `${filtered.length} vehicles`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Plate / VIN</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((v) => {
                        const country = inferCountry(v);
                        return (
                          <TableRow key={v.id}>
                            <TableCell>
                              <div className="font-medium">{v.year} {v.make} {v.model}</div>
                              <div className="text-xs text-muted-foreground capitalize">{v.color || "—"}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm">{v.license_plate}</div>
                              <div className="font-mono text-xs text-muted-foreground">{v.vin || "—"}</div>
                            </TableCell>
                            <TableCell>{v.pickup_city || v.pickup_location || "—"}</TableCell>
                            <TableCell>{country}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[v.status || "pending"]}>
                                {v.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => setRecommendVehicle(v)}>
                                <Send className="h-3 w-3" /> Recommend
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!filtered.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            No vehicles match these filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      <Dialog open={!!recommendVehicle} onOpenChange={(o) => !o && setRecommendVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommend vehicle to driver</DialogTitle>
            <DialogDescription>
              {recommendVehicle && `${recommendVehicle.year} ${recommendVehicle.make} ${recommendVehicle.model} • ${recommendVehicle.license_plate}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Driver</label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger><SelectValue placeholder="Select a registered driver" /></SelectTrigger>
                <SelectContent>
                  {(drivers ?? []).map((d) => (
                    <SelectItem key={d.user_id} value={d.user_id}>
                      {d.full_name || d.email || d.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this vehicle is a good match..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecommendVehicle(null)}>Cancel</Button>
            <Button onClick={handleRecommend} disabled={!selectedDriverId || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send recommendation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

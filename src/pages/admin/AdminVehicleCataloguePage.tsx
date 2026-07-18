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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Car,
  Search,
  Send,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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

interface RecommendationRow {
  id: string;
  created_at: string;
  admin_id: string | null;
  target_id: string | null;
  details: any;
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

const PAGE_SIZE = 15;

type QuickChip = { id: string; label: string; match: (v: VehicleRow) => boolean };

const quickChips: QuickChip[] = [
  { id: "usa", label: "🇺🇸 USA", match: (v) => inferCountry(v) === "USA" },
  { id: "ng", label: "🇳🇬 Nigeria", match: (v) => inferCountry(v) === "Nigeria" },
  { id: "active", label: "Active", match: (v) => v.status === "active" },
  { id: "pending", label: "Pending", match: (v) => (v.status || "pending") === "pending" },
  { id: "maintenance", label: "Maintenance", match: (v) => v.status === "maintenance" },
  { id: "recent", label: "2020+", match: (v) => v.year >= 2020 },
  { id: "electric", label: "Tesla", match: (v) => v.make?.toLowerCase() === "tesla" },
];

interface Props {
  embedded?: boolean;
}

export default function AdminVehicleCataloguePage({ embedded = false }: Props) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [makeFilter, setMakeFilter] = useState("");
  const [page, setPage] = useState(1);

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

  const {
    data: recommendations,
    isLoading: recsLoading,
    refetch: refetchRecs,
  } = useQuery({
    queryKey: ["admin-catalogue-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, created_at, admin_id, target_id, details")
        .eq("action", "vehicle_recommendation")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RecommendationRow[];
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
      for (const id of activeChips) {
        const chip = quickChips.find((c) => c.id === id);
        if (chip && !chip.match(v)) return false;
      }
      if (q) {
        const hay = `${v.make} ${v.model} ${v.year} ${v.license_plate} ${v.vin ?? ""} ${v.pickup_city ?? ""} ${v.pickup_location ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [vehicles, q, statusFilter, countryFilter, makeFilter, activeChips]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleChip = (id: string) => {
    setPage(1);
    setActiveChips((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const clearFilters = () => {
    setQ("");
    setActiveChips([]);
    setStatusFilter("all");
    setCountryFilter("all");
    setMakeFilter("");
    setPage(1);
  };

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
      refetchRecs();
    } catch (e: any) {
      toast.error("Failed to send recommendation", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleById = useMemo(() => {
    const map = new Map<string, VehicleRow>();
    (vehicles ?? []).forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const body = (
    <div className={embedded ? "space-y-6" : "container mx-auto px-4 space-y-6"}>
      {!embedded && (
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
      )}

      <Tabs defaultValue="catalogue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalogue" className="gap-2">
            <Car className="h-4 w-4" /> Catalogue
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="h-4 w-4" /> Recommendations
            {recommendations && recommendations.length > 0 && (
              <Badge variant="secondary" className="ml-1">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Single search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search make, model, year, plate, VIN, or city..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Quick filter chips */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">
                  Quick filters:
                </span>
                {quickChips.map((chip) => {
                  const active = activeChips.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      onClick={() => toggleChip(chip.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
                {(activeChips.length > 0 ||
                  q ||
                  statusFilter !== "all" ||
                  countryFilter !== "all" ||
                  makeFilter) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1">
                    <X className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>

              {/* Advanced dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={makeFilter || "all"} onValueChange={(v) => { setMakeFilter(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Make" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {makes.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {isLoading
                  ? "Loading..."
                  : `${filtered.length} vehicle${filtered.length === 1 ? "" : "s"}`}
              </CardTitle>
              {!isLoading && filtered.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
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
                        {paged.map((v) => {
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
                        {!paged.length && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                              No vehicles match these filters.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {filtered.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                        {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentPage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" /> Prev
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentPage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Vehicles recommended to drivers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Live feed from <code className="text-[10px]">admin_audit_log</code> · action
                <code className="text-[10px]"> vehicle_recommendation</code>
              </p>
            </CardHeader>
            <CardContent>
              {recsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !recommendations || recommendations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No recommendations logged yet. Use the "Recommend" action on any vehicle to start.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Audit ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((r) => {
                        const d = r.details || {};
                        const v = r.target_id ? vehicleById.get(r.target_id) : null;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">
                                {d.vehicle || (v ? `${v.year} ${v.make} ${v.model}` : "—")}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {d.license_plate || v?.license_plate || "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{d.driver_name || "—"}</div>
                              <div className="text-xs text-muted-foreground">{d.driver_email || "—"}</div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {d.note || <span className="italic">no note</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-[10px] text-muted-foreground">
                                {r.id.slice(0, 8)}
                              </code>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  const dialog = (
    <RecommendDialog
      vehicle={recommendVehicle}
      onClose={() => setRecommendVehicle(null)}
      drivers={drivers ?? []}
      selectedDriverId={selectedDriverId}
      setSelectedDriverId={setSelectedDriverId}
      note={note}
      setNote={setNote}
      submitting={submitting}
      onSubmit={handleRecommend}
    />
  );

  if (embedded) {
    return (
      <>
        {body}
        {dialog}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">{body}</main>
      <Footer />
      {dialog}
    </div>
  );
}

// Extract dialog so both embedded + standalone modes share it
function RecommendDialog({
  vehicle,
  onClose,
  drivers,
  selectedDriverId,
  setSelectedDriverId,
  note,
  setNote,
  submitting,
  onSubmit,
}: {
  vehicle: VehicleRow | null;
  onClose: () => void;
  drivers: DriverRow[];
  selectedDriverId: string;
  setSelectedDriverId: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={!!vehicle} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recommend vehicle to driver</DialogTitle>
          <DialogDescription>
            {vehicle && `${vehicle.year} ${vehicle.make} ${vehicle.model} • ${vehicle.license_plate}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Driver</label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger><SelectValue placeholder="Select a registered driver" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!selectedDriverId || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send recommendation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

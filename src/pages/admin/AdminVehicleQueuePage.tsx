import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VehicleHistoryDialog from "@/components/vehicles/VehicleHistoryDialog";
import VehicleReviewAuditLog from "@/components/admin/VehicleReviewAuditLog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw, Search, Clock, MapPin } from "lucide-react";
import Seo from "@/components/seo/Seo";

type ReviewStatus = "pending" | "published" | "rejected";
type QueueTab = ReviewStatus | "audit";

interface QueueVehicle {
  id: string;
  owner_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  license_plate: string | null;
  pickup_city: string | null;
  pickup_location: string | null;
  photo_urls: string[] | null;
  status: string | null;
  is_public: boolean | null;
  review_status: ReviewStatus;
  review_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
}

const statusVariant: Record<ReviewStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  published: "default",
  rejected: "destructive",
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const AdminVehicleQueuePage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<QueueTab>("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<QueueVehicle | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-vehicle-queue", tab],
    enabled: tab !== "audit",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("review_status", tab)
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as QueueVehicle[];
    },
  });

  const ownerIds = useMemo(
    () => Array.from(new Set((data ?? []).map((v) => v.owner_id).filter(Boolean))) as string[],
    [data],
  );

  const { data: owners } = useQuery({
    queryKey: ["admin-vehicle-queue-owners", ownerIds],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ownerLabel = (id: string | null) => {
    if (!id) return "Unassigned";
    const row = (owners ?? []).find((o: any) => o.id === id);
    return row?.full_name || row?.email || id.slice(0, 8);
  };

  const review = useMutation({
    mutationFn: async ({ id, decision, notes }: { id: string; decision: ReviewStatus; notes?: string }) => {
      const { error } = await supabase.rpc("admin_review_vehicle" as any, {
        _vehicle_id: id,
        _decision: decision,
        _reason: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      toast.success(vars.decision === "published" ? "Vehicle published to the catalogue" : "Vehicle rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle-queue"] });
      queryClient.invalidateQueries({ queryKey: ["owner-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["public-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle-review-audit"] });
      setRejectTarget(null);
      setReason("");
    },
    onError: (error: any) => toast.error(error?.message ?? "Could not update this submission"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((v) =>
      [v.make, v.model, v.license_plate, v.pickup_city, v.pickup_location, ownerLabel(v.owner_id)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [data, search, owners]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Seo
        title="Vehicle submission queue — Rentmaikar admin"
        description="Review owner vehicle submissions and publish or reject them with a reason."
        path="/admin/vehicle-queue"
        noindex
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vehicle submission queue</h1>
          <p className="text-muted-foreground text-sm">
            Approve owner submissions to publish them in the public catalogue, or reject with a reason.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search make, model, plate, city or owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as QueueTab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-6">
          <VehicleReviewAuditLog />
        </TabsContent>

        {tab !== "audit" && (
        <TabsContent value={tab} className="mt-6 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No {tab} vehicle submissions.
              </CardContent>
            </Card>
          ) : (
            filtered.map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex gap-4">
                      {v.photo_urls?.[0] && (
                        <img
                          src={v.photo_urls[0]}
                          alt={`${v.make ?? "Vehicle"} ${v.model ?? ""} submission photo`}
                          className="w-24 h-20 object-cover rounded-md border border-border"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {v.year ?? ""} {v.make} {v.model}
                        </CardTitle>
                        <CardDescription className="space-y-1">
                          <span className="block">Owner: {ownerLabel(v.owner_id)}</span>
                          <span className="block">Plate: {v.license_plate || "—"}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {v.pickup_city || v.pickup_location || "No pickup location"}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <Badge variant={statusVariant[v.review_status]} className="capitalize">
                        {v.review_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Submitted {formatDate(v.submitted_at ?? v.created_at)}
                      </span>
                      {v.reviewed_at && (
                        <span className="text-xs text-muted-foreground">Reviewed {formatDate(v.reviewed_at)}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {v.review_notes && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reason: </span>
                      {v.review_notes}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {v.review_status !== "published" && (
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ id: v.id, decision: "published" })}
                        disabled={review.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Publish
                      </Button>
                    )}
                    {v.review_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRejectTarget(v);
                          setReason("");
                        }}
                        disabled={review.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    )}
                    <VehicleHistoryDialog vehicleId={v.id} />
                    {v.review_status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review.mutate({ id: v.id, decision: "pending" })}
                        disabled={review.isPending}
                      >
                        Return to pending
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        )}
      </Tabs>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this submission</DialogTitle>
            <DialogDescription>
              The owner will see this reason on their dashboard so they can fix and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Photos are unclear and the registration expiry is missing."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 5 || review.isPending}
              onClick={() =>
                rejectTarget && review.mutate({ id: rejectTarget.id, decision: "rejected", notes: reason.trim() })
              }
            >
              Reject submission
            </Button>
          </DialogFooter>
        </DialogContent>

      </Dialog>
    </div>
  );
};

export default AdminVehicleQueuePage;

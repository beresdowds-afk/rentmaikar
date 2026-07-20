import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminNotification {
  id: string;
  kind: "onboarding_stage" | "access_grant" | "access_revoke" | "other";
  title: string;
  body: string | null;
  related_user_id: string | null;
  related_stage: string | null;
  related_access_level: string | null;
  read_at: string | null;
  created_at: string;
}

const KIND_COLORS: Record<AdminNotification["kind"], string> = {
  onboarding_stage: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  access_grant: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  access_revoke: "bg-red-500/15 text-red-700 dark:text-red-300",
  other: "bg-muted text-muted-foreground",
};

const KIND_LABEL: Record<AdminNotification["kind"], string> = {
  onboarding_stage: "Onboarding",
  access_grant: "Grant",
  access_revoke: "Revoke",
  other: "Notice",
};

export function AdminNotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  const unread = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) toast.error(error.message);
    else setItems((data ?? []) as AdminNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`admin-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as AdminNotification;
          setItems((prev) => [row, ...prev].slice(0, 30));
          toast(row.title, { description: row.body ?? undefined });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markOne = async (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)),
    );
    await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const markAll = async () => {
    setMarking(true);
    const { error } = await supabase.rpc("mark_all_admin_notifications_read");
    if (error) toast.error(error.message);
    else await load();
    setMarking(false);
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAll}
            disabled={marking || unread === 0}
            className="h-7 gap-1 text-xs"
          >
            {marking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[400px]">
          {loading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          )}
          <ul className="divide-y">
            {items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex gap-3 p-3 text-sm",
                  !n.read_at && "bg-muted/40",
                )}
              >
                <Badge className={cn("h-fit shrink-0", KIND_COLORS[n.kind])} variant="secondary">
                  {KIND_LABEL[n.kind]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{n.title}</div>
                  {n.body && (
                    <div className="text-muted-foreground text-xs mt-0.5 break-words">
                      {n.body}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => markOne(n.id)}
                    title="Mark read"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default AdminNotificationsBell;

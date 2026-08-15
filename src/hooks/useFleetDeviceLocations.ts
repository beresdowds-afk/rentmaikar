import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdge } from "@/lib/edge-invoke";

export interface FleetDevice {
  deviceRowId: string;
  serialNumber: string;
  vehicleId: string | null;
  latitude: number;
  longitude: number;
  speedKmh: number;
  course: number;
  lastPing: string | null;
  status: string | null;
  batteryLevel: number | null;
  provider: string;
  make: string;
  model: string;
  licensePlate: string;
  address: string | null;
}

interface DeviceRow {
  id: string;
  serial_number: string;
  vehicle_id: string | null;
  latitude: number | null;
  longitude: number | null;
  last_ping: string | null;
  status: string | null;
  battery_level: number | null;
  provider: string;
  health_details: Record<string, unknown> | null;
  vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
}

export const minutesSince = (iso: string | null): number | null =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) : null;

/**
 * Latest known location of every tracker, sourced from the telemetry sync
 * (iot_devices is written by the Traccar/EMQX pull sync). Refreshing runs a
 * live provider sync first, so the map always reflects the newest fix.
 */
export function useFleetDeviceLocations() {
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("iot_devices")
      .select(
        "id, serial_number, vehicle_id, latitude, longitude, last_ping, status, battery_level, provider, health_details, vehicles(make, model, license_plate)",
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("last_ping", { ascending: false })
      .limit(500);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setError(null);
    const rows = (data as unknown as DeviceRow[]) || [];
    setDevices(
      rows.map((r) => {
        const lastPos = ((r.health_details as { last_position?: Record<string, number> } | null)
          ?.last_position) ?? {};
        return {
          deviceRowId: r.id,
          serialNumber: r.serial_number,
          vehicleId: r.vehicle_id,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          speedKmh: Number(lastPos.speed_kmh ?? 0),
          course: Number(lastPos.course ?? 0),
          lastPing: r.last_ping,
          status: r.status,
          batteryLevel: r.battery_level,
          provider: r.provider,
          make: r.vehicles?.make ?? "Unassigned",
          model: r.vehicles?.model ?? r.serial_number,
          licensePlate: r.vehicles?.license_plate ?? r.serial_number,
          address: (lastPos as { address?: string }).address ?? null,
        };
      }),
    );
    setLastLoadedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  /** Pull fresh positions from every configured telemetry provider, then reload the map. */
  const syncNow = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    setSyncing(true);
    try {
      type SyncRes = {
        ok?: boolean;
        configured?: boolean;
        devices_synced?: number;
        positions_imported?: number;
        diagnosis?: { title?: string; detail?: string };
      };
      const providers = ["traccar-admin", "sarekon-admin"] as const;
      const results = await Promise.all(
        providers.map(async (fn) => {
          const { data, error: err } = await invokeEdge(fn, { action: "sync" });
          return { fn, data: data as SyncRes | null, err };
        }),
      );
      await load();

      const parts: string[] = [];
      const failures: string[] = [];
      for (const { fn, data, err } of results) {
        const label = fn === "traccar-admin" ? "Traccar" : "GPSANDTRACK";
        if (err) { failures.push(`${label}: ${err.message}`); continue; }
        if (data?.configured === false) continue; // provider not set up — silent
        if (data?.ok === false) {
          failures.push(`${label}: ${data.diagnosis?.title ?? "sync failed"}${data.diagnosis?.detail ? ` — ${data.diagnosis.detail}` : ""}`);
          continue;
        }
        parts.push(`${label} ${data?.devices_synced ?? 0} device(s)/${data?.positions_imported ?? 0} position(s)`);
      }

      if (parts.length === 0 && failures.length > 0) return { ok: false, message: failures.join(" · ") };
      return {
        ok: failures.length === 0,
        message: [parts.length ? `Synced ${parts.join(", ")}` : "No provider synced", ...failures].join(" · "),
      };
    } finally {
      setSyncing(false);
    }
  }, [load]);


  useEffect(() => { load(); }, [load]);

  // Live updates: any telemetry write refreshes the plotted positions.
  useEffect(() => {
    const channel = supabase
      .channel("fleet-device-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "iot_devices" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { devices, loading, syncing, error, lastLoadedAt, reload: load, syncNow };
}

/** Split the fleet into reporting vs. silent based on a last-seen threshold. */
export function useOfflineSplit(devices: FleetDevice[], thresholdMinutes: number) {
  return useMemo(() => {
    const stale = devices.filter((d) => {
      const m = minutesSince(d.lastPing);
      return m === null || m > thresholdMinutes;
    });
    return { stale, staleIds: new Set(stale.map((d) => d.deviceRowId)) };
  }, [devices, thresholdMinutes]);
}

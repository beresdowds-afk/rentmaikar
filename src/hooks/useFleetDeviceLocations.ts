import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  /** Pull fresh positions from the telemetry provider, then reload the map. */
  const syncNow = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    setSyncing(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("traccar-admin", {
        body: { action: "sync" },
      });
      await load();
      if (err) return { ok: false, message: err.message };
      const res = data as { ok?: boolean; devices_synced?: number; positions_imported?: number; diagnosis?: { title?: string; detail?: string } };
      if (res?.ok === false) {
        return { ok: false, message: `${res.diagnosis?.title ?? "Sync failed"} — ${res.diagnosis?.detail ?? ""}` };
      }
      return {
        ok: true,
        message: `Synced ${res?.devices_synced ?? 0} device(s), ${res?.positions_imported ?? 0} new position(s)`,
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

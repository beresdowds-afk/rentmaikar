// Unified IoT admin edge function.
// Actions (POST { action, ... }):
//  - list_plans                              → Hologram plans (best-effort)
//  - purchase_sim { plan_id?, notes? }       → provision a new eSIM (Hologram)
//                                              and store row in iot_sim_cards as status='available'
//  - list_available_sims                     → SIMs not linked to a device
//  - list_devices                            → all iot_devices with joined sim/vehicle
//  - register_device { serial_number, imei, device_model, firmware_version?, notes? }
//  - link_sim_to_device { device_imei, sim_id }
//  - activate_pair { device_id }             → activates SIM on Hologram + marks device 'active'
//  - suspend_pair  { device_id }
//  - link_to_vehicle   { device_id, vehicle_id }
//  - unlink_from_vehicle { device_id }
//  - sync_sim { sim_id }                     → refresh state/usage from Hologram
//
// Auth: caller must be admin (public.user_roles.role = 'admin').

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hologram } from "../_shared/hologram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: corsHeaders });

async function requireAdmin(req: Request, admin: any) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes } = await anon.auth.getUser(token);
  if (!userRes?.user) return null;
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin");
  return isAdmin ? userRes.user : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const user = await requireAdmin(req, admin);
  if (!user) return json(403, { error: "Admin access required" });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  try {
    switch (action) {
      case "list_plans": {
        if (!hologram.isConfigured()) {
          return json(200, { configured: false, plans: [] });
        }
        // Hologram doesn't expose /plans in the public v1 the same way, so
        // we surface a curated set. Admins can override via body.plan_id.
        const plans = [
          { id: 73, name: "Global Flexible 1 MB", monthly_mb: 1 },
          { id: 128, name: "Global Flexible 10 MB", monthly_mb: 10 },
          { id: 137, name: "Global Flexible 100 MB", monthly_mb: 100 },
        ];
        return json(200, { configured: true, plans });
      }

      case "purchase_sim": {
        const planId = Number(body?.plan_id) || 128;
        const notes = body?.notes ? String(body.notes) : null;

        // If Hologram is configured, provision a SIM from the pool.
        let providerSimId: string | null = null;
        let iccid = String(body?.iccid || "").trim();
        let msisdn: string | null = body?.msisdn ? String(body.msisdn) : null;
        let providerState: string = "pending";

        if (hologram.isConfigured()) {
          const list = await hologram.listSims(1);
          if (list.ok && list.body?.data?.length > 0) {
            const sim = list.body.data[0];
            providerSimId = String(sim.id);
            iccid = iccid || String(sim.iccid || sim.sim || crypto.randomUUID());
            msisdn = msisdn || (sim.msisdn ? String(sim.msisdn) : null);
            providerState = String(sim.state || "pending");
          }
        }

        if (!iccid) iccid = `MOCK-${crypto.randomUUID().slice(0, 12)}`;

        const { data: inserted, error } = await admin
          .from("iot_sim_cards")
          .insert({
            iccid,
            msisdn,
            provider: "hologram",
            provider_sim_id: providerSimId,
            status: "available",
            plan_name: `Plan #${planId}`,
            metadata: { plan_id: planId, notes, provider_state: providerState },
          })
          .select()
          .single();
        if (error) return json(400, { error: error.message });

        return json(200, {
          success: true,
          sim: inserted,
          hologram_configured: hologram.isConfigured(),
        });
      }

      case "list_available_sims": {
        const { data, error } = await admin
          .from("iot_sim_cards")
          .select("*")
          .is("device_id", null)
          .order("created_at", { ascending: false });
        if (error) return json(400, { error: error.message });
        return json(200, { sims: data });
      }

      case "list_devices": {
        const { data, error } = await admin
          .from("iot_devices")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return json(400, { error: error.message });
        const ids = (data || []).map((d: any) => d.id);
        let sims: any[] = [];
        if (ids.length) {
          const { data: sd } = await admin
            .from("iot_sim_cards")
            .select("*")
            .in("device_id", ids);
          sims = sd || [];
        }
        const vehicleIds = (data || [])
          .map((d: any) => d.vehicle_id)
          .filter(Boolean);
        let vehicles: any[] = [];
        if (vehicleIds.length) {
          const { data: vd } = await admin
            .from("vehicles")
            .select("id, license_plate, make, model, year, owner_id")
            .in("id", vehicleIds);
          vehicles = vd || [];
        }
        return json(200, { devices: data, sims, vehicles });
      }

      case "register_device": {
        const {
          serial_number,
          imei,
          device_model = "GPS-01",
          firmware_version = null,
          notes = null,
        } = body || {};
        if (!serial_number || !imei) {
          return json(400, { error: "serial_number and imei are required" });
        }
        if (!/^\d{15}$/.test(String(imei))) {
          return json(400, { error: "IMEI must be 15 digits" });
        }
        const { data, error } = await admin
          .from("iot_devices")
          .insert({
            serial_number,
            imei,
            device_model,
            firmware_version,
            notes,
            status: "inactive",
            is_linked: false,
            provider: "traccar",
          })
          .select()
          .single();
        if (error) return json(400, { error: error.message });
        return json(200, { success: true, device: data });
      }

      case "link_sim_to_device": {
        const { device_imei, sim_id } = body || {};
        if (!device_imei || !sim_id) {
          return json(400, { error: "device_imei and sim_id are required" });
        }
        const { data: device, error: dErr } = await admin
          .from("iot_devices")
          .select("*")
          .eq("imei", String(device_imei))
          .maybeSingle();
        if (dErr) return json(400, { error: dErr.message });
        if (!device) return json(404, { error: "No device with that IMEI" });

        const { data: sim, error: sErr } = await admin
          .from("iot_sim_cards")
          .select("*")
          .eq("id", sim_id)
          .maybeSingle();
        if (sErr) return json(400, { error: sErr.message });
        if (!sim) return json(404, { error: "SIM not found" });
        if (sim.device_id && sim.device_id !== device.id) {
          return json(409, { error: "SIM is already linked to another device" });
        }

        await admin
          .from("iot_sim_cards")
          .update({ device_id: device.id })
          .eq("id", sim_id);

        // Mirror SIM details onto the device row for quick display.
        await admin
          .from("iot_devices")
          .update({
            sim_number: sim.msisdn,
            sim_provider: sim.provider,
          })
          .eq("id", device.id);

        return json(200, { success: true });
      }

      case "activate_pair": {
        const { device_id } = body || {};
        if (!device_id) return json(400, { error: "device_id is required" });

        const { data: device } = await admin
          .from("iot_devices")
          .select("*")
          .eq("id", device_id)
          .maybeSingle();
        if (!device) return json(404, { error: "Device not found" });

        const { data: sim } = await admin
          .from("iot_sim_cards")
          .select("*")
          .eq("device_id", device_id)
          .maybeSingle();
        if (!sim) {
          return json(409, {
            error: "Device has no SIM linked. Link a SIM by IMEI first.",
          });
        }

        // Activate on Hologram when configured.
        let providerResult: any = { skipped: true };
        if (hologram.isConfigured() && sim.provider_sim_id) {
          const planId = Number(sim.metadata?.plan_id) || 128;
          const r = await hologram.activateSim(sim.provider_sim_id, planId);
          providerResult = r;
          if (!r.ok) {
            return json(502, {
              error: "Hologram activation failed",
              provider: r,
            });
          }
        }

        const now = new Date().toISOString();
        await admin
          .from("iot_sim_cards")
          .update({ status: "active", activated_at: now })
          .eq("id", sim.id);
        await admin
          .from("iot_devices")
          .update({ status: "active", activated_at: now })
          .eq("id", device.id);

        return json(200, { success: true, provider: providerResult });
      }

      case "suspend_pair": {
        const { device_id } = body || {};
        if (!device_id) return json(400, { error: "device_id is required" });

        const { data: sim } = await admin
          .from("iot_sim_cards")
          .select("*")
          .eq("device_id", device_id)
          .maybeSingle();
        if (sim && hologram.isConfigured() && sim.provider_sim_id) {
          await hologram.suspendSim(sim.provider_sim_id);
        }
        const now = new Date().toISOString();
        if (sim) {
          await admin
            .from("iot_sim_cards")
            .update({ status: "suspended", suspended_at: now })
            .eq("id", sim.id);
        }
        await admin
          .from("iot_devices")
          .update({ status: "inactive" })
          .eq("id", device_id);
        return json(200, { success: true });
      }

      case "link_to_vehicle": {
        const { device_id, vehicle_id } = body || {};
        if (!device_id || !vehicle_id) {
          return json(400, { error: "device_id and vehicle_id are required" });
        }
        // Vehicle can only host one device.
        const { data: existing } = await admin
          .from("iot_devices")
          .select("id")
          .eq("vehicle_id", vehicle_id)
          .neq("id", device_id)
          .maybeSingle();
        if (existing) {
          return json(409, {
            error: "This vehicle already has a linked tracking device.",
          });
        }
        const { error } = await admin
          .from("iot_devices")
          .update({ vehicle_id, is_linked: true })
          .eq("id", device_id);
        if (error) return json(400, { error: error.message });
        await admin
          .from("iot_sim_cards")
          .update({ vehicle_id })
          .eq("device_id", device_id);
        return json(200, { success: true });
      }

      case "unlink_from_vehicle": {
        const { device_id } = body || {};
        if (!device_id) return json(400, { error: "device_id is required" });
        await admin
          .from("iot_devices")
          .update({ vehicle_id: null, is_linked: false })
          .eq("id", device_id);
        await admin
          .from("iot_sim_cards")
          .update({ vehicle_id: null })
          .eq("device_id", device_id);
        return json(200, { success: true });
      }

      case "sync_sim": {
        const { sim_id } = body || {};
        if (!sim_id) return json(400, { error: "sim_id is required" });
        const { data: sim } = await admin
          .from("iot_sim_cards")
          .select("*")
          .eq("id", sim_id)
          .maybeSingle();
        if (!sim) return json(404, { error: "SIM not found" });
        if (!hologram.isConfigured() || !sim.provider_sim_id) {
          return json(200, { skipped: true, reason: "not_configured" });
        }
        const info = await hologram.getSim(sim.provider_sim_id);
        const usage = await hologram.getSimUsage(sim.provider_sim_id);
        const state = info.ok ? (info.body?.data?.state as string) : null;
        const dataMb = usage.ok ? Number(usage.body?.data?.usage_mb || 0) : null;
        await admin
          .from("iot_sim_cards")
          .update({
            status: state || sim.status,
            data_usage_mb: dataMb ?? sim.data_usage_mb,
            last_session_at: new Date().toISOString(),
          })
          .eq("id", sim.id);
        return json(200, { success: true, state, data_usage_mb: dataMb });
      }

      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
  } catch (err: any) {
    console.error("iot-admin error:", err);
    return json(500, { error: err?.message || "Unknown error" });
  }
});

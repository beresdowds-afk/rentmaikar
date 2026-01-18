import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IoTAccidentData {
  vehicleId: string;
  driverId: string;
  ownerId?: string;
  triggerType: 'sudden_deceleration' | 'impact' | 'rollover' | 'airbag';
  decelerationG: number; // G-force of deceleration
  speedAtImpact: number; // Speed in mph when detected
  latitude: number;
  longitude: number;
  timestamp: string;
  deviceId: string;
  additionalData?: {
    heading?: number;
    altitude?: number;
    batteryLevel?: number;
  };
}

// Thresholds for accident detection
const ACCIDENT_THRESHOLDS = {
  SUDDEN_DECELERATION_G: 4.0, // 4G deceleration is significant
  CRITICAL_DECELERATION_G: 8.0, // 8G+ is severe impact
  HIGH_SPEED_THRESHOLD: 30, // mph - impacts above this are more serious
  IMPACT_SEVERITY: {
    low: { minG: 2, maxG: 4 },
    medium: { minG: 4, maxG: 6 },
    high: { minG: 6, maxG: 8 },
    critical: { minG: 8, maxG: Infinity },
  },
};

const getImpactSeverity = (decelerationG: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (decelerationG >= ACCIDENT_THRESHOLDS.IMPACT_SEVERITY.critical.minG) return 'critical';
  if (decelerationG >= ACCIDENT_THRESHOLDS.IMPACT_SEVERITY.high.minG) return 'high';
  if (decelerationG >= ACCIDENT_THRESHOLDS.IMPACT_SEVERITY.medium.minG) return 'medium';
  return 'low';
};

const getTriggerDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    sudden_deceleration: 'Sudden deceleration detected by accelerometer',
    impact: 'Impact detected by collision sensors',
    rollover: 'Rollover event detected by gyroscope',
    airbag: 'Airbag deployment signal received',
  };
  return descriptions[type] || 'Unknown trigger event';
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: IoTAccidentData = await req.json();

    console.log("[IoTAccident] Processing accident data:", {
      vehicleId: body.vehicleId,
      triggerType: body.triggerType,
      decelerationG: body.decelerationG,
    });

    // Validate minimum threshold
    if (body.decelerationG < ACCIDENT_THRESHOLDS.SUDDEN_DECELERATION_G) {
      console.log("[IoTAccident] Below threshold, ignoring:", body.decelerationG);
      return new Response(
        JSON.stringify({ 
          success: true, 
          ignored: true, 
          reason: 'Below detection threshold' 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const severity = getImpactSeverity(body.decelerationG);
    const title = `IoT Detected: ${body.triggerType.replace('_', ' ').toUpperCase()}`;
    const description = `${getTriggerDescription(body.triggerType)}

**Sensor Data:**
- Deceleration: ${body.decelerationG.toFixed(2)}G
- Speed at impact: ${body.speedAtImpact} mph
- Impact severity: ${severity.toUpperCase()}
- Device ID: ${body.deviceId}
- Timestamp: ${body.timestamp}

**Location:**
- Coordinates: ${body.latitude}, ${body.longitude}

This incident was automatically detected by the vehicle's IoT system. Emergency services may need to be contacted for high/critical severity events.`;

    // Create the incident record
    const { data: incident, error: insertError } = await supabase
      .from('vehicle_incidents')
      .insert({
        vehicle_id: body.vehicleId,
        driver_id: body.driverId,
        owner_id: body.ownerId || null,
        incident_type: 'accident',
        severity: severity,
        status: 'reported',
        title,
        description,
        location_lat: body.latitude,
        location_lng: body.longitude,
        is_iot_detected: true,
        iot_data: body.additionalData || {},
        iot_trigger_type: body.triggerType,
        iot_deceleration_g: body.decelerationG,
        iot_impact_severity: severity,
        iot_speed_at_impact: body.speedAtImpact,
        iot_triggered_at: body.timestamp,
        occurred_at: body.timestamp,
        reported_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create incident: ${insertError.message}`);
    }

    console.log("[IoTAccident] Incident created:", incident.id);

    // Send notification to admin and owner
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-incident-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          incidentId: incident.id,
          incidentType: 'accident',
          severity,
          vehicleId: body.vehicleId,
          driverId: body.driverId,
          ownerId: body.ownerId,
          title,
          description,
          isIotDetected: true,
          isLateReport: false,
          location: `${body.latitude}, ${body.longitude}`,
        }),
      });
      console.log("[IoTAccident] Notification sent");
    } catch (notifError) {
      console.error("[IoTAccident] Notification failed:", notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        incidentId: incident.id,
        severity,
        message: `Accident incident created with ${severity} severity`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[IoTAccident] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

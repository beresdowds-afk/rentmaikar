import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCronSecret } from "../_shared/cron-auth.ts";
import { getEmqxManagementConfig, classifyManagementFailure } from "../_shared/emqx-config.ts";
import { getEmqxCredentials } from "../_shared/emqx-credentials.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMQX Monitoring Edge Function
 * 
 * Proxies the EMQX HTTP Management API (v5) for admin dashboard use.
 * Endpoints:
 *   GET  /stats     — Cluster stats (connections, subscriptions, messages)
 *   GET  /nodes     — Node health & resource usage
 *   GET  /clients   — Connected client list with optional filters
 *   GET  /subscriptions — Active subscription list
 *   GET  /metrics   — Detailed message & byte metrics
 *   GET  /rules     — Rule engine rules list
 *   GET  /bridges   — Data bridge status (PostgreSQL, Webhook)
 *   GET  /alarms    — Active & historical alarms
 *   POST /publish   — Publish test message via EMQX API
 *   POST /kickout   — Disconnect a specific client
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const cronDenied = requireCronSecret(req);
  if (cronDenied) return cronDenied;

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, params } = await req.json();

    const cfg = await getEmqxManagementConfig();
    const creds = await getEmqxCredentials();

    const configSummary = {
      api_url: cfg.apiUrl,
      management_host: cfg.managementHost,
      management_port: cfg.managementPort,
      api_base_path: cfg.apiBasePath,
      mqtt_host: cfg.mqttHost,
      mqtt_port: cfg.mqttPort,
      management_enabled: cfg.managementEnabled,
      deployment_type: cfg.deploymentType,
      config_source: cfg.source,
      credentials_source: creds?.source ?? null,
      has_credentials: !!creds,
    };

    // Report the effective configuration without touching the broker.
    if (action === 'config') {
      return new Response(JSON.stringify({ success: true, data: { config: configSummary } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const degraded = (reason: string, hint: string, status: number | null = null) =>
      new Response(
        JSON.stringify({
          success: false,
          unavailable: true,
          reason,
          hint,
          status,
          config: configSummary,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );

    if (!cfg.managementEnabled) {
      return degraded(
        'management_api_disabled',
        'Management API polling is switched off in EMQX endpoint settings. Live broker metrics are unavailable; device telemetry is unaffected.',
      );
    }

    if (!creds) {
      return degraded(
        'management_api_no_credentials',
        'No active EMQX management API key is configured. Add and activate one in the EMQX credential rotation panel.',
      );
    }

    const authB64 = btoa(`${creds.key}:${creds.secret}`);
    const emqxApiUrl = cfg.apiUrl.replace(/\/$/, '');

    class EmqxUnavailable extends Error {
      constructor(public httpStatus: number | null, public detail: string) {
        super(detail);
      }
    }

    const emqxFetch = async (path: string, method = 'GET', body?: any) => {
      const opts: RequestInit = {
        method,
        headers: {
          'Authorization': `Basic ${authB64}`,
          'Content-Type': 'application/json',
        },
      };
      if (body) opts.body = JSON.stringify(body);

      let resp: Response;
      try {
        resp = await fetch(`${emqxApiUrl}${path}`, opts);
      } catch (e) {
        throw new EmqxUnavailable(null, String(e));
      }
      if (!resp.ok) {
        throw new EmqxUnavailable(resp.status, await resp.text());
      }
      return resp.json();
    };

    let result: any;

    try {

    switch (action) {
      case 'stats': {
        const [stats, metrics] = await Promise.all([
          emqxFetch('/stats'),
          emqxFetch('/metrics'),
        ]);
        result = { stats, metrics };
        break;
      }

      case 'nodes': {
        result = await emqxFetch('/nodes');
        break;
      }

      case 'clients': {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page);
        if (params?.limit) queryParams.set('limit', params.limit || '50');
        if (params?.clientid) queryParams.set('clientid', params.clientid);
        if (params?.username) queryParams.set('username', params.username);
        if (params?.connected !== undefined) queryParams.set('conn_state', params.connected ? 'connected' : 'disconnected');
        const qs = queryParams.toString();
        result = await emqxFetch(`/clients${qs ? '?' + qs : ''}`);
        break;
      }

      case 'subscriptions': {
        const queryParams = new URLSearchParams();
        if (params?.clientid) queryParams.set('clientid', params.clientid);
        if (params?.topic) queryParams.set('topic', params.topic);
        if (params?.limit) queryParams.set('limit', params.limit || '100');
        const qs = queryParams.toString();
        result = await emqxFetch(`/subscriptions${qs ? '?' + qs : ''}`);
        break;
      }

      case 'metrics': {
        result = await emqxFetch('/metrics');
        break;
      }

      case 'rules': {
        result = await emqxFetch('/rules');
        break;
      }

      case 'bridges': {
        result = await emqxFetch('/bridges');
        break;
      }

      case 'alarms': {
        const [active, historical] = await Promise.all([
          emqxFetch('/alarms?activated=true'),
          emqxFetch('/alarms?activated=false&limit=20'),
        ]);
        result = { active, historical };
        break;
      }

      case 'topic_metrics': {
        result = await emqxFetch('/topic_metrics');
        break;
      }

      case 'publish': {
        if (!params?.topic || !params?.payload) {
          return new Response(JSON.stringify({ error: 'topic and payload required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await emqxFetch('/publish', 'POST', {
          topic: params.topic,
          payload: typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload),
          qos: params.qos || 1,
          retain: params.retain || false,
        });
        break;
      }

      case 'kickout': {
        if (!params?.clientid) {
          return new Response(JSON.stringify({ error: 'clientid required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await emqxFetch(`/clients/${encodeURIComponent(params.clientid)}`, 'DELETE');
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result, config: configSummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    } catch (e) {
      if (e instanceof EmqxUnavailable) {
        const { reason, hint } = classifyManagementFailure(e.httpStatus, e.detail);
        console.warn('[emqx-monitoring] management API unavailable:', reason, e.httpStatus);
        return degraded(reason, hint, e.httpStatus);
      }
      throw e;
    }
  } catch (err) {
    console.error('[emqx-monitoring]', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

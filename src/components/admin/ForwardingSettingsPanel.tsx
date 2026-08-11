import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PhoneForwarded, MessageSquare, Mail, Phone, PowerOff, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const FORWARDING_CONFIG_KEY = 'forwarding_config';
export const OUTBOUND_CONFIG_KEY = 'outbound_channel_config';

export interface ForwardingConfig {
  call: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
}

interface InboundConfig extends ForwardingConfig {
  /** When on, a channel disabled inbound is also paused outbound. */
  link_outbound?: boolean;
}

type ChannelKey = keyof ForwardingConfig;
type RegionKey = 'USA' | 'Nigeria';
type OutboundConfig = Record<RegionKey, ForwardingConfig>;

const DEFAULTS: ForwardingConfig = { call: false, sms: false, whatsapp: false, email: false };
const ALL_ON: ForwardingConfig = { call: true, sms: true, whatsapp: true, email: true };
const OUTBOUND_DEFAULTS: OutboundConfig = { USA: { ...ALL_ON }, Nigeria: { ...ALL_ON } };
const REGIONS: RegionKey[] = ['USA', 'Nigeria'];

const CHANNELS: { key: ChannelKey; label: string; description: string; outboundDescription: string; Icon: typeof Phone }[] = [
  {
    key: 'call',
    label: 'Calls',
    description: 'Inbound calls are bridged to the regional support number, with voicemail fallback.',
    outboundDescription: 'Outgoing VoIP/PSTN calls and IVR campaigns (Twilio).',
    Icon: PhoneForwarded,
  },
  {
    key: 'sms',
    label: 'SMS',
    description: 'Copies of inbound SMS messages are sent to the regional SMS contact.',
    outboundDescription: 'Outgoing SMS notifications and inbox replies (Twilio / Termii).',
    Icon: Phone,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Copies of inbound WhatsApp messages are sent to the regional WhatsApp contact.',
    outboundDescription: 'Outgoing WhatsApp notifications and inbox replies.',
    Icon: MessageSquare,
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Inbound emails are forwarded to the regional support mailbox with reply-to preserved.',
    outboundDescription: 'Outgoing transactional email and inbox replies (Resend).',
    Icon: Mail,
  },
];

export const ForwardingSettingsPanel = () => {
  const [config, setConfig] = useState<InboundConfig>(DEFAULTS);
  const [outbound, setOutbound] = useState<OutboundConfig>(OUTBOUND_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('platform_kv_settings')
        .select('key, value')
        .in('key', [FORWARDING_CONFIG_KEY, OUTBOUND_CONFIG_KEY]);
      if (error) {
        toast.error('Could not load channel settings');
      } else {
        const rows = (data ?? []) as { key: string; value: unknown }[];
        const inb = rows.find((r) => r.key === FORWARDING_CONFIG_KEY)?.value as Partial<InboundConfig> | undefined;
        const out = rows.find((r) => r.key === OUTBOUND_CONFIG_KEY)?.value as Partial<Record<RegionKey, Partial<ForwardingConfig>>> | undefined;
        setConfig({ ...DEFAULTS, ...(inb ?? {}) });
        setOutbound({
          USA: { ...ALL_ON, ...(out?.USA ?? {}) },
          Nigeria: { ...ALL_ON, ...(out?.Nigeria ?? {}) },
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const persist = async (key: string, value: unknown) => {
    const { error } = await supabase
      .from('platform_kv_settings')
      .upsert({ key, value: value as never }, { onConflict: 'key' });
    return error;
  };

  const toggleLink = async (value: boolean) => {
    const next = { ...config, link_outbound: value };
    setSavingKey('link');
    const error = await persist(FORWARDING_CONFIG_KEY, next);
    setSavingKey(null);
    if (error) {
      toast.error('Failed to update channel sync');
      return;
    }
    setConfig(next);
    toast.success(value ? 'Outbound now follows the inbound toggles' : 'Outbound switches are independent again');
  };

  const toggleInbound = async (key: ChannelKey, value: boolean) => {
    const next = { ...config, [key]: value };
    setSavingKey(`in-${key}`);
    const error = await persist(FORWARDING_CONFIG_KEY, next);
    setSavingKey(null);
    if (error) {
      toast.error('Failed to update forwarding');
      return;
    }
    setConfig(next);
    toast.success(`Inbound ${key} forwarding ${value ? 'enabled' : 'disabled'}`);
  };

  const toggleOutbound = async (region: RegionKey, key: ChannelKey, value: boolean) => {
    const next: OutboundConfig = { ...outbound, [region]: { ...outbound[region], [key]: value } };
    setSavingKey(`out-${region}-${key}`);
    const error = await persist(OUTBOUND_CONFIG_KEY, next);
    setSavingKey(null);
    if (error) {
      toast.error('Failed to update outbound channel');
      return;
    }
    setOutbound(next);
    toast.success(`${region} outbound ${key} ${value ? 'resumed' : 'paused'}`);
  };

  const pauseAll = async (region: RegionKey) => {
    const next: OutboundConfig = { ...outbound, [region]: { call: false, sms: false, whatsapp: false, email: false } };
    setSavingKey(`out-${region}-all`);
    const error = await persist(OUTBOUND_CONFIG_KEY, next);
    setSavingKey(null);
    if (error) {
      toast.error('Failed to pause channels');
      return;
    }
    setOutbound(next);
    toast.success(`All outbound channels paused for ${region}`);
  };

  const pausedCount = REGIONS.reduce(
    (acc, r) => acc + CHANNELS.filter((c) => outbound[r][c.key] === false).length,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PhoneForwarded className="h-4 w-4 text-primary" />
          Channel Control
          {pausedCount > 0 && (
            <Badge variant="destructive">{pausedCount} outbound paused</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Route inbound customer communications, and pause outbound providers per channel and region — no redeploy needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="inbound">
            <TabsList className="mb-4">
              <TabsTrigger value="inbound">Inbound forwarding</TabsTrigger>
              <TabsTrigger value="outbound">Outbound kill-switches</TabsTrigger>
            </TabsList>

            <TabsContent value="inbound" className="space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                <div>
                  <span className="font-medium text-sm">Keep outbound in sync with inbound</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When on, any channel switched off here is also paused for outgoing sends in both regions, so a channel
                    is never one-way. Outbound switches still apply on top.
                  </p>
                </div>
                <Switch
                  checked={!!config.link_outbound}
                  disabled={savingKey === 'link'}
                  onCheckedChange={toggleLink}
                />
              </div>

              {CHANNELS.map(({ key, label, description, Icon }) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{label} forwarding</span>
                        <Badge variant={config[key] ? 'default' : 'secondary'}>
                          {config[key] ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config[key]}
                    disabled={savingKey === `in-${key}`}
                    onCheckedChange={(v) => toggleInbound(key, v)}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Call forwarding requires the inbound voice webhook of the platform number to point at the
                <span className="font-mono"> incoming-call-forward </span> endpoint.
              </p>
            </TabsContent>

            <TabsContent value="outbound" className="space-y-5">
              {REGIONS.map((region) => (
                <div key={region} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{region}</span>
                      <Badge variant="outline">
                        {CHANNELS.filter((c) => outbound[region][c.key] !== false).length}/4 live
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => pauseAll(region)}
                      disabled={savingKey === `out-${region}-all`}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      <PowerOff className="h-3 w-3" /> Pause all
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {CHANNELS.map(({ key, label, outboundDescription, Icon }) => {
                      const on = outbound[region][key] !== false;
                      return (
                        <div key={key} className="flex items-start justify-between gap-3 rounded-md border border-border/70 p-2.5">
                          <div className="flex items-start gap-2">
                            <Icon className={`h-4 w-4 mt-0.5 ${on ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{label}</span>
                                <Badge variant={on ? 'default' : 'destructive'} className="text-[10px]">
                                  {on ? 'Live' : 'Paused'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{outboundDescription}</p>
                            </div>
                          </div>
                          <Switch
                            checked={on}
                            disabled={savingKey === `out-${region}-${key}` || savingKey === `out-${region}-all`}
                            onCheckedChange={(v) => toggleOutbound(region, key, v)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Pausing a channel stops all outgoing sends for that region immediately — notifications, inbox replies and
                IVR calls return a "paused" result instead of hitting the provider. Verification codes follow the same
                switch, so re-enable SMS before users can sign in by OTP in that region.
              </p>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ForwardingSettingsPanel;

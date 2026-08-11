import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, PhoneForwarded, MessageSquare, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const FORWARDING_CONFIG_KEY = 'forwarding_config';

export interface ForwardingConfig {
  call: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
}

const DEFAULTS: ForwardingConfig = { call: false, sms: false, whatsapp: false, email: false };

const CHANNELS: { key: keyof ForwardingConfig; label: string; description: string; Icon: typeof Phone }[] = [
  {
    key: 'call',
    label: 'Call forwarding',
    description: 'Inbound calls are bridged to the regional support number, with voicemail fallback.',
    Icon: PhoneForwarded,
  },
  {
    key: 'sms',
    label: 'SMS forwarding',
    description: 'Copies of inbound SMS messages are sent to the regional SMS contact.',
    Icon: Phone,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp forwarding',
    description: 'Copies of inbound WhatsApp messages are sent to the regional WhatsApp contact.',
    Icon: MessageSquare,
  },
  {
    key: 'email',
    label: 'Email forwarding',
    description: 'Inbound emails are forwarded to the regional support mailbox with reply-to preserved.',
    Icon: Mail,
  },
];

export const ForwardingSettingsPanel = () => {
  const [config, setConfig] = useState<ForwardingConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('platform_kv_settings')
        .select('value')
        .eq('key', FORWARDING_CONFIG_KEY)
        .maybeSingle();
      if (error) {
        toast.error('Could not load forwarding settings');
      } else {
        setConfig({ ...DEFAULTS, ...((data?.value as Partial<ForwardingConfig>) ?? {}) });
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggle = async (key: keyof ForwardingConfig, value: boolean) => {
    const next = { ...config, [key]: value };
    setSavingKey(key);
    const { error } = await supabase
      .from('platform_kv_settings')
      .upsert({ key: FORWARDING_CONFIG_KEY, value: next }, { onConflict: 'key' });
    setSavingKey(null);
    if (error) {
      toast.error('Failed to update forwarding');
      return;
    }
    setConfig(next);
    toast.success(`${key === 'call' ? 'Call' : key === 'sms' ? 'SMS' : key === 'whatsapp' ? 'WhatsApp' : 'Email'} forwarding ${value ? 'enabled' : 'disabled'}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PhoneForwarded className="h-4 w-4 text-primary" />
          Inbound Forwarding
        </CardTitle>
        <CardDescription>
          Route inbound customer communications to the live contacts configured for each region above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {CHANNELS.map(({ key, label, description, Icon }) => (
              <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{label}</span>
                      <Badge variant={config[key] ? 'default' : 'secondary'}>
                        {config[key] ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={config[key]}
                  disabled={savingKey === key}
                  onCheckedChange={(v) => toggle(key, v)}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Call forwarding requires the inbound voice webhook of the platform number to point at the
              <span className="font-mono"> incoming-call-forward </span> endpoint.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ForwardingSettingsPanel;

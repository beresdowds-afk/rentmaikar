import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  phoneVerified?: boolean;
}

export const NotificationPreferences = ({ phoneVerified = false }: NotificationPreferencesProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    whatsapp: false,
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_email, notification_sms, notification_whatsapp, phone_verified')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        setPreferences({
          email: data.notification_email ?? true,
          sms: data.notification_sms ?? false,
          whatsapp: data.notification_whatsapp ?? false,
        });
      }
      setIsLoading(false);
    };
    
    fetchPreferences();
  }, [user]);

  const handleToggle = async (channel: 'email' | 'sms' | 'whatsapp', enabled: boolean) => {
    // Email is mandatory
    if (channel === 'email') {
      toast.info('Email notifications are required and cannot be disabled');
      return;
    }

    // Check if phone is verified for SMS/WhatsApp
    if ((channel === 'sms' || channel === 'whatsapp') && enabled && !phoneVerified) {
      toast.error('Please verify your phone number first');
      return;
    }

    setIsSaving(true);
    const newPreferences = { ...preferences, [channel]: enabled };
    
    try {
      const updateData: Record<string, boolean> = {};
      updateData[`notification_${channel}`] = enabled;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user?.id);

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success(`${channel.toUpperCase()} notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive updates about your rentals and negotiations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email - Always Required */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Required</Badge>
            <Switch checked={true} disabled />
          </div>
        </div>

        {/* SMS */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="font-medium">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive text message alerts
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.sms}
            onCheckedChange={(checked) => handleToggle('sms', checked)}
            disabled={isSaving || !phoneVerified}
          />
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <div>
              <Label className="font-medium">WhatsApp Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive WhatsApp message alerts
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.whatsapp}
            onCheckedChange={(checked) => handleToggle('whatsapp', checked)}
            disabled={isSaving || !phoneVerified}
          />
        </div>

        {!phoneVerified && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Verify your phone number to enable SMS and WhatsApp notifications.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Phone, Loader2, Save, Globe } from 'lucide-react';
import { useContactSettings, ContactSetting } from '@/hooks/useUnifiedInbox';

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

const channelLabels = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const ContactSettingCard = ({ 
  setting, 
  onUpdate 
}: { 
  setting: ContactSetting; 
  onUpdate: (id: string, updates: Partial<ContactSetting>) => Promise<boolean>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [contactValue, setContactValue] = useState(setting.contact_value);
  const [displayName, setDisplayName] = useState(setting.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const Icon = channelIcons[setting.contact_type as keyof typeof channelIcons] || Phone;

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate(setting.id, {
      contact_value: contactValue,
      display_name: displayName || null,
    });
    if (success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleToggleActive = async (isActive: boolean) => {
    await onUpdate(setting.id, { is_active: isActive });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {channelLabels[setting.contact_type as keyof typeof channelLabels]}
                </span>
                <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                  {setting.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Value</Label>
                    <Input
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      placeholder={setting.contact_type === 'email' ? 'support@example.com' : '+1234567890'}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., USA Support Line"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-mono">{setting.contact_value}</p>
                  {setting.display_name && (
                    <p className="text-xs text-muted-foreground">{setting.display_name}</p>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2 h-7 px-2"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Switch
            checked={setting.is_active}
            onCheckedChange={handleToggleActive}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminContactSettings = () => {
  const { settings, isLoading, updateSetting } = useContactSettings();

  const usaSettings = settings.filter(s => s.region === 'USA');
  const nigeriaSettings = settings.filter(s => s.region === 'Nigeria');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Contact Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage contact points for each region. These are the official channels customers will use to reach support.
        </p>
      </div>

      <Tabs defaultValue="usa" className="w-full">
        <TabsList>
          <TabsTrigger value="usa" className="flex items-center gap-2">
            🇺🇸 United States
          </TabsTrigger>
          <TabsTrigger value="nigeria" className="flex items-center gap-2">
            🇳🇬 Nigeria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usa" className="mt-4">
          <div className="grid gap-4">
            {usaSettings.map((setting) => (
              <ContactSettingCard 
                key={setting.id} 
                setting={setting} 
                onUpdate={updateSetting}
              />
            ))}
            {usaSettings.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No contact settings configured for USA
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="nigeria" className="mt-4">
          <div className="grid gap-4">
            {nigeriaSettings.map((setting) => (
              <ContactSettingCard 
                key={setting.id} 
                setting={setting} 
                onUpdate={updateSetting}
              />
            ))}
            {nigeriaSettings.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No contact settings configured for Nigeria
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContactSettings;

import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, History, Settings, PhoneCall, Globe, Radio, UserPlus, Volume2, Link2, Sparkles, PhoneOff } from 'lucide-react';
import { useVoIPCalls } from '@/hooks/useVoIPCalls';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { CallDialer } from './CallDialer';
import { CallHistory } from './CallHistory';
import { CallGroups } from './CallGroups';
import { ActiveCallPanel } from './ActiveCallPanel';
import { VoIPFeatureSettings } from './VoIPFeatureSettings';
import { OutreachContactsPanel } from './OutreachContactsPanel';
import { ConferenceRoomPanel } from './ConferenceRoomPanel';
import { CallRecordingsPanel } from './CallRecordingsPanel';
import { TwiMLAppConfigPanel } from './TwiMLAppConfigPanel';
import { IncomingCallAlerts } from '@/components/voice/IncomingCallAlerts';
import { SoftphoneControls } from './SoftphoneControls';
import { useVoiceDevice } from '@/hooks/useVoiceDevice';
import { Badge } from '@/components/ui/badge';
import { AccentConversionAgentPanel } from './AccentConversionAgentPanel';
import { AudioHardwareTester } from './AudioHardwareTester';
import { Button } from '@/components/ui/button';
import { useAccentConversionAgent } from '@/hooks/useAccentConversionAgent';

export const CallCenterPage = () => {
  const { calls, groups, isLoading, activeCall, initiateCall, endCall, createGroup, deleteGroup, refreshCalls } = useVoIPCalls();
  const { incomingRequests, acceptCallRequest, rejectCallRequest, escalateCallRequest } = useVoiceCall('admin');
  const [selectedTab, setSelectedTab] = useState('dialer');
  const voice = useVoiceDevice();

  // Duck the raw microphone while the American-accent voice is speaking so the
  // caller only hears the converted output.
  const handleDuck = useCallback((ducked: boolean) => {
    voice.setMuted?.(ducked);
  }, [voice]);
  const accentAgent = useAccentConversionAgent({
    onDuckMicrophone: handleDuck,
    callId: activeCall?.id ?? null,
  });

  const activeCalls = calls.filter(c => ['ringing', 'in-progress'].includes(c.status));

  // Hangs up the browser audio session and asks the provider to terminate the call.
  const terminateCall = useCallback(async (callId: string) => {
    if (activeCall?.id === callId) voice.hangUp();
    await endCall(callId);
  }, [activeCall?.id, endCall, voice]);

  const endAllCalls = useCallback(async () => {
    voice.hangUp();
    await Promise.allSettled(activeCalls.map(c => endCall(c.id)));
  }, [activeCalls, endCall, voice]);
  const usaCalls = calls.filter(c => c.region === 'USA');
  const nigeriaCalls = calls.filter(c => c.region === 'Nigeria');

  const stats = [
    { label: 'Active Calls', value: activeCalls.length, icon: PhoneCall, color: 'text-green-500' },
    { label: 'USA Calls Today', value: usaCalls.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length, icon: Globe, color: 'text-blue-500' },
    { label: 'Nigeria Calls Today', value: nigeriaCalls.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length, icon: Globe, color: 'text-emerald-500' },
    { label: 'Call Groups', value: groups.length, icon: Users, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">VoIP Call Center</h2>
          <p className="text-muted-foreground">
            Manage calls to users across USA (+1) and Nigeria (+234)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeCalls.length > 1 && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={() => void endAllCalls()}>
              <PhoneOff className="h-4 w-4" />
              End all calls ({activeCalls.length})
            </Button>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            USA: +1
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Nigeria: +234
          </Badge>
        </div>
      </div>

      {/* Live audio controls: microphone, mute, speaker and end call */}
      <SoftphoneControls voice={voice} />

      {/* Microphone / speaker diagnostics */}
      <AudioHardwareTester />

      {/* Incoming Call Alerts */}
      <IncomingCallAlerts
        requests={incomingRequests}
        onAccept={acceptCallRequest}
        onReject={rejectCallRequest}
        onEscalate={escalateCallRequest}
        userRole="admin"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Call Panel */}
      {activeCall && (
        <ActiveCallPanel
          call={activeCall}
          onEndCall={() => { void terminateCall(activeCall.id); }}
          isMuted={voice.isMuted}
          onToggleMute={voice.toggleMute}
          accentAgent={accentAgent}
          isSpeakerOn={voice.isSpeakerphone}
          onToggleSpeaker={() => void voice.toggleSpeakerphone()}
        />
      )}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:w-auto lg:inline-grid lg:grid-cols-9">
          <TabsTrigger value="dialer" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Make Call</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Driver Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="conferences" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Conferences</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="recordings" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Recordings</span>
          </TabsTrigger>
          <TabsTrigger value="twiml" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">In-app Setup</span>
          </TabsTrigger>
          <TabsTrigger value="accent" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Accent Agent</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dialer">
          <CallDialer 
            onInitiateCall={initiateCall}
            groups={groups}
            isLoading={isLoading}
            activeCall={activeCall ? { id: activeCall.id, status: activeCall.status } : null}
            onEndCall={activeCall ? () => terminateCall(activeCall.id) : undefined}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <OutreachContactsPanel onInitiateCall={initiateCall} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="conferences">
          <ConferenceRoomPanel
            activeCalls={activeCalls}
            onEndCall={terminateCall}
          />
        </TabsContent>

        <TabsContent value="groups">
          <CallGroups 
            groups={groups}
            onCreateGroup={createGroup}
            onDeleteGroup={deleteGroup}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="history">
          <CallHistory 
            calls={calls}
            onRefresh={refreshCalls}
            isLoading={isLoading}
            onEndCall={terminateCall}
          />
        </TabsContent>

        <TabsContent value="recordings">
          <CallRecordingsPanel calls={calls} onRefresh={refreshCalls} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="twiml">
          <TwiMLAppConfigPanel />
        </TabsContent>

        <TabsContent value="accent">
          <AccentConversionAgentPanel agent={accentAgent} />
        </TabsContent>

        <TabsContent value="settings">
          <VoIPFeatureSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CallCenterPage;

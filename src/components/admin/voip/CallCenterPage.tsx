import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, History, Settings, PhoneCall, Globe, Radio, UserPlus, Volume2, Link2, Sparkles, PhoneOff, PhoneIncoming, ClipboardList } from 'lucide-react';
import { useVoIPCalls } from '@/hooks/useVoIPCalls';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { CallDialer } from './CallDialer';
import { CallHistory } from './CallHistory';
import { CallLogPage } from './CallLogPage';
import { CallGroups } from './CallGroups';
import { ActiveCallPanel } from './ActiveCallPanel';
import { VoIPFeatureSettings } from './VoIPFeatureSettings';
import { OutreachContactsPanel } from './OutreachContactsPanel';
import { ConferenceRoomPanel } from './ConferenceRoomPanel';
import { CallRecordingsPanel } from './CallRecordingsPanel';
import { TwiMLAppConfigPanel } from './TwiMLAppConfigPanel';
import { OutboundNumberRouting } from './OutboundNumberRouting';

import { IncomingCallAlerts } from '@/components/voice/IncomingCallAlerts';
import { SoftphoneControls } from './SoftphoneControls';
import { useVoiceDevice } from '@/hooks/useVoiceDevice';
import { Badge } from '@/components/ui/badge';
import { AccentConversionAgentPanel } from './AccentConversionAgentPanel';
import { AudioHardwareTester } from './AudioHardwareTester';
import { Button } from '@/components/ui/button';
import { useAccentConversionAgent } from '@/hooks/useAccentConversionAgent';
import { useCallQueue, type QueuedCall } from '@/hooks/useCallQueue';
import { CallQueueList } from './CallQueueList';

export const CallCenterPage = () => {
  const { calls, groups, isLoading, activeCall, initiateCall, endCall, createGroup, deleteGroup, refreshCalls } = useVoIPCalls();
  const { incomingRequests, acceptCallRequest, rejectCallRequest, escalateCallRequest } = useVoiceCall('admin');
  const [selectedTab, setSelectedTab] = useState('dialer');
  const voice = useVoiceDevice();
  const queueState = useCallQueue();

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
  // FIFO router: answering always connects the caller who has waited longest first.
  const answerQueuedCall = useCallback(async (call: QueuedCall) => {
    if (call.isSimulated) {
      queueState.removeSimulated(call.id);
      return;
    }
    if (call.source === 'live_inbound') {
      setSelectedTab('dialer');
      await refreshCalls();
      return;
    }
    await acceptCallRequest(call.recordId);
    if (call.phoneNumber) {
      await initiateCall('individual', call.region === 'Nigeria' ? 'Nigeria' : 'USA', [
        { phoneNumber: call.phoneNumber, displayName: call.displayName },
      ]);
    }
    await queueState.refresh();
  }, [acceptCallRequest, initiateCall, queueState, refreshCalls]);

  const escalateQueuedCall = useCallback(async (call: QueuedCall) => {
    if (call.isSimulated || call.source === 'live_inbound') return;
    await escalateCallRequest(call.recordId);
    await queueState.refresh();
  }, [escalateCallRequest, queueState]);

  const dismissQueuedCall = useCallback(async (call: QueuedCall) => {
    if (call.isSimulated) {
      queueState.removeSimulated(call.id);
      return;
    }
    if (call.source === 'live_inbound') {
      await terminateCall(call.recordId);
    } else {
      await rejectCallRequest(call.recordId);
    }
    await queueState.refresh();
  }, [queueState, rejectCallRequest, terminateCall]);

  const usaCalls = calls.filter(c => c.region === 'USA');
  const nigeriaCalls = calls.filter(c => c.region === 'Nigeria');

  const stats = [
    { label: 'Active Calls', value: activeCalls.length, icon: PhoneCall, color: 'text-green-500' },
    { label: 'USA Calls Today', value: usaCalls.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length, icon: Globe, color: 'text-blue-500' },
    { label: 'Nigeria Calls Today', value: nigeriaCalls.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length, icon: Globe, color: 'text-emerald-500' },
    { label: 'Call Queue', value: queueState.metrics.waiting, icon: PhoneIncoming, color: 'text-amber-500', tab: 'queue' },
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

      {/* Live inbound call ringing this browser — answer with mic + speaker */}
      {voice.incomingCall && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-4">
          <PhoneIncoming className="h-5 w-5 animate-pulse text-green-600" />
          <span className="text-sm font-medium">
            Incoming call
            {voice.incomingCall.parameters?.From ? ` from ${voice.incomingCall.parameters.From}` : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="gap-2" onClick={() => voice.acceptIncoming()}>
              <PhoneCall className="h-4 w-4" />
              Answer
            </Button>
            <Button size="sm" variant="destructive" className="gap-2" onClick={() => voice.rejectIncoming()}>
              <PhoneOff className="h-4 w-4" />
              Decline
            </Button>
          </div>
        </div>
      )}


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
      {queueState.metrics.waiting > 0 && (
        <button
          type="button"
          onClick={() => setSelectedTab('queue')}
          className="flex w-full items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left"
        >
          <PhoneIncoming className="h-5 w-5 animate-pulse text-amber-500" />
          <span className="text-sm font-medium">
            {queueState.metrics.waiting} caller{queueState.metrics.waiting === 1 ? '' : 's'} waiting in queue
            {queueState.metrics.urgent > 0 ? ` · ${queueState.metrics.urgent} urgent` : ''}
          </span>
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={stat.tab ? 'cursor-pointer transition-colors hover:bg-accent/40' : undefined}
            onClick={stat.tab ? () => setSelectedTab(stat.tab as string) : undefined}
          >
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:w-auto lg:inline-grid lg:grid-cols-11">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <PhoneIncoming className="h-4 w-4" />
            <span className="hidden sm:inline">Queue</span>
            {queueState.metrics.waiting > 0 && (
              <Badge className="ml-1 animate-pulse bg-amber-500 px-1.5 py-0 text-[10px]">
                {queueState.metrics.waiting}
              </Badge>
            )}
          </TabsTrigger>
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
          <TabsTrigger value="call-log" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Call Log</span>
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

        <TabsContent value="queue">
          <CallQueueList
            queueState={queueState}
            onAnswer={answerQueuedCall}
            onEscalate={escalateQueuedCall}
            onDismiss={dismissQueuedCall}
          />
        </TabsContent>

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

        <TabsContent value="call-log">
          <CallLogPage />
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

        <TabsContent value="settings" className="space-y-4">
          <OutboundNumberRouting />
          <VoIPFeatureSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default CallCenterPage;

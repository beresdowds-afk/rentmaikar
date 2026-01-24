import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, History, Settings, PhoneCall, PhoneOff, Globe } from 'lucide-react';
import { useVoIPCalls } from '@/hooks/useVoIPCalls';
import { CallDialer } from './CallDialer';
import { CallHistory } from './CallHistory';
import { CallGroups } from './CallGroups';
import { ActiveCallPanel } from './ActiveCallPanel';
import { Badge } from '@/components/ui/badge';

export const CallCenterPage = () => {
  const { calls, groups, isLoading, activeCall, setActiveCall, initiateCall, endCall, createGroup, deleteGroup, refreshCalls } = useVoIPCalls();
  const [selectedTab, setSelectedTab] = useState('dialer');

  const activeCalls = calls.filter(c => ['ringing', 'in-progress'].includes(c.status));
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
        <div className="flex gap-2">
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
          onEndCall={() => endCall(activeCall.id)} 
        />
      )}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dialer" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Make Call</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dialer">
          <CallDialer 
            onInitiateCall={initiateCall}
            groups={groups}
            isLoading={isLoading}
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CallCenterPage;

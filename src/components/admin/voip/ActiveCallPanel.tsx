import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Phone, PhoneOff, Users, Mic, MicOff, Volume2, VolumeX, Circle } from 'lucide-react';
import type { VoIPCall } from '@/types/voip';
import { formatPhoneForDisplay } from '@/types/voip';

interface ActiveCallPanelProps {
  call: VoIPCall;
  onEndCall: () => void;
}

export const ActiveCallPanel = ({ call, onEndCall }: ActiveCallPanelProps) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const startTime = call.started_at ? new Date(call.started_at).getTime() : Date.now();
    
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.started_at]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const statusColors: Record<string, string> = {
    ringing: 'bg-yellow-500',
    'in-progress': 'bg-green-500',
  };

  return (
    <Card className="border-green-500 bg-green-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Call Status Icon */}
            <div className="relative">
              <div className={`p-3 rounded-full ${call.status === 'in-progress' ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                {call.call_type === 'group' ? (
                  <Users className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </div>
              {call.status === 'ringing' && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                </span>
              )}
            </div>

            {/* Call Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">
                  {call.call_type === 'group' ? 'Conference Call' : 'Voice Call'}
                </span>
                <Badge className={`${statusColors[call.status]} text-white`}>
                  {call.status === 'ringing' ? 'Ringing...' : 'In Progress'}
                </Badge>
                <Badge variant="outline">
                  {call.region === 'USA' ? '🇺🇸' : '🇳🇬'} {call.region}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {call.participants?.map((p, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {p.display_name || formatPhoneForDisplay(p.phone_number)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Duration & Controls */}
          <div className="flex items-center gap-4">
            {/* Duration */}
            <div className="text-2xl font-mono font-bold text-green-600">
              {formatDuration(duration)}
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-2">
              {/* Recording Toggle */}
              <div className="flex items-center gap-1.5 mr-2 px-2 py-1 rounded-md border bg-background">
                <Circle className={`h-3 w-3 ${isRecording ? 'text-red-500 fill-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                <Label htmlFor="recording-toggle" className="text-xs cursor-pointer">
                  {isRecording ? 'Recording' : 'Record'}
                </Label>
                <Switch
                  id="recording-toggle"
                  checked={isRecording}
                  onCheckedChange={setIsRecording}
                  className="scale-75"
                />
              </div>
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                variant={isSpeakerOn ? 'outline' : 'secondary'}
                size="icon"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                onClick={onEndCall}
                className="ml-2"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

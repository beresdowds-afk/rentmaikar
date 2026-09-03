import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Bluetooth,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { useVoiceDevice } from '@/hooks/useVoiceDevice';

type VoiceDevice = ReturnType<typeof useVoiceDevice>;

const STATUS_LABEL: Record<string, string> = {
  idle: 'Microphone not enabled',
  initializing: 'Preparing audio…',
  ready: 'Ready to call',
  connecting: 'Connecting…',
  'on-call': 'Connected',
  unavailable: 'Unavailable',
};

/**
 * Always-visible audio controls for the call centre: enable the microphone,
 * mute, switch speaker/earpiece output, and hang up. These act on the live
 * browser call session (Twilio Voice SDK), not on local UI state.
 */
export function SoftphoneControls({ voice }: { voice: VoiceDevice }) {
  const {
    status,
    error,
    isMuted,
    micPermission,
    permissionBlocked,
    isSpeakerphone,
    outputLabel,
    headsetConnected,
    initialize,
    hangUp,
    toggleMute,
    toggleSpeakerphone,
    reinitializeAudio,
  } = voice;

  const onCall = status === 'on-call' || status === 'connecting';
  const busy = status === 'initializing';

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2 min-w-[190px]">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                onCall ? 'bg-green-500' : status === 'ready' ? 'bg-emerald-400' : 'bg-muted-foreground/40'
              }`}
              aria-hidden="true"
            />
          )}
          <div className="leading-tight">
            <p className="text-sm font-medium">{STATUS_LABEL[status] ?? status}</p>
            <p className="text-xs text-muted-foreground">{outputLabel}</p>
          </div>
        </div>

        {headsetConnected && (
          <Badge variant="outline" className="gap-1">
            <Bluetooth className="h-3 w-3" /> Headset
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {status === 'idle' || status === 'unavailable' ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void initialize()}
              disabled={busy || permissionBlocked}
            >
              <Headphones className="h-4 w-4" />
              Enable microphone
            </Button>
          ) : null}

          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={isMuted}
            onClick={toggleMute}
            disabled={!onCall}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            variant={isSpeakerphone ? 'default' : 'outline'}
            size="icon"
            aria-label={isSpeakerphone ? 'Switch to earpiece' : 'Switch to speaker'}
            aria-pressed={isSpeakerphone}
            onClick={() => void toggleSpeakerphone()}
          >
            {isSpeakerphone ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label="Re-check audio devices"
            onClick={() => void reinitializeAudio()}
            disabled={busy}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="destructive" size="sm" className="gap-2" onClick={hangUp} disabled={!onCall}>
            <PhoneOff className="h-4 w-4" />
            End call
          </Button>
        </div>

        {(permissionBlocked || micPermission === 'denied') && (
          <Alert variant="destructive" className="w-full">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Microphone access is blocked. Allow it in your browser's site settings, then press the refresh
              button to re-check.
            </AlertDescription>
          </Alert>
        )}

        {error && !permissionBlocked && (
          <Alert variant="destructive" className="w-full">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default SoftphoneControls;

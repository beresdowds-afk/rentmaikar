import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useVoiceDevice } from "@/hooks/useVoiceDevice";
import { useRegion } from "@/contexts/RegionContext";

interface InAppCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `support`, a `+E.164` number, or `client:user_<uuid>` */
  destination?: string;
  title?: string;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Ready",
  initializing: "Preparing audio…",
  ready: "Ready to call",
  connecting: "Connecting…",
  "on-call": "Connected",
  unavailable: "Unavailable",
};

export function InAppCallDialog({
  open,
  onOpenChange,
  destination = "support",
  title,
}: InAppCallDialogProps) {
  const { country } = useRegion();
  const { status, error, isMuted, startCall, hangUp, toggleMute, initialize } = useVoiceDevice();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (open) void initialize();
  }, [open, initialize]);

  useEffect(() => {
    if (!open && started) {
      hangUp();
      setStarted(false);
    }
  }, [open, started, hangUp]);

  const active = status === "connecting" || status === "on-call";

  const handleCall = async () => {
    setStarted(true);
    const ok = await startCall(destination, { Region: country });
    if (!ok) setStarted(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {title ?? "Call support"}
          </DialogTitle>
          <DialogDescription>
            Audio runs inside the app over your internet connection. No personal numbers are shared.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{country}</Badge>
            <span className="text-sm text-muted-foreground">
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {active ? (
            <>
              <Button variant="outline" onClick={toggleMute}>
                {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button variant="destructive" onClick={() => { hangUp(); setStarted(false); }}>
                <PhoneOff className="h-4 w-4 mr-2" />
                End call
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCall}
              disabled={status === "initializing" || status === "unavailable"}
            >
              {status === "initializing" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              Start call
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Call, Device } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";
import { ensureMediaPermissions, unlockAudioOutput } from "@/lib/media-permissions";

/** Route mic + speakers to the active default devices for a Twilio Device. */
async function enableAudioDevices(device: Device | null) {
  await unlockAudioOutput();
  const audio = device?.audio as
    | {
        speakerDevices?: { set: (ids: string | string[]) => Promise<void> | void };
        ringtoneDevices?: { set: (ids: string | string[]) => Promise<void> | void };
        setInputDevice?: (id: string) => Promise<void>;
        isOutputSelectionSupported?: boolean;
      }
    | undefined;
  if (!audio) return;
  try {
    if (audio.isOutputSelectionSupported) {
      await audio.speakerDevices?.set("default");
      await audio.ringtoneDevices?.set("default");
    }
    await audio.setInputDevice?.("default");
  } catch {
    // Fall back to browser defaults when the platform blocks device selection.
  }
}


export type VoiceDeviceStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "connecting"
  | "on-call"
  | "unavailable";

interface UseVoiceDeviceResult {
  status: VoiceDeviceStatus;
  error: string | null;
  isMuted: boolean;
  incomingCall: Call | null;
  /** Registers the browser as a WebRTC client. Safe to call repeatedly. */
  initialize: () => Promise<boolean>;
  /** `support`, a `+E.164` number, or `client:user_<uuid>`. */
  startCall: (to: string, params?: Record<string, string>) => Promise<boolean>;
  hangUp: () => void;
  toggleMute: () => void;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
}

export function useVoiceDevice(): UseVoiceDeviceResult {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const [status, setStatus] = useState<VoiceDeviceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  const attachCall = useCallback((call: Call) => {
    callRef.current = call;
    setIsMuted(false);
    call.on("accept", () => setStatus("on-call"));
    call.on("disconnect", () => {
      callRef.current = null;
      setStatus(deviceRef.current ? "ready" : "idle");
    });
    call.on("cancel", () => {
      callRef.current = null;
      setStatus(deviceRef.current ? "ready" : "idle");
    });
    call.on("error", (e: { message?: string }) => {
      setError(e?.message ?? "Call failed");
      callRef.current = null;
      setStatus(deviceRef.current ? "ready" : "idle");
    });
  }, []);

  const initialize = useCallback(async () => {
    if (deviceRef.current) return true;
    setStatus("initializing");
    setError(null);

    const micOk = await ensureMediaPermissions();
    if (!micOk) {
      setError("Microphone access is required for in-app calls.");
      setStatus("unavailable");
      return false;
    }

    const { data, error: fnError } = await supabase.functions.invoke("voice-access-token");
    if (fnError || !data?.token) {
      setError(
        (data && typeof data.error === "string" ? data.error : fnError?.message) ??
          "Could not start the calling service.",
      );
      setStatus("unavailable");
      return false;
    }

    try {
      const device = new Device(data.token as string, {
        codecPreferences: ["opus", "pcmu"] as never,
        logLevel: "error" as never,
      });

      device.on("error", (e: { message?: string }) => setError(e?.message ?? "Calling error"));
      device.on("incoming", (call: Call) => {
        setIncomingCall(call);
        attachCall(call);
      });
      device.on("tokenWillExpire", async () => {
        const { data: refreshed } = await supabase.functions.invoke("voice-access-token");
        if (refreshed?.token) device.updateToken(refreshed.token as string);
      });

      await device.register();
      deviceRef.current = device;
      setStatus("ready");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register for calls.");
      setStatus("unavailable");
      return false;
    }
  }, [attachCall]);

  const startCall = useCallback(
    async (to: string, params?: Record<string, string>) => {
      const ready = deviceRef.current ? true : await initialize();
      if (!ready || !deviceRef.current) return false;

      setStatus("connecting");
      setError(null);
      try {
        const call = await deviceRef.current.connect({ params: { To: to, ...(params ?? {}) } });
        attachCall(call);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not place the call.");
        setStatus("ready");
        return false;
      }
    },
    [attachCall, initialize],
  );

  const hangUp = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    setStatus(deviceRef.current ? "ready" : "idle");
  }, []);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const next = !call.isMuted();
    call.mute(next);
    setIsMuted(next);
  }, []);

  const acceptIncoming = useCallback(() => {
    incomingCall?.accept();
    setIncomingCall(null);
  }, [incomingCall]);

  const rejectIncoming = useCallback(() => {
    incomingCall?.reject();
    setIncomingCall(null);
    callRef.current = null;
  }, [incomingCall]);

  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, []);

  return {
    status,
    error,
    isMuted,
    incomingCall,
    initialize,
    startCall,
    hangUp,
    toggleMute,
    acceptIncoming,
    rejectIncoming,
  };
}

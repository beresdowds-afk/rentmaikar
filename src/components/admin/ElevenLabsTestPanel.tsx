import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Volume2, Mic, Square, Upload, Radio, PhoneOff, Phone, RefreshCw, Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { useConversation } from "@elevenlabs/react";

const DEFAULT_TTS = "Hello from Rentmaikar. This is an ElevenLabs test message confirming end-to-end audio delivery.";
const FUNCTIONS_BASE = "https://bwvocmhcledbwqlpcswp.functions.supabase.co";

// ---------------- TTS TAB ----------------
function TTSTest({ onLogged }: { onLogged: () => void }) {
  const [text, setText] = useState(DEFAULT_TTS);
  const [voiceId, setVoiceId] = useState("");
  const [region, setRegion] = useState<"US" | "NG">("US");
  const { speak, stop, isLoading, isPlaying, error } = useElevenLabsTTS();

  const handleSpeak = async () => {
    await speak(text, { region, voiceId: voiceId || undefined });
    onLogged();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sample text</Label>
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} />
        <p className="text-xs text-muted-foreground">{text.length}/5000</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Region preset</Label>
          <select className="w-full h-10 border rounded-md px-3 bg-background" value={region} onChange={(e) => setRegion(e.target.value as "US" | "NG")}>
            <option value="US">US</option>
            <option value="NG">NG</option>
          </select>
        </div>
        <div>
          <Label>Voice ID (optional)</Label>
          <Input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="Override voice" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSpeak} disabled={isLoading || !text.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Volume2 className="h-4 w-4 mr-2" />}
          Generate & Play
        </Button>
        {isPlaying && (
          <Button variant="outline" onClick={stop}>
            <Square className="h-4 w-4 mr-2" /> Stop
          </Button>
        )}
        {isPlaying && <Badge variant="secondary" className="self-center">Playing…</Badge>}
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </div>
  );
}

// ---------------- STT TAB ----------------
interface TranscriptWord { text: string; start: number; end: number; speaker?: string }
interface TranscriptResult { text: string; words?: TranscriptWord[]; language_code?: string }

function STTTest({ onLogged }: { onLogged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext = mime.includes("webm") ? "webm" : "mp4";
        setFile(new File([blob], `recording.${ext}`, { type: mime }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setTranscribing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const form = new FormData();
      form.append("audio", file);
      form.append("diarize", "true");
      form.append("tag_audio_events", "true");
      const res = await fetch(`${FUNCTIONS_BASE}/elevenlabs-stt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || `HTTP ${res.status}`);
      setResult(json);
      toast.success("Transcription complete");
      onLogged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <Button onClick={startRecording} variant="outline"><Mic className="h-4 w-4 mr-2" />Record</Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive"><Square className="h-4 w-4 mr-2" />Stop recording</Button>
        )}
        <label className="inline-flex">
          <Button asChild variant="outline">
            <span><Upload className="h-4 w-4 mr-2" />Upload audio</span>
          </Button>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && <Badge variant="secondary" className="self-center">{file.name} · {(file.size / 1024).toFixed(1)} KB</Badge>}
      </div>
      <Button onClick={transcribe} disabled={!file || transcribing}>
        {transcribing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mic className="h-4 w-4 mr-2" />}
        Transcribe
      </Button>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {result && (
        <Card className="p-4 space-y-2">
          {result.language_code && <Badge>Language: {result.language_code}</Badge>}
          <div>
            <Label>Transcript</Label>
            <Textarea rows={6} readOnly value={result.text} />
          </div>
          {result.words && result.words.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Word timestamps ({result.words.length})</summary>
              <div className="mt-2 max-h-48 overflow-auto text-xs font-mono">
                {result.words.map((w, i) => (
                  <div key={i}>
                    [{w.start.toFixed(2)}–{w.end.toFixed(2)}] {w.speaker ? `<${w.speaker}> ` : ""}{w.text}
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------------- VOICE AGENT TAB ----------------
type MicPermState = "unknown" | "granted" | "denied" | "prompt";
const MAX_RECONNECT_ATTEMPTS = 3;

function VoiceAgentTest() {
  const [agentId, setAgentId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [micState, setMicState] = useState<MicPermState>("unknown");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const shouldReconnectRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      setReconnectAttempt(0);
      shouldReconnectRef.current = true;
      toast.success("Voice agent connected");
    },
    onDisconnect: () => {
      toast.info("Voice agent disconnected");
      if (shouldReconnectRef.current && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        const attempt = reconnectAttempt + 1;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
        setReconnectAttempt(attempt);
        toast(`Reconnecting… attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectTimerRef.current = window.setTimeout(() => void start(true), delay);
      }
    },
    onError: (err) => {
      const msg = typeof err === "string" ? err : (err as Error)?.message || "Voice agent error";
      setError(msg);
    },
    onMessage: (msg: unknown) => {
      const m = msg as { type?: string; user_transcription_event?: { user_transcript?: string }; agent_response_event?: { agent_response?: string } };
      if (m.type === "user_transcript" && m.user_transcription_event?.user_transcript) {
        setTranscript((t) => [...t, { role: "user", text: m.user_transcription_event!.user_transcript! }]);
      } else if (m.type === "agent_response" && m.agent_response_event?.agent_response) {
        setTranscript((t) => [...t, { role: "agent", text: m.agent_response_event!.agent_response! }]);
      }
    },
  });

  // Query mic permission state on mount (best-effort; not all browsers/iOS)
  useEffect(() => {
    const nav = navigator as Navigator & { permissions?: { query: (p: { name: PermissionName }) => Promise<PermissionStatus> } };
    if (!nav.permissions?.query) return;
    nav.permissions.query({ name: "microphone" as PermissionName })
      .then((status) => {
        setMicState(status.state as MicPermState);
        status.onchange = () => setMicState(status.state as MicPermState);
      })
      .catch(() => { /* Safari/iOS may not support this */ });
  }, []);

  useEffect(() => () => {
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    shouldReconnectRef.current = false;
  }, []);

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState("granted");
      return true;
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMicState("denied");
        setError("Microphone permission denied. Enable it in your browser/device settings, then try again. On iOS: Settings → Safari → Microphone. On Android: site settings → Permissions.");
      } else if (name === "NotFoundError") {
        setError("No microphone was detected on this device.");
      } else if (name === "NotReadableError") {
        setError("Microphone is in use by another app. Close it and retry.");
      } else {
        setError(e instanceof Error ? e.message : "Microphone unavailable");
      }
      return false;
    }
  }, []);

  const start = useCallback(async (isReconnect = false) => {
    setError(null);
    if (!isReconnect) setConnecting(true);
    try {
      const gotMic = await requestMic();
      if (!gotMic) return;

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${FUNCTIONS_BASE}/elevenlabs-agent-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || `HTTP ${res.status}`);
      await conversation.startSession({ conversationToken: json.token, connectionType: "webrtc" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect agent");
      shouldReconnectRef.current = false;
    } finally {
      if (!isReconnect) setConnecting(false);
    }
  }, [agentId, conversation, requestMic]);

  const stop = async () => {
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    await conversation.endSession();
  };

  const isConnected = conversation.status === "connected";

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="text-xs">
          Create a Conversational AI agent in the ElevenLabs dashboard, then paste its Agent ID here.
          Or save an <code>ELEVENLABS_AGENT_ID</code> secret as the default.
        </AlertDescription>
      </Alert>
      {micState === "denied" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Microphone is blocked. Enable it in browser/OS settings, then tap “Retry mic access”.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2 items-center flex-wrap">
        <Button size="sm" variant="outline" onClick={requestMic}>
          <Mic className="h-4 w-4 mr-2" /> Retry mic access
        </Button>
        <Badge variant={micState === "granted" ? "default" : "secondary"}>Mic: {micState}</Badge>
        {reconnectAttempt > 0 && (
          <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Reconnecting {reconnectAttempt}/{MAX_RECONNECT_ATTEMPTS}</Badge>
        )}
      </div>
      <div>
        <Label>Agent ID (optional)</Label>
        <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_..." />
      </div>
      <div className="flex gap-2 items-center">
        {!isConnected ? (
          <Button onClick={() => start(false)} disabled={connecting}>
            {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
            Start conversation
          </Button>
        ) : (
          <Button variant="destructive" onClick={stop}>
            <PhoneOff className="h-4 w-4 mr-2" /> End
          </Button>
        )}
        {isConnected && (
          <Badge variant="secondary" className="gap-1">
            <Radio className="h-3 w-3" />
            {conversation.isSpeaking ? "Agent speaking" : "Listening"}
          </Badge>
        )}
      </div>
      {error && <Alert variant="destructive"><AlertDescription className="text-xs whitespace-pre-line">{error}</AlertDescription></Alert>}
      {transcript.length > 0 && (
        <Card className="p-4 max-h-72 overflow-auto space-y-2">
          {transcript.map((m, i) => (
            <div key={i} className="text-sm">
              <span className={`font-semibold ${m.role === "agent" ? "text-primary" : "text-muted-foreground"}`}>
                {m.role === "agent" ? "Agent" : "You"}:
              </span>{" "}
              {m.text}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---------------- RECENT RUNS TAB ----------------
interface RunRow {
  id: string;
  kind: "tts" | "stt";
  status: string;
  region: string | null;
  voice_id: string | null;
  model_id: string | null;
  input_text: string | null;
  input_file_name: string | null;
  input_file_size_bytes: number | null;
  transcript_text: string | null;
  language_code: string | null;
  audio_storage_path: string | null;
  audio_bytes: number | null;
  duration_ms: number | null;
  request_metadata: unknown;
  response_metadata: unknown;
  error_message: string | null;
  created_at: string;
  user_id: string | null;
}

function RecentRuns({ refreshToken }: { refreshToken: number }) {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "tts" | "stt">("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("elevenlabs_test_logs").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("kind", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as RunRow[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const playAudio = async (row: RunRow) => {
    if (!row.audio_storage_path) return toast.error("No audio saved for this run");
    setPlayingId(row.id);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${FUNCTIONS_BASE}/elevenlabs-test-audio-url`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ logId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load audio");
      const audio = new Audio(json.url);
      await audio.play();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Playback failed");
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 border rounded-md px-3 bg-background text-sm"
        >
          <option value="all">All runs</option>
          <option value="tts">TTS only</option>
          <option value="stt">STT only</option>
        </select>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
        <span className="text-xs text-muted-foreground">{rows.length} runs</span>
      </div>
      <div className="border rounded-md divide-y max-h-[520px] overflow-auto">
        {rows.length === 0 && !loading && (
          <div className="p-6 text-sm text-muted-foreground text-center">No test runs yet.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant={r.kind === "tts" ? "default" : "secondary"}>{r.kind.toUpperCase()}</Badge>
                <Badge variant={r.status === "success" ? "outline" : "destructive"}>{r.status}</Badge>
                {r.language_code && <Badge variant="secondary">{r.language_code}</Badge>}
                {r.region && <Badge variant="secondary">{r.region}</Badge>}
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                {r.duration_ms != null && <span className="text-xs text-muted-foreground">{r.duration_ms}ms</span>}
              </div>
              {r.audio_storage_path && (
                <Button size="sm" variant="ghost" onClick={() => playAudio(r)} disabled={playingId === r.id}>
                  {playingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  <span className="ml-1 text-xs">Play</span>
                </Button>
              )}
            </div>
            {r.input_text && (
              <div className="text-xs text-muted-foreground line-clamp-2"><b>Input:</b> {r.input_text}</div>
            )}
            {r.input_file_name && (
              <div className="text-xs text-muted-foreground"><b>File:</b> {r.input_file_name} ({r.input_file_size_bytes ? (r.input_file_size_bytes / 1024).toFixed(1) + " KB" : "—"})</div>
            )}
            {r.transcript_text && (
              <div className="text-xs line-clamp-3"><b>Transcript:</b> {r.transcript_text}</div>
            )}
            {r.error_message && (
              <div className="text-xs text-destructive line-clamp-3"><b>Error:</b> {r.error_message}</div>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Request/Response metadata</summary>
              <pre className="mt-1 bg-muted rounded p-2 overflow-auto max-h-40 text-[10px]">
{JSON.stringify({ request: r.request_metadata, response: r.response_metadata, voice_id: r.voice_id, model_id: r.model_id, audio_path: r.audio_storage_path }, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- ROOT PANEL ----------------
export const ElevenLabsTestPanel = () => {
  const [refreshToken, setRefreshToken] = useState(0);
  const bumpRefresh = () => setRefreshToken((n) => n + 1);

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">ElevenLabs Test Panel</h3>
        <p className="text-sm text-muted-foreground">
          Verify TTS, STT, and Conversational Voice Agent end-to-end. Every TTS/STT run is saved to the database for admin review.
        </p>
      </div>
      <Tabs defaultValue="tts">
        <TabsList>
          <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
          <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
          <TabsTrigger value="agent">Voice Agent</TabsTrigger>
          <TabsTrigger value="runs">Recent runs</TabsTrigger>
        </TabsList>
        <TabsContent value="tts" className="pt-4"><TTSTest onLogged={bumpRefresh} /></TabsContent>
        <TabsContent value="stt" className="pt-4"><STTTest onLogged={bumpRefresh} /></TabsContent>
        <TabsContent value="agent" className="pt-4"><VoiceAgentTest /></TabsContent>
        <TabsContent value="runs" className="pt-4"><RecentRuns refreshToken={refreshToken} /></TabsContent>
      </Tabs>
    </Card>
  );
};

export default ElevenLabsTestPanel;

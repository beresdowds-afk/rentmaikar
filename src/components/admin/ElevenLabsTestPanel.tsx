import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Volume2, Mic, Square, Upload, Radio, PhoneOff, Phone } from "lucide-react";
import { toast } from "sonner";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { useConversation } from "@elevenlabs/react";

const DEFAULT_TTS = "Hello from Rentmaikar. This is an ElevenLabs test message confirming end-to-end audio delivery.";

// ---------------- TTS TAB ----------------
function TTSTest() {
  const [text, setText] = useState(DEFAULT_TTS);
  const [voiceId, setVoiceId] = useState("");
  const [region, setRegion] = useState<"US" | "NG">("US");
  const { speak, stop, isLoading, isPlaying, error } = useElevenLabsTTS();

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
        <Button onClick={() => speak(text, { region, voiceId: voiceId || undefined })} disabled={isLoading || !text.trim()}>
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

function STTTest() {
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
      const res = await fetch("https://bwvocmhcledbwqlpcswp.functions.supabase.co/elevenlabs-stt", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || `HTTP ${res.status}`);
      setResult(json);
      toast.success("Transcription complete");
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
function VoiceAgentTest() {
  const [agentId, setAgentId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => toast.success("Voice agent connected"),
    onDisconnect: () => toast.info("Voice agent disconnected"),
    onError: (err) => setError(String(err)),
    onMessage: (msg: unknown) => {
      const m = msg as { type?: string; user_transcription_event?: { user_transcript?: string }; agent_response_event?: { agent_response?: string } };
      if (m.type === "user_transcript" && m.user_transcription_event?.user_transcript) {
        setTranscript((t) => [...t, { role: "user", text: m.user_transcription_event!.user_transcript! }]);
      } else if (m.type === "agent_response" && m.agent_response_event?.agent_response) {
        setTranscript((t) => [...t, { role: "agent", text: m.agent_response_event!.agent_response! }]);
      }
    },
  });

  const start = async () => {
    setError(null);
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("https://bwvocmhcledbwqlpcswp.functions.supabase.co/elevenlabs-agent-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || `HTTP ${res.status}`);
      await conversation.startSession({ conversationToken: json.token, connectionType: "webrtc" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect agent");
    } finally {
      setConnecting(false);
    }
  };

  const stop = async () => {
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
      <div>
        <Label>Agent ID (optional)</Label>
        <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_..." />
      </div>
      <div className="flex gap-2 items-center">
        {!isConnected ? (
          <Button onClick={start} disabled={connecting}>
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
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
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

// ---------------- ROOT PANEL ----------------
export const ElevenLabsTestPanel = () => {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">ElevenLabs Test Panel</h3>
        <p className="text-sm text-muted-foreground">
          Verify TTS, STT, and Conversational Voice Agent end-to-end using the linked ElevenLabs API key.
        </p>
      </div>
      <Tabs defaultValue="tts">
        <TabsList>
          <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
          <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
          <TabsTrigger value="agent">Voice Agent</TabsTrigger>
        </TabsList>
        <TabsContent value="tts" className="pt-4"><TTSTest /></TabsContent>
        <TabsContent value="stt" className="pt-4"><STTTest /></TabsContent>
        <TabsContent value="agent" className="pt-4"><VoiceAgentTest /></TabsContent>
      </Tabs>
    </Card>
  );
};

export default ElevenLabsTestPanel;

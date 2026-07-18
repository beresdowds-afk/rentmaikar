import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const authRes = await requireAuthenticatedUser(req);
  if (authRes instanceof Response) return authRes;

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured");

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data with an 'audio' file" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) && !(audio instanceof Blob)) {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' file field" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const size = (audio as File).size ?? 0;
    if (size === 0) {
      return new Response(
        JSON.stringify({ error: "Audio file is empty" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Audio file exceeds 25 MiB limit" }),
        { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const languageCode = (form.get("language_code") as string) || "";
    const diarizeRaw = (form.get("diarize") as string) || "true";
    const tagEventsRaw = (form.get("tag_audio_events") as string) || "true";

    const apiForm = new FormData();
    apiForm.append("file", audio, (audio as File).name || "recording.wav");
    apiForm.append("model_id", "scribe_v2");
    apiForm.append("diarize", diarizeRaw);
    apiForm.append("tag_audio_events", tagEventsRaw);
    if (languageCode) apiForm.append("language_code", languageCode);

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: apiForm,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ElevenLabs STT] Error ${response.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: "Transcription failed", status: response.status, details: errText }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[ElevenLabs STT] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

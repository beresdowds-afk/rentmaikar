import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireAuthenticatedUser } from "../_shared/auth-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Region-specific voice IDs
const REGION_VOICES: Record<string, string> = {
  US: "aVwphcJSEW1eYLC622Ru",   // Kevin — Career & Life Coach (Instructor)
  NG: "aVwphcJSEW1eYLC622Ru",   // Kevin — Career & Life Coach (Instructor)
  default: "aVwphcJSEW1eYLC622Ru",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _authRes = await requireAuthenticatedUser(req);
  if (_authRes instanceof Response) return _authRes;


  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const { text, region = "US", voiceId } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Truncate to 5000 chars max
    const safeText = text.slice(0, 5000);
    const selectedVoiceId = voiceId || REGION_VOICES[region] || REGION_VOICES.default;

    console.log(`[ElevenLabs TTS] region=${region}, voiceId=${selectedVoiceId}, chars=${safeText.length}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: safeText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[ElevenLabs TTS] API error ${response.status}: ${errText}`);
      throw new Error(`ElevenLabs API error [${response.status}]: ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[ElevenLabs TTS] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

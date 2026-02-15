import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Classify message type from Twilio fields ───
interface ParsedMessage {
  type: "text" | "image" | "document" | "location" | "interactive" | "button" | "unknown";
  content: string;
  mediaUrl?: string;
  mediaContentType?: string;
  latitude?: string;
  longitude?: string;
  buttonPayload?: string;
}

const parseMessageType = (formData: FormData): ParsedMessage => {
  const body = formData.get("Body") as string || "";
  const numMedia = parseInt(formData.get("NumMedia") as string || "0");
  const latitude = formData.get("Latitude") as string;
  const longitude = formData.get("Longitude") as string;
  const buttonPayload = formData.get("ButtonPayload") as string;

  // Location message
  if (latitude && longitude) {
    return {
      type: "location",
      content: body || `📍 Location: ${latitude}, ${longitude}`,
      latitude,
      longitude,
    };
  }

  // Button/interactive reply
  if (buttonPayload) {
    return {
      type: "button",
      content: body || buttonPayload,
      buttonPayload,
    };
  }

  // Media messages (image or document)
  if (numMedia > 0) {
    const mediaUrl = formData.get("MediaUrl0") as string;
    const mediaContentType = formData.get("MediaContentType0") as string || "";

    if (mediaContentType.startsWith("image/")) {
      return {
        type: "image",
        content: body || "📷 Image",
        mediaUrl,
        mediaContentType,
      };
    }

    // PDF, Word, etc.
    return {
      type: "document",
      content: body || "📄 Document",
      mediaUrl,
      mediaContentType,
    };
  }

  // Default: text
  return { type: "text", content: body };
};

// ─── Handle media: store reference in Supabase storage ───
const processMediaAttachment = async (
  supabase: ReturnType<typeof createClient>,
  mediaUrl: string,
  mediaContentType: string,
  cleanFrom: string,
  messageSid: string,
) => {
  try {
    // Download media from Twilio
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("Twilio credentials missing, skipping media download");
      return { storagePath: null, publicUrl: mediaUrl };
    }

    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      },
    });

    if (!mediaResponse.ok) {
      console.warn("Failed to download media from Twilio:", mediaResponse.status);
      return { storagePath: null, publicUrl: mediaUrl };
    }

    const mediaBlob = await mediaResponse.blob();
    const ext = mediaContentType.includes("pdf") ? "pdf"
      : mediaContentType.includes("image/png") ? "png"
      : mediaContentType.includes("image/jpeg") ? "jpg"
      : mediaContentType.includes("word") ? "docx"
      : "bin";

    const storagePath = `whatsapp/${cleanFrom.replace("+", "")}/${messageSid}.${ext}`;

    // Determine bucket based on type
    const bucket = mediaContentType.startsWith("image/") ? "chat-attachments" : "user-documents";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, mediaBlob, {
        contentType: mediaContentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Storage upload failed:", uploadError.message);
      return { storagePath: null, publicUrl: mediaUrl };
    }

    console.log(`Media uploaded to ${bucket}/${storagePath}`);
    return { storagePath: `${bucket}/${storagePath}`, publicUrl: mediaUrl };
  } catch (err) {
    console.warn("Media processing error:", err);
    return { storagePath: null, publicUrl: mediaUrl };
  }
};

// ─── Handle location: update vehicle tracking if driver ───
const processLocationMessage = async (
  supabase: ReturnType<typeof createClient>,
  cleanFrom: string,
  latitude: string,
  longitude: string,
) => {
  try {
    // Check if the sender is a driver with active rental
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", cleanFrom)
      .single();

    if (!profile) return null;

    const { data: rental } = await supabase
      .from("rentals")
      .select("id, vehicle_id")
      .eq("driver_id", profile.user_id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (rental) {
      // Update IoT device location for the vehicle
      await supabase
        .from("iot_devices")
        .update({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          last_ping: new Date().toISOString(),
        })
        .eq("vehicle_id", rental.vehicle_id);

      console.log(`Location updated for vehicle ${rental.vehicle_id}`);
      return rental.vehicle_id;
    }
    return null;
  } catch (err) {
    console.warn("Location processing error:", err);
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook payload (form-urlencoded)
    const formData = await req.formData();

    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const messageSid = formData.get("MessageSid") as string;
    const accountSid = formData.get("AccountSid") as string;

    // Determine channel type
    const channel = from?.startsWith("whatsapp:") ? "whatsapp" : "sms";
    const cleanFrom = from?.replace("whatsapp:", "");
    const cleanTo = to?.replace("whatsapp:", "");

    // Determine region
    let region = "USA";
    if (cleanFrom?.startsWith("+234") || cleanTo?.startsWith("+234")) {
      region = "NIGERIA";
    }

    // ─── Parse message type ───
    const parsed = parseMessageType(formData);

    console.log("Received message:", {
      from: cleanFrom,
      channel,
      region,
      type: parsed.type,
      content: parsed.content?.substring(0, 50) + "...",
      messageSid,
    });

    // ─── Process media attachments ───
    let mediaMetadata: Record<string, unknown> = {};

    if (parsed.type === "image" || parsed.type === "document") {
      if (parsed.mediaUrl && parsed.mediaContentType) {
        const media = await processMediaAttachment(
          supabase, parsed.mediaUrl, parsed.mediaContentType, cleanFrom, messageSid
        );
        mediaMetadata = {
          message_type: parsed.type,
          media_url: media.publicUrl,
          storage_path: media.storagePath,
          media_content_type: parsed.mediaContentType,
        };
      }
    }

    // ─── Process location messages ───
    if (parsed.type === "location" && parsed.latitude && parsed.longitude) {
      const vehicleId = await processLocationMessage(
        supabase, cleanFrom, parsed.latitude, parsed.longitude
      );
      mediaMetadata = {
        message_type: "location",
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        vehicle_id: vehicleId,
      };
    }

    // ─── Button / interactive metadata ───
    if (parsed.type === "button" || parsed.type === "interactive") {
      mediaMetadata = {
        message_type: parsed.type,
        button_payload: parsed.buttonPayload,
      };
    }

    // ─── Upsert conversation ───
    const { data: existingConversation } = await supabase
      .from("inbox_conversations")
      .select("*")
      .eq("user_phone", cleanFrom)
      .eq("channel", channel)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;

    if (existingConversation) {
      conversationId = existingConversation.id;
      await supabase
        .from("inbox_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } else {
      const { data: newConversation, error: createError } = await supabase
        .from("inbox_conversations")
        .insert({
          channel,
          region,
          user_phone: cleanFrom,
          status: "open",
          priority: parsed.type === "location" ? "high" : "normal",
          subject: `New ${channel.toUpperCase()} ${parsed.type} from ${cleanFrom}`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      conversationId = newConversation.id;
    }

    // ─── Save message ───
    const { error: messageError } = await supabase
      .from("inbox_messages")
      .insert({
        conversation_id: conversationId,
        channel,
        content: parsed.content || "",
        sender_type: "user",
        sender_name: cleanFrom,
        external_id: messageSid,
        metadata: {
          provider: "twilio",
          accountSid,
          rawFrom: from,
          rawTo: to,
          message_type: parsed.type,
          ...mediaMetadata,
        },
      });

    if (messageError) throw messageError;

    console.log(`${parsed.type} message saved successfully`);

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`,
      { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`,
      { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
    );
  }
});

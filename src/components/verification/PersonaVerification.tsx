import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import { toast } from "sonner";

interface Props {
  subject?: "self" | "referee";
  subjectRole?: "driver" | "referee" | "owner" | "support_staff" | "admin_assistant";
  subjectRef?: string;
  fields?: Record<string, string>;
  onComplete?: (inquiryId: string | null) => void;
  buttonLabel?: string;
}

const PERSONA_SDK_URL = "https://cdn.withpersona.com/dist/persona-v5.1.4.js";

function loadPersonaSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Persona) return resolve((window as any).Persona);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PERSONA_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).Persona));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = PERSONA_SDK_URL;
    s.async = true;
    s.onload = () => resolve((window as any).Persona);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** Launches an embedded Persona identity verification session. Region-aware. */
export default function PersonaVerification({
  subject = "self",
  subjectRole,
  subjectRef,
  fields,
  onComplete,
  buttonLabel,
}: Props) {
  const { country } = useRegion();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { loadPersonaSdk().catch(() => {/* fallback to hosted */}); }, []);

  async function start() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("persona-create-inquiry", {
        body: { subject_type: subject, subject_role: subjectRole, subject_ref: subjectRef, region: country, fields },
      });
      if (error) throw error;

      if (data?.provider_configured === false) {
        toast.info("Verification queued — provider will be enabled soon");
        onComplete?.(null);
        return;
      }

      const inquiryId: string | null = data?.inquiry_id ?? data?.inquiry?.inquiry_id ?? null;
      const sessionToken: string | null = data?.session_token ?? null;
      const envId: string | null = data?.environment_id ?? null;
      const hostedUrl: string | undefined = data?.hosted_url;

      const Persona = await loadPersonaSdk().catch(() => null);
      if (Persona && inquiryId) {
        const client = new Persona.Client({
          inquiryId,
          sessionToken: sessionToken ?? undefined,
          environmentId: envId ?? undefined,
          onReady: () => client.open(),
          onComplete: ({ inquiryId: id, status }: any) => {
            setDone(true);
            toast.success(`Verification submitted (${status})`);
            onComplete?.(id ?? inquiryId);
          },
          onCancel: () => {
            toast.info("Verification cancelled");
          },
          onError: (e: any) => {
            console.error("[persona]", e);
            toast.error("Verification error — opening hosted flow");
            if (hostedUrl) window.open(hostedUrl, "_blank", "noopener,noreferrer");
          },
        });
      } else if (hostedUrl) {
        window.open(hostedUrl, "_blank", "noopener,noreferrer");
        toast.success("Verification opened in a new tab");
        onComplete?.(inquiryId);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start verification");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Verification submitted
      </Button>
    );
  }

  return (
    <Button onClick={start} disabled={loading} variant="default">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
      {buttonLabel ?? "Verify identity with Persona"}
    </Button>
  );
}

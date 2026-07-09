import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import { toast } from "sonner";

interface Props {
  subject?: "self" | "referee";
  subjectRef?: string;
  fields?: Record<string, string>;
  onComplete?: (inquiryId: string | null) => void;
}

/** Launches a Persona identity verification session. Region-aware:
 * the edge function picks the correct Persona template for US vs NG. */
export default function PersonaVerification({ subject = "self", subjectRef, fields, onComplete }: Props) {
  const { country } = useRegion();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("persona-create-inquiry", {
        body: { subject_type: subject, subject_ref: subjectRef, region: country, fields },
      });
      if (error) throw error;
      if (data?.hosted_url) {
        window.open(data.hosted_url, "_blank", "noopener,noreferrer");
        toast.success("Verification opened in a new tab");
      } else if (data?.provider_configured === false) {
        toast.info("Verification queued — provider will be enabled soon");
      }
      onComplete?.(data?.inquiry?.inquiry_id ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start verification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={start} disabled={loading} variant="default">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
      Verify identity with Persona
    </Button>
  );
}

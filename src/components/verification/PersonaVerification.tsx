import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, CheckCircle2, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PersonaFieldsFallbackDialog, { type PersonaFieldKey, type PersonaFallbackValues } from "./PersonaFieldsFallbackDialog";
import { UploadDropZone } from "@/components/documents/UploadDropZone";

interface Props {
  subject?: "self" | "referee";
  subjectRole?: "driver" | "referee" | "owner" | "support_staff" | "admin_assistant" | "proxy";
  subjectRef?: string;
  fields?: Record<string, string>;
  onComplete?: (inquiryId: string | null) => void;
  buttonLabel?: string;
}

function splitName(full?: string | null): { name_first?: string; name_last?: string } {
  if (!full) return {};
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { name_first: parts[0] };
  return { name_first: parts.slice(0, -1).join(" "), name_last: parts.slice(-1)[0] };
}

const PERSONA_SDK_URL = "https://cdn.withpersona.com/dist/persona-v5.5.0.js";
const PERSONA_SDK_INTEGRITY =
  "sha384-UK+a2yEU9KOzEmsgI4IlkrXWE4AekM/iAgWF60Zuyule702g7qaQ2nYccO3tnT0A";

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
    s.crossOrigin = "anonymous";
    s.integrity = PERSONA_SDK_INTEGRITY;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<PersonaFieldKey[]>([]);
  const [pendingFields, setPendingFields] = useState<Record<string, string>>({});
  const [dlDocId, setDlDocId] = useState<string | null>(null);
  const [dlChecking, setDlChecking] = useState(false);

  // Drivers MUST present a driver's license in addition to any other
  // identity document. Owners and other roles can choose any accepted doc.
  const requiresDriversLicense = subject === "self" && subjectRole === "driver";

  useEffect(() => { loadPersonaSdk().catch(() => {/* fallback to hosted */}); }, []);

  // Check whether a driver's license has already been uploaded by this user.
  useEffect(() => {
    if (!requiresDriversLicense || !user) return;
    let cancelled = false;
    (async () => {
      setDlChecking(true);
      const { data } = await supabase
        .from("user_documents")
        .select("id")
        .eq("user_id", user.id)
        .eq("document_type", "drivers_license")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setDlDocId((data as any)?.id ?? null);
        setDlChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requiresDriversLicense, user]);

  async function resolveFields(): Promise<Record<string, string>> {
    if (fields && Object.keys(fields).length > 0) return fields;
    if (!user) return {};
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    const { name_first, name_last } = splitName(profile?.full_name ?? (user.user_metadata as any)?.full_name);
    const out: Record<string, string> = {};
    if (name_first) out.name_first = name_first;
    if (name_last) out.name_last = name_last;
    const email = profile?.email ?? user.email ?? undefined;
    if (email) out.email = email;
    const phone = profile?.phone ?? user.phone ?? undefined;
    if (phone) out.phone = phone;
    return out;
  }

  const REQUIRED: PersonaFieldKey[] = ["name_first", "name_last", "email"];

  async function launchInquiry(finalFields: Record<string, string>) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("persona-create-inquiry", {
        body: {
          subject_type: subject,
          subject_role: subjectRole,
          subject_ref: subjectRef,
          region: country,
          fields: finalFields,
          drivers_license_document_id: requiresDriversLicense ? dlDocId : undefined,
        },
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
          onCancel: () => toast.info("Verification cancelled"),
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

  async function notifyPending(phone: string | undefined, channels: { sms: boolean; whatsapp: boolean }) {
    if (!phone || (!channels.sms && !channels.whatsapp)) return;
    try {
      await supabase.functions.invoke("send-sms-notification", {
        body: {
          to: phone,
          type: "verification_code",
          message: "Your Rentmaikar identity verification is in progress. We'll notify you when it's complete.",
          channels: [
            ...(channels.sms ? ["sms"] : []),
            ...(channels.whatsapp ? ["whatsapp"] : []),
          ],
        },
      });
    } catch (e) {
      console.warn("[persona] notify failed", e);
    }
  }

  async function start() {
    if (requiresDriversLicense && !dlDocId) {
      toast.error("Please upload your driver's license before starting verification.");
      return;
    }
    setLoading(true);
    try {
      const resolved = await resolveFields();
      const missing = REQUIRED.filter((k) => !(resolved as any)[k]);
      if (missing.length > 0) {
        setPendingFields(resolved);
        setMissingFields(missing);
        setFallbackOpen(true);
        setLoading(false);
        return;
      }
      await launchInquiry(resolved);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start verification");
      setLoading(false);
    }
  }

  async function handleFallbackConfirm(v: PersonaFallbackValues) {
    setFallbackOpen(false);
    const merged = { ...pendingFields, ...Object.fromEntries(Object.entries(v.fields).filter(([, val]) => !!val)) };
    await notifyPending(merged.phone, v.notify);
    await launchInquiry(merged as Record<string, string>);
  }

  if (done) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Verification submitted
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {requiresDriversLicense && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <IdCard className="h-4 w-4" />
            Driver's license (required for drivers)
          </div>
          <p className="text-xs text-muted-foreground">
            All drivers must upload a valid driver's license in addition to any
            other identity document requested by Persona.
          </p>
          {dlChecking ? (
            <p className="text-xs text-muted-foreground">Checking uploaded documents…</p>
          ) : dlDocId ? (
            <Alert className="border-green-200 bg-green-50 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-xs">
                Driver's license on file. You can start verification.
              </AlertDescription>
            </Alert>
          ) : (
            user && (
              <UploadDropZone
                userId={user.id}
                documentType="drivers_license"
                onUploaded={(id: string) => setDlDocId(id)}
                accept="image/*,application/pdf"
              />
            )
          )}
        </div>
      )}

      <Button
        onClick={start}
        disabled={loading || (requiresDriversLicense && !dlDocId)}
        variant="default"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
        {buttonLabel ?? "Verify identity with Persona"}
      </Button>
      <PersonaFieldsFallbackDialog
        open={fallbackOpen}
        onOpenChange={setFallbackOpen}
        missing={missingFields}
        initial={pendingFields as any}
        onConfirm={handleFallbackConfirm}
      />
    </div>
  );
}

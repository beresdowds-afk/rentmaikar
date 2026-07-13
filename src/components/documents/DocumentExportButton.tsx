// Region-aware document export.
// Bundles the current user's (or a target user's, for admins) uploaded
// identification + vehicle documents into a single ZIP with a manifest.json
// and a manifest.csv for compliance reporting. Files are streamed from
// Supabase Storage via short-lived signed URLs — nothing is proxied through
// an edge function, so 100MB packages remain snappy.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRegion } from "@/contexts/RegionContext";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DocRow {
  id: string;
  user_id: string;
  document_type: string;
  document_category: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  rejection_reason: string | null;
  vehicle_id: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  /** User whose documents to export. Defaults to the signed-in user. Admins can pass any user_id. */
  userId: string;
  /** Restrict to a single vehicle when set (owner vehicle exports). */
  vehicleId?: string;
  /** Human label for the zip filename, e.g. "driver-jane-doe". */
  label?: string;
  /** Small "Export" button style; defaults to outline. */
  variant?: "default" | "outline" | "ghost";
  /** Optional preloaded rows to skip a round-trip. */
  docs?: DocRow[];
}

export const DocumentExportButton = ({
  userId, vehicleId, label, variant = "outline", docs,
}: Props) => {
  const { country } = useRegion();
  const [busy, setBusy] = useState(false);
  const region = country === "Nigeria" ? "NG" : "US";

  const run = async () => {
    setBusy(true);
    try {
      // 1. Load rows if not provided
      let rows: DocRow[] = docs ?? [];
      if (!rows.length) {
        let q = supabase.from("user_documents").select("*").eq("user_id", userId);
        if (vehicleId) q = q.eq("vehicle_id", vehicleId);
        const { data, error } = await q.order("created_at", { ascending: false });
        if (error) throw error;
        rows = (data as DocRow[]) ?? [];
      }
      if (!rows.length) { toast.error("No documents to export."); return; }

      // 2. Sign every file (1 hour). Batch signing avoids sequential round-trips.
      const signed = await Promise.all(rows.map(async (r) => {
        const { data, error } = await supabase.storage
          .from("user-documents").createSignedUrl(r.file_path, 3600);
        return { row: r, url: data?.signedUrl ?? null, error: error?.message ?? null };
      }));

      // 3. Build ZIP: files/<type>_<created>_<origname>, manifest.json, manifest.csv, README.txt
      const zip = new JSZip();
      const filesDir = zip.folder("files")!;
      const manifest: Record<string, unknown>[] = [];
      let downloaded = 0, failed = 0;

      for (const s of signed) {
        const meta = s.row;
        const safeName = sanitize(`${meta.document_type}__${meta.created_at.slice(0, 10)}__${meta.file_name}`);
        const row: Record<string, unknown> = {
          id: meta.id,
          document_type: meta.document_type,
          category: meta.document_category,
          status: meta.status,
          file_name: meta.file_name,
          mime_type: meta.mime_type,
          size_bytes: meta.file_size,
          vehicle_id: meta.vehicle_id,
          expires_at: meta.expires_at,
          uploaded_at: meta.created_at,
          rejection_reason: meta.rejection_reason,
          archive_path: `files/${safeName}`,
        };
        if (!s.url) {
          row.download_error = s.error ?? "no signed url";
          failed++;
        } else {
          try {
            const res = await fetch(s.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            filesDir.file(safeName, blob);
            downloaded++;
          } catch (e) {
            row.download_error = String(e);
            failed++;
          }
        }
        manifest.push(row);
      }

      // 4. Manifest JSON + CSV
      const manifestObj = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        vehicle_id: vehicleId ?? null,
        region,
        totals: { documents: rows.length, downloaded, failed },
        documents: manifest,
      };
      zip.file("manifest.json", JSON.stringify(manifestObj, null, 2));
      zip.file("manifest.csv", toCsv(manifest));
      zip.file("README.txt",
        `Rentmaikar document export\nExported: ${manifestObj.exported_at}\nRegion: ${region}\n` +
        `User: ${userId}${vehicleId ? "\nVehicle: " + vehicleId : ""}\n` +
        `Documents: ${rows.length} (downloaded ${downloaded}, failed ${failed})\n\n` +
        `See manifest.json / manifest.csv for full details.\n`);

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
      saveAs(blob, `rentmaikar-documents-${label ?? userId.slice(0, 8)}-${region}-${stamp}.zip`);

      if (failed > 0) toast.warning(`Export complete — ${failed} file(s) could not be downloaded (see manifest).`);
      else toast.success(`Exported ${downloaded} document(s).`);
    } catch (e) {
      toast.error("Export failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant={variant} onClick={run} disabled={busy}>
      {busy
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Packaging…</>
        : <><Download className="h-4 w-4 mr-2" /> Export documents (ZIP)</>}
    </Button>
  );
};

// ---- helpers ----
function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(rows.reduce((set, r) => {
    Object.keys(r).forEach((k) => set.add(k)); return set;
  }, new Set<string>()));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export default DocumentExportButton;

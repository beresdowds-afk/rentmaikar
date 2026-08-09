import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, mirrors the document upload limit
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS = 8;
const BUCKET = 'vehicle-photos';

interface Props {
  vehicleId: string;
  ownerId: string;
  photoUrls: string[];
  /** Called after the vehicle row has been updated so the parent can refetch. */
  onChange?: (urls: string[]) => void;
  readOnly?: boolean;
}

/** Public URL -> bucket-relative object path (needed for deletes). */
function objectPathOf(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]) || null;
}

export function VehiclePhotoManager({ vehicleId, ownerId, photoUrls, onChange, readOnly }: Props) {
  const [urls, setUrls] = useState<string[]>(photoUrls ?? []);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = async (next: string[]) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ photo_urls: next } as never)
      .eq('id', vehicleId);
    if (error) throw error;
    setUrls(next);
    onChange?.(next);
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    if (urls.length + files.length > MAX_PHOTOS) {
      toast({
        title: 'Too many photos',
        description: `You can keep up to ${MAX_PHOTOS} photos per vehicle.`,
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!ACCEPTED.includes(file.type)) {
          toast({ title: 'Unsupported file', description: `${file.name} must be JPG, PNG or WebP.`, variant: 'destructive' });
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast({ title: 'File too large', description: `${file.name} exceeds 10MB.`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        // Folder must start with the uploader's user id — storage RLS checks it.
        const path = `${ownerId}/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        uploaded.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }
      if (uploaded.length) {
        await persist([...urls, ...uploaded]);
        toast({ title: `${uploaded.length} photo${uploaded.length > 1 ? 's' : ''} uploaded` });
      }
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async (url: string) => {
    setBusy(true);
    try {
      const path = objectPathOf(url);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      await persist(urls.filter((u) => u !== url));
      toast({ title: 'Photo removed' });
    } catch (err: any) {
      toast({ title: 'Could not remove photo', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (url: string) => {
    setBusy(true);
    try {
      await persist([url, ...urls.filter((u) => u !== url)]);
      toast({ title: 'Primary photo updated' });
    } catch (err: any) {
      toast({ title: 'Could not update photo', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {urls.map((url, i) => (
          <div key={url} className="relative group rounded-lg overflow-hidden border bg-muted">
            <img
              src={url}
              alt={`Vehicle photo ${i + 1}`}
              loading="lazy"
              className="h-28 w-full object-cover"
            />
            {i === 0 && (
              <Badge className="absolute top-1 left-1 text-[10px]">Primary</Badge>
            )}
            {!readOnly && (
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1 bg-background/70 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {i !== 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={busy}
                    onClick={() => makePrimary(url)}
                    aria-label="Set as primary photo"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  disabled={busy}
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {!readOnly && urls.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              uploadFiles(Array.from(e.dataTransfer.files || []));
            }}
            disabled={busy}
            className={`h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors ${dragging ? 'border-primary text-primary bg-primary/5' : ''}`}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span>Add photos</span>
            <span className="text-[10px]">Drag & drop or browse</span>
          </button>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="h-3.5 w-3.5 mr-1" />
            Upload vehicle photos
          </Button>
          <span className="text-xs text-muted-foreground">
            JPG, PNG or WebP · up to 10MB each · {urls.length}/{MAX_PHOTOS}
          </span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(Array.from(e.target.files || []))}
      />
    </div>
  );
}

export default VehiclePhotoManager;

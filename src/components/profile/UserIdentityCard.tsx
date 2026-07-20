import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Copy, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Props {
  role?: 'Driver' | 'Owner';
}

export function UserIdentityCard({ role }: Props) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState<string>('');
  const [publicUuid, setPublicUuid] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, public_uuid, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || user.user_metadata?.full_name || '');
        setPublicUuid((data as any).public_uuid || '');
        setAvatarUrl(data.avatar_url || null);
      }
    })();
  }, [user?.id]);

  const initials = (fullName || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/passport-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast({ title: 'Photo updated', description: 'Your passport picture has been saved.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const copyUuid = async () => {
    if (!publicUuid) return;
    await navigator.clipboard.writeText(publicUuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 sm:p-6">
        <div className="relative">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
            <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Upload passport picture"
            className="absolute -bottom-1 -right-1 rounded-full bg-primary text-primary-foreground p-2 shadow-md hover:bg-primary/90 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            <h2 className="text-xl font-semibold truncate">{fullName || 'Unnamed User'}</h2>
            {role && <Badge variant="secondary">{role}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-all">{user?.email}</p>
          <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs text-muted-foreground">User UUID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
              {publicUuid || '—'}
            </code>
            {publicUuid && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyUuid} aria-label="Copy UUID">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
          </div>
          {!avatarUrl && (
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Upload a passport picture anytime — tap the camera icon.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default UserIdentityCard;

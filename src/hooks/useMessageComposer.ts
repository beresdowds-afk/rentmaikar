import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import { toast } from 'sonner';

export type ComposerChannel = 'email' | 'sms' | 'whatsapp';

export interface RecipientOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ComposerDraft {
  id: string;
  channel: ComposerChannel;
  recipientUserId: string | null;
  recipientName: string;
  email: string;
  phone: string;
  subject: string;
  body: string;
  savedAt: string;
}

const DRAFT_KEY = 'rentmaikar_message_drafts';

const readDrafts = (): ComposerDraft[] => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ComposerDraft[]) : [];
  } catch {
    return [];
  }
};

const writeDrafts = (drafts: ComposerDraft[]) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts.slice(0, 50)));
  } catch {
    /* storage unavailable — drafts are best effort */
  }
};

/** Local, per-device drafts for the messaging center composer. */
export const useMessageDrafts = () => {
  const [drafts, setDrafts] = useState<ComposerDraft[]>([]);

  useEffect(() => {
    setDrafts(readDrafts());
  }, []);

  const saveDraft = useCallback((draft: Omit<ComposerDraft, 'id' | 'savedAt'> & { id?: string }) => {
    const entry: ComposerDraft = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    setDrafts((prev) => {
      const next = [entry, ...prev.filter((d) => d.id !== entry.id)];
      writeDrafts(next);
      return next;
    });
    return entry;
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      writeDrafts(next);
      return next;
    });
  }, []);

  return { drafts, saveDraft, deleteDraft };
};

/** Search platform users so staff can pick a recipient instead of typing raw contacts. */
export const useRecipientSearch = (query: string) => {
  const [results, setResults] = useState<RecipientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const like = `%${q.replace(/[%,]/g, '')}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(10);
      if (cancelled) return;
      if (error) console.error('Recipient search failed:', error);
      setResults((data || []) as RecipientOption[]);
      setIsSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, isSearching };
};

/** Bulk audience helper: pull every contact holding a given platform role. */
export const useRoleRecipients = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchByRole = useCallback(async (role: string, limit = 500): Promise<RecipientOption[]> => {
    setIsLoading(true);
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role as never)
        .limit(limit);
      if (roleError) throw roleError;
      const ids = (roleRows || []).map((r) => r.user_id as string);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', ids)
        .limit(limit);
      if (error) throw error;
      return (data || []) as RecipientOption[];
    } catch (err) {
      console.error('Failed to load role recipients:', err);
      toast.error('Could not load that audience');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchByRole, isLoading };
};

export interface SendComposedInput {
  channel: ComposerChannel;
  recipientUserId?: string | null;
  recipientName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  body: string;
}

export interface BulkRecipient {
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface BulkProgress {
  total: number;
  completed: number;
  sent: number;
  failed: number;
  failures?: { recipient: string; reason: string }[];
}

/** Outcome of a single composed send: whether the provider actually took it. */
export interface SendOutcome {
  /** The message row exists in the unified inbox thread. */
  saved: boolean;
  /** The channel provider accepted the message for delivery. */
  delivered: boolean;
  reason?: string;
}

/** inbox_conversations.region only accepts these two values. */
const toConversationRegion = (country: string | undefined, phone: string): 'USA' | 'Nigeria' => {
  if (country === 'USA') return 'USA';
  if (country === 'Nigeria' || country === 'NGN' || country === 'NG') return 'Nigeria';
  return phone.replace(/[^\d+]/g, '').startsWith('+234') ? 'Nigeria' : 'USA';
};

/**
 * Sends an outbound message on any channel, reusing the unified inbox as the
 * single store: it finds or creates the conversation, records the message, then
 * dispatches through the channel's edge function so replies thread back.
 */
export const useSendComposedMessage = () => {
  const { user } = useAuth();
  const { country } = useRegion();
  const [isSending, setIsSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const send = async (
    input: SendComposedInput,
    opts?: { silent?: boolean },
  ): Promise<SendOutcome> => {
    const silent = opts?.silent === true;
    const notifyError = (msg: string) => {
      if (!silent) toast.error(msg);
    };


    const body = input.body.trim();
    if (!body) {
      notifyError('Write a message first');
      return { saved: false, delivered: false, reason: 'Empty message' };
    }
    const email = input.email?.trim() || '';
    const phone = input.phone?.trim() || '';
    if (input.channel === 'email' && !email) {
      notifyError('An email address is required');
      return { saved: false, delivered: false, reason: 'Missing email address' };
    }
    if (input.channel !== 'email' && !phone) {
      notifyError('A phone number is required');
      return { saved: false, delivered: false, reason: 'Missing phone number' };
    }



    setIsSending(true);
    try {
      // ── Find an existing live conversation for this contact + channel ──
      let query = supabase
        .from('inbox_conversations')
        .select('id')
        .eq('channel', input.channel)
        .is('archived_at', null)
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (input.recipientUserId) query = query.eq('user_id', input.recipientUserId);
      else if (input.channel === 'email') query = query.eq('user_email', email);
      else query = query.eq('user_phone', phone);

      const { data: existing } = await query.maybeSingle();
      let conversationId = existing?.id as string | undefined;

      if (!conversationId) {
        const { data: created, error: createError } = await supabase
          .from('inbox_conversations')
          .insert({
            user_id: input.recipientUserId || null,
            user_name: input.recipientName || null,
            user_email: email || null,
            user_phone: phone || null,
            channel: input.channel,
            subject: input.subject?.trim() || 'Message from Rentmaikar',
            status: 'pending',
            priority: 'normal',
            region: toConversationRegion(country, phone),
          })
          .select('id')
          .single();
        if (createError) throw createError;
        conversationId = created.id as string;
      }

      const { error: messageError } = await supabase.from('inbox_messages').insert({
        conversation_id: conversationId,
        sender_type: 'admin',
        sender_id: user?.id ?? null,
        sender_name: 'Rentmaikar Support',
        content: body,
        channel: input.channel,
        is_read: true,
      });
      if (messageError) throw messageError;

      await supabase
        .from('inbox_conversations')
        .update({ last_message_at: new Date().toISOString(), status: 'pending' })
        .eq('id', conversationId);

      // ── Dispatch on the wire ──
      const dispatch =
        input.channel === 'email'
          ? await supabase.functions.invoke('send-email-reply', {
              body: {
                conversationId,
                messageContent: body,
                recipientEmail: email,
                subject: input.subject?.trim() || undefined,
              },
            })
          : await supabase.functions.invoke('send-inbox-reply', {
              body: {
                conversationId,
                messageContent: body,
                channel: input.channel,
                recipientPhone: phone,
              },
            });

      const { data, error } = dispatch;
      if (error || data?.success === false) {
        console.error('Dispatch failed:', error || data);
        const reason =
          (data as { error?: string } | null)?.error ||
          (error as { message?: string } | null)?.message ||
          'Provider rejected the message';
        notifyError(`Saved to the thread, but delivery failed: ${reason}`);
        return { saved: true, delivered: false, reason };
      }

      if (!silent) toast.success(`Message sent via ${input.channel.toUpperCase()}`);
      return { saved: true, delivered: true };
    } catch (err) {
      console.error('Failed to send message:', err);
      const reason = err instanceof Error ? err.message : 'Unknown error';
      notifyError(`Could not send the message: ${reason}`);
      return { saved: false, delivered: false, reason };
    } finally {
      if (!silent) setIsSending(false);
    }
  };


  /**
   * Fan a single composed message out to many recipients, one thread each, so
   * every reply still lands in its own unified-inbox conversation.
   */
  const sendBulk = async (
    recipients: BulkRecipient[],
    input: Omit<SendComposedInput, 'recipientUserId' | 'recipientName' | 'email' | 'phone'>,
  ): Promise<BulkProgress> => {
    const usable = recipients.filter((r) =>
      input.channel === 'email' ? !!r.email?.trim() : !!r.phone?.trim(),
    );
    const skipped = recipients.length - usable.length;

    if (usable.length === 0) {
      toast.error(
        input.channel === 'email'
          ? 'None of the selected contacts have an email address'
          : 'None of the selected contacts have a phone number',
      );
      return { total: recipients.length, completed: 0, sent: 0, failed: recipients.length };
    }

    setIsSending(true);
    setBulkProgress({ total: usable.length, completed: 0, sent: 0, failed: 0 });

    let sent = 0;
    let failed = 0;

    // Sequential dispatch keeps us inside provider rate limits.
    for (const recipient of usable) {
      const ok = await send(
        {
          ...input,
          recipientUserId: recipient.user_id || null,
          recipientName: recipient.full_name || recipient.email || recipient.phone || 'User',
          email: recipient.email || '',
          phone: recipient.phone || '',
        },
        { silent: true },
      );
      if (ok) sent += 1;
      else failed += 1;
      setBulkProgress({ total: usable.length, completed: sent + failed, sent, failed });
    }

    setIsSending(false);

    if (failed === 0) {
      toast.success(
        `Sent to ${sent} recipient${sent === 1 ? '' : 's'} via ${input.channel.toUpperCase()}` +
          (skipped ? ` · ${skipped} skipped (missing contact)` : ''),
      );
    } else {
      toast.warning(`Sent ${sent}, failed ${failed}${skipped ? `, skipped ${skipped}` : ''}`);
    }

    return { total: usable.length, completed: sent + failed, sent, failed };
  };
  return { send, sendBulk, isSending, bulkProgress };

};

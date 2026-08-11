import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  parseMessageAttachments,
  attachmentKind,
  type AttachmentKind,
  type InboxAttachment,
} from '@/lib/inbox-attachments';

export interface AttachmentHit {
  conversationId: string;
  messageId: string;
  createdAt: string;
  attachment: InboxAttachment;
}

interface Options {
  /** 'all' disables attachment filtering entirely. 'any' = has any attachment. */
  kind: AttachmentKind | 'all' | 'any';
  /** Filename / content-type substring search. */
  query: string;
}

/**
 * Scans inbox messages for attachments and resolves which conversations
 * contain files matching the selected type and filename search.
 */
export const useInboxAttachmentSearch = ({ kind, query }: Options) => {
  const [hits, setHits] = useState<AttachmentHit[]>([]);
  const [conversationIds, setConversationIds] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const active = kind !== 'all' || query.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    if (!active) {
      setHits([]);
      setConversationIds(null);
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inbox_messages')
        .select('id, conversation_id, created_at, metadata')
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (cancelled) return;

      if (error) {
        console.error('Attachment search failed:', error);
        setHits([]);
        setConversationIds([]);
        setIsLoading(false);
        return;
      }

      const q = query.trim().toLowerCase();
      const found: AttachmentHit[] = [];

      (data || []).forEach((m) => {
        parseMessageAttachments(m.metadata).forEach((attachment) => {
          const matchesKind =
            kind === 'all' || kind === 'any' || attachmentKind(attachment) === kind;
          if (!matchesKind) return;
          if (
            q &&
            !attachment.name.toLowerCase().includes(q) &&
            !attachment.contentType.toLowerCase().includes(q)
          ) {
            return;
          }
          found.push({
            conversationId: m.conversation_id as string,
            messageId: m.id as string,
            createdAt: m.created_at as string,
            attachment,
          });
        });
      });

      setHits(found);
      setConversationIds([...new Set(found.map((h) => h.conversationId))]);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [active, kind, query]);

  return { hits, conversationIds, isLoading, isActive: active };
};

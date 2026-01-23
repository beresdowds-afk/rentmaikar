import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContactSetting {
  id: string;
  region: string;
  contact_type: string;
  contact_value: string;
  is_active: boolean;
  display_name: string | null;
  updated_at: string;
}

export interface InboxConversation {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  channel: string;
  region: string;
  subject: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  last_message_at: string;
  created_at: string;
  unread_count?: number;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  channel: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  external_id?: string | null;
  metadata?: unknown;
}

export const useContactSettings = () => {
  const [settings, setSettings] = useState<ContactSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contact_settings')
      .select('*')
      .order('region', { ascending: true })
      .order('contact_type', { ascending: true });

    if (error) {
      console.error('Error fetching contact settings:', error);
      toast.error('Failed to load contact settings');
    } else {
      setSettings(data || []);
    }
    setIsLoading(false);
  };

  const updateSetting = async (id: string, updates: Partial<ContactSetting>) => {
    const { error } = await supabase
      .from('contact_settings')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating contact setting:', error);
      toast.error('Failed to update contact setting');
      return false;
    }
    
    toast.success('Contact setting updated');
    await fetchSettings();
    return true;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, isLoading, fetchSettings, updateSetting };
};

export const useInboxConversations = () => {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('inbox_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (channelFilter !== 'all') {
      query = query.eq('channel', channelFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } else {
      setConversations(data || []);
    }
    setIsLoading(false);
  }, [statusFilter, channelFilter]);

  const updateConversation = async (id: string, updates: Partial<InboxConversation>) => {
    const { error } = await supabase
      .from('inbox_conversations')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating conversation:', error);
      toast.error('Failed to update conversation');
      return false;
    }
    
    await fetchConversations();
    return true;
  };

  // Real-time subscription for conversations
  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('inbox_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_conversations',
        },
        (payload) => {
          console.log('Conversation change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as InboxConversation;
            setConversations(prev => [newConv, ...prev]);
            toast.info(`New ${newConv.channel} message received`, {
              description: newConv.subject || 'New conversation',
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as InboxConversation;
            setConversations(prev => 
              prev.map(c => c.id === updatedConv.id ? updatedConv : c)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setConversations(prev => prev.filter(c => c.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, channelFilter, fetchConversations]);

  return { 
    conversations, 
    isLoading, 
    fetchConversations, 
    updateConversation,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter
  };
};

export const useInboxMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } else {
      setMessages(data || []);
      
      // Mark unread messages as read
      const unreadIds = (data || [])
        .filter(m => !m.is_read && m.sender_type === 'user')
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('inbox_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    }
    setIsLoading(false);
  }, [conversationId]);

  const sendMessage = async (content: string, channel: string, recipientPhone?: string | null, recipientEmail?: string | null) => {
    if (!conversationId || !user) return false;

    // First, save the message to the database
    const { error } = await supabase
      .from('inbox_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'admin',
        sender_id: user.id,
        sender_name: 'Rentmaikar Support',
        content,
        channel,
        is_read: true,
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }

    // Update conversation last_message_at
    await supabase
      .from('inbox_conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        status: 'pending'
      })
      .eq('id', conversationId);

    // Send via external channel (SMS/WhatsApp/Email)
    if (channel === 'sms' || channel === 'whatsapp') {
      if (recipientPhone) {
        setIsSendingReply(true);
        try {
          const { data, error: sendError } = await supabase.functions.invoke('send-inbox-reply', {
            body: {
              conversationId,
              messageContent: content,
              channel,
              recipientPhone,
            },
          });

          if (sendError) {
            console.error('Error sending reply via Twilio:', sendError);
            toast.warning('Message saved but delivery may be delayed');
          } else if (data?.success) {
            toast.success(`Reply sent via ${channel.toUpperCase()}`);
          }
        } catch (err) {
          console.error('Failed to send via Twilio:', err);
          toast.warning('Message saved but external delivery failed');
        } finally {
          setIsSendingReply(false);
        }
      }
    } else if (channel === 'email' && recipientEmail) {
      setIsSendingReply(true);
      try {
        const { data, error: sendError } = await supabase.functions.invoke('send-email-reply', {
          body: {
            conversationId,
            messageContent: content,
            recipientEmail,
          },
        });

        if (sendError) {
          console.error('Error sending reply via email:', sendError);
          toast.warning('Message saved but email delivery may be delayed');
        } else if (data?.success) {
          toast.success('Email reply sent');
        }
      } catch (err) {
        console.error('Failed to send email:', err);
        toast.warning('Message saved but email delivery failed');
      } finally {
        setIsSendingReply(false);
      }
    } else {
      toast.success('Message sent');
    }
    
    await fetchMessages();
    return true;
  };

  // Real-time subscription for messages
  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to realtime changes for this conversation
    const channel = supabase
      .channel(`inbox_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message:', payload);
          const newMessage = payload.new as InboxMessage;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if from user
          if (newMessage.sender_type === 'user') {
            supabase
              .from('inbox_messages')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  return { messages, isLoading, isSendingReply, fetchMessages, sendMessage };
};

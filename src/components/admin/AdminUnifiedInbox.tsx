import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Inbox, 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  Loader2, 
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { useInboxConversations, useInboxMessages, InboxConversation } from '@/hooks/useUnifiedInbox';
import { format, formatDistanceToNow } from 'date-fns';

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle,
  closed: XCircle,
};

const statusColors = {
  open: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  pending: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-orange-500/10 text-orange-600',
  urgent: 'bg-destructive/10 text-destructive',
};

const ConversationItem = ({ 
  conversation, 
  isSelected, 
  onClick 
}: { 
  conversation: InboxConversation; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  const ChannelIcon = channelIcons[conversation.channel as keyof typeof channelIcons] || Mail;
  const StatusIcon = statusIcons[conversation.status as keyof typeof statusIcons] || AlertCircle;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ChannelIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">
            {conversation.user_name || conversation.user_email || 'Unknown User'}
          </span>
        </div>
        <Badge variant="outline" className={priorityColors[conversation.priority as keyof typeof priorityColors]}>
          {conversation.priority}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mt-1 truncate">
        {conversation.subject || 'No subject'}
      </p>
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${statusColors[conversation.status as keyof typeof statusColors]}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {conversation.status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {conversation.region}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
};

const MessageThread = ({ 
  conversation,
  onUpdateStatus
}: { 
  conversation: InboxConversation;
  onUpdateStatus: (status: string) => void;
}) => {
  const { messages, isLoading, isSendingReply, sendMessage } = useInboxMessages(conversation.id);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    const success = await sendMessage(
      newMessage, 
      conversation.channel,
      conversation.user_phone,
      conversation.user_email
    );
    if (success) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const ChannelIcon = channelIcons[conversation.channel as keyof typeof channelIcons] || Mail;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">
                {conversation.user_name || conversation.user_email || 'Unknown User'}
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChannelIcon className="h-3 w-3" />
                {conversation.channel === 'email' ? conversation.user_email : conversation.user_phone}
              </div>
            </div>
          </div>
          <Select value={conversation.status} onValueChange={onUpdateStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {conversation.subject && (
          <p className="mt-2 text-sm font-medium">{conversation.subject}</p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages in this conversation
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender_type === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className={`text-xs mt-1 ${
                    message.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {format(new Date(message.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Reply via ${conversation.channel}...`}
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {isSendingReply ? 'Delivering message...' : 'Press Ctrl+Enter to send'}
          </span>
          <Button onClick={handleSend} disabled={!newMessage.trim() || isSending || isSendingReply}>
            {(isSending || isSendingReply) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send via {conversation.channel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AdminUnifiedInbox = () => {
  const { 
    conversations, 
    isLoading, 
    updateConversation,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter
  } = useInboxConversations();
  
  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedConversation) return;
    await updateConversation(selectedConversation.id, { status });
    setSelectedConversation({ ...selectedConversation, status });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Unified Inbox
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage customer conversations from all channels in one place
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
          {/* Conversation List */}
          <div className="border-r">
            <div className="p-3 border-b bg-muted/30">
              <Input placeholder="Search conversations..." className="h-8" />
            </div>
            <ScrollArea className="h-[552px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Messages from customers will appear here</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversation?.id === conv.id}
                    onClick={() => setSelectedConversation(conv)}
                  />
                ))
              )}
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div className="col-span-2">
            {selectedConversation ? (
              <MessageThread 
                conversation={selectedConversation}
                onUpdateStatus={handleUpdateStatus}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminUnifiedInbox;

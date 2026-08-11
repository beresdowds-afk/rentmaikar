import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  Filter,
  Flag,
  Archive,
  MailOpen,
  MailQuestion,
  UserCheck,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Music

} from 'lucide-react';
import { useInboxConversations, useInboxMessages, useInboxStaff, InboxConversation, InboxStaff } from '@/hooks/useUnifiedInbox';
import { format, formatDistanceToNow } from 'date-fns';

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
  facebook_messenger: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  google_chat: MessageCircle,
  tiktok: Music,
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
  onClick,
  onToggleFlag,
  onArchive,
  onMarkRead,
  isChecked,
  onCheckedChange,
}: {
  conversation: InboxConversation;
  isSelected: boolean;
  onClick: () => void;
  onToggleFlag: () => void;
  onArchive: () => void;
  onMarkRead: (read: boolean) => void;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  const ChannelIcon = channelIcons[conversation.channel as keyof typeof channelIcons] || Mail;
  const StatusIcon = statusIcons[conversation.status as keyof typeof statusIcons] || AlertCircle;
  const unread = conversation.unread_count || 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className={`w-full text-left p-4 border-b transition-colors hover:bg-muted/50 cursor-pointer ${
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span onClick={(e) => e.stopPropagation()} className="flex items-center">
            <Checkbox
              checked={isChecked}
              onCheckedChange={(v) => onCheckedChange(v === true)}
              aria-label="Select conversation"
            />
          </span>

          <ChannelIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className={`truncate ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>
            {conversation.user_name || conversation.user_email || 'Unknown User'}
          </span>
          {unread > 0 && (
            <Badge className="h-5 px-1.5 text-[10px]">{unread}</Badge>
          )}
          {conversation.is_flagged && <Flag className="h-3.5 w-3.5 text-orange-500" />}
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

      <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onToggleFlag}>
          <Flag className="h-3.5 w-3.5 mr-1" />
          {conversation.is_flagged ? 'Unflag' : 'Flag'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onMarkRead(unread > 0)}>
          {unread > 0 ? <MailOpen className="h-3.5 w-3.5 mr-1" /> : <MailQuestion className="h-3.5 w-3.5 mr-1" />}
          {unread > 0 ? 'Mark read' : 'Mark unread'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onArchive}>
          <Archive className="h-3.5 w-3.5 mr-1" />
          {conversation.archived_at ? 'Restore' : 'Archive'}
        </Button>
      </div>
    </div>
  );
};


const MessageThread = ({ 
  conversation,
  onUpdateStatus,
  staff,
  onAssign,
  onToggleFlag,
  onArchive,
  onMarkRead,
}: { 
  conversation: InboxConversation;
  onUpdateStatus: (status: string) => void;
  staff: InboxStaff[];
  onAssign: (userId: string | null) => void;
  onToggleFlag: () => void;
  onArchive: () => void;
  onMarkRead: (read: boolean) => void;
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
          <div className="flex items-center gap-2">
            <Button size="sm" variant={conversation.is_flagged ? 'default' : 'outline'} onClick={onToggleFlag}>
              <Flag className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMarkRead((conversation.unread_count || 0) > 0)}>
              {(conversation.unread_count || 0) > 0 ? <MailOpen className="h-4 w-4" /> : <MailQuestion className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={onArchive}>
              <Archive className="h-4 w-4" />
            </Button>
            <Select
              value={conversation.assigned_to ?? 'unassigned'}
              onValueChange={(v) => onAssign(v === 'unassigned' ? null : v)}
            >
              <SelectTrigger className="w-40">
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Delegate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    toggleFlag,
    setArchived,
    assignConversation,
    markConversationRead,
    bulkSetFlag,
    bulkSetArchived,
    bulkAssign,
    bulkMarkRead,
    bulkSetStatus,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    showArchived,
    setShowArchived,
    flaggedOnly,
    setFlaggedOnly,
  } = useInboxConversations();
  const staff = useInboxStaff();

  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const current = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation.id) ?? selectedConversation
    : null;

  const visibleIds = conversations.map((c) => c.id);
  const checkedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allVisibleChecked = visibleIds.length > 0 && checkedVisibleIds.length === visibleIds.length;

  const toggleSelected = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));

  const toggleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? [...new Set([...selectedIds, ...visibleIds])] : selectedIds.filter((id) => !visibleIds.includes(id)));

  const runBulk = async (action: () => Promise<unknown>) => {
    await action();
    setSelectedIds([]);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!current) return;
    await updateConversation(current.id, { status });
    setSelectedConversation({ ...current, status });
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
              <SelectItem value="facebook_messenger">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="google_chat">Google Chat</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 h-[600px] xl:h-[min(760px,72dvh)]">
          {/* Conversation List */}
          <div className="border-r xl:col-span-2">
            <div className="p-3 border-b bg-muted/30 space-y-2">
              <Input
                placeholder="Search conversations..."
                className="h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allVisibleChecked}
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  aria-label="Select all conversations"
                />
                <Button
                  size="sm"
                  variant={flaggedOnly ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => setFlaggedOnly(!flaggedOnly)}
                >
                  <Flag className="h-3.5 w-3.5 mr-1" /> Flagged
                </Button>
                <Button
                  size="sm"
                  variant={showArchived ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <Archive className="h-3.5 w-3.5 mr-1" /> Archived
                </Button>
              </div>

              {checkedVisibleIds.length > 0 && (
                <div className="rounded-md border bg-background p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{checkedVisibleIds.length} selected</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSelectedIds([])}>
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runBulk(() => bulkMarkRead(checkedVisibleIds, true))}>
                      <MailOpen className="h-3.5 w-3.5 mr-1" /> Read
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runBulk(() => bulkMarkRead(checkedVisibleIds, false))}>
                      <MailQuestion className="h-3.5 w-3.5 mr-1" /> Unread
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runBulk(() => bulkSetFlag(checkedVisibleIds, true))}>
                      <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runBulk(() => bulkSetFlag(checkedVisibleIds, false))}>
                      <Flag className="h-3.5 w-3.5 mr-1" /> Unflag
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runBulk(() => bulkSetArchived(checkedVisibleIds, !showArchived))}>
                      <Archive className="h-3.5 w-3.5 mr-1" /> {showArchived ? 'Restore' : 'Archive'}
                    </Button>
                    <Select onValueChange={(v) => runBulk(() => bulkAssign(checkedVisibleIds, v === 'unassigned' ? null : v))}>
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        <SelectValue placeholder="Delegate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select onValueChange={(v) => runBulk(() => bulkSetStatus(checkedVisibleIds, v))}>
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <ScrollArea className="h-[calc(600px-160px)] xl:h-[calc(min(760px,72dvh)-160px)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{showArchived ? 'No archived conversations' : 'No conversations yet'}</p>
                  <p className="text-xs mt-1">Messages from customers will appear here</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={current?.id === conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    onToggleFlag={() => toggleFlag(conv)}
                    onArchive={() => setArchived(conv, !conv.archived_at)}
                    onMarkRead={(read) => markConversationRead(conv.id, read)}
                    isChecked={selectedIds.includes(conv.id)}
                    onCheckedChange={(checked) => toggleSelected(conv.id, checked)}
                  />
                ))
              )}
            </ScrollArea>

          </div>

          {/* Message Thread */}
          <div className="col-span-2 xl:col-span-3">

            {current ? (
              <MessageThread 
                conversation={current}
                onUpdateStatus={handleUpdateStatus}
                staff={staff}
                onAssign={(userId) => assignConversation(current.id, userId)}
                onToggleFlag={() => toggleFlag(current)}
                onArchive={() => setArchived(current, !current.archived_at)}
                onMarkRead={(read) => markConversationRead(current.id, read)}
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

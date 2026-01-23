import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSupportChat } from '@/hooks/useSupportChat';
import { format } from 'date-fns';

const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    isSending,
    unreadCount,
    sendMessage,
  } = useSupportChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isOpen && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    const content = message;
    setMessage('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleOpen = () => {
    if (isOpen && !isMinimized) {
      setIsOpen(false);
    } else if (isOpen && isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "bg-card border border-border rounded-xl shadow-2xl transition-all duration-300 overflow-hidden",
            isMinimized ? "w-64 h-12" : "w-80 sm:w-96 h-[28rem]"
          )}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Support Chat</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <MinusCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="h-[calc(100%-8rem)] p-4" ref={scrollRef}>
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Need help? Send us a message and we'll get back to you as soon as possible.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          msg.sender_type === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-sm",
                            msg.sender_type === 'user'
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border bg-background/50">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="min-h-[2.5rem] max-h-20 resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || isSending}
                    className="shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Press Ctrl+Enter to send
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={toggleOpen}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105",
          isOpen ? "bg-muted hover:bg-muted/80 text-foreground" : "bg-primary hover:bg-primary/90"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
        )}
      </Button>
    </div>
  );
};

export default SupportChatWidget;

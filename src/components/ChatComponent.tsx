import React, { useEffect, useRef } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { MessageCircle, Users } from 'lucide-react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useChatMessages } from '../hooks/useChatMessages';
import { useAuth } from '../hooks/useAuth';

const ChatComponent: React.FC = () => {
  const { user } = useAuth();
  const { messages, profiles, loading, sendMessage, parseMentions } = useChatMessages();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Accedi per usare la chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <MessageCircle className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h3 className="font-semibold">Chat di Lavoro</h3>
          <p className="text-xs text-muted-foreground">
            I messaggi si cancellano dopo 24 ore
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{profiles.length}</span>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Caricamento messaggi...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nessun messaggio ancora</p>
              <p className="text-xs mt-1">Inizia una conversazione!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={user.id}
                isOwnMessage={message.sender_id === user.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendMessage}
        profiles={profiles}
        parseMentions={parseMentions}
        disabled={loading}
      />
    </div>
  );
};

export default ChatComponent;
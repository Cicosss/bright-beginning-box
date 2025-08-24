import React, { useState, FormEvent } from 'react';
import { MessageCircle, Users, Send } from 'lucide-react';
import { Button } from './ui/button';
import { ChatMessageList } from './ui/chat-message-list';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from './ui/chat-bubble';
import { ChatInput } from './ui/chat-input';
import { useChatMessages } from '../hooks/useChatMessages';
import { useAuth } from '../hooks/useAuth';
import UserMentionDropdown from './UserMentionDropdown';

const ChatComponent: React.FC = () => {
  const { user } = useAuth();
  const { messages, profiles, loading, sendMessage, parseMentions } = useChatMessages();
  
  // State for message input
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // State for mention dropdown
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Render message content with highlighted mentions
  const renderMessageContent = (content: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) {
      return content;
    }

    let processedContent = content;
    mentions.forEach(mentionName => {
      const mentionText = `@${mentionName}`;
      const regex = new RegExp(`@${mentionName}`, 'gi');
      processedContent = processedContent.replace(regex, 
        `<span class="bg-primary/20 text-primary font-semibold px-1 rounded">${mentionText}</span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
  };

  // Handle input change and detect mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setInput(value);
    setCursorPosition(cursorPos);

    // Check for mention trigger (@)
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentionDropdown(true);
      
      // Calculate position for dropdown (simplified)
      const rect = e.target.getBoundingClientRect();
      setMentionPosition({
        top: rect.bottom,
        left: rect.left + (mentionMatch.index || 0) * 8
      });
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Handle user selection from mention dropdown
  const handleSelectUser = (profile: { id: string; name: string }) => {
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    
    // Find the @ symbol position
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    
    if (mentionStart !== -1) {
      const newText = 
        textBeforeCursor.substring(0, mentionStart) + 
        `@${profile.name} ` + 
        textAfterCursor;
      
      setInput(newText);
      setShowMentionDropdown(false);
      
      // Focus back to textarea
      setTimeout(() => {
        const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
        if (textarea) {
          const newCursorPos = mentionStart + profile.name.length + 2;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    
    try {
      const { content, mentionedUserIds } = parseMentions(input);
      const result = await sendMessage(content, mentionedUserIds);
      
      if (result.success) {
        setInput("");
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key down for submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

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
      <div className="flex-1 overflow-hidden">
        <ChatMessageList>
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
            <>
              {messages.map((message) => {
                const profile = profiles.find(p => p.id === message.sender_id);
                const isOwnMessage = message.sender_id === user.id;
                
                return (
                  <React.Fragment key={message.id}>
                    <ChatBubble
                      variant={isOwnMessage ? "sent" : "received"}
                    >
                      <ChatBubbleAvatar
                        src={profile?.avatar_url}
                        fallback={profile?.name?.charAt(0).toUpperCase() || 'U'}
                        className="h-8 w-8 shrink-0"
                      />
                      <div className="flex flex-col max-w-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {profile?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        <ChatBubbleMessage variant={isOwnMessage ? "sent" : "received"}>
                          {renderMessageContent(message.content, message.mentions)}
                        </ChatBubbleMessage>
                      </div>
                    </ChatBubble>
                  </React.Fragment>
                );
              })}
              
              {isSending && (
                <ChatBubble variant="received">
                  <ChatBubbleAvatar
                    src={user?.user_metadata?.avatar_url}
                    fallback="..."
                    className="h-8 w-8 shrink-0"
                  />
                  <ChatBubbleMessage isLoading />
                </ChatBubble>
              )}
            </>
          )}
        </ChatMessageList>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t relative">
        <UserMentionDropdown
          profiles={profiles}
          searchQuery={mentionQuery}
          onSelectUser={handleSelectUser}
          isVisible={showMentionDropdown}
          position={mentionPosition}
        />
        
        <form
          onSubmit={handleSubmit}
          className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
        >
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio... (usa @ per menzionare)"
            className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
            disabled={isSending}
          />
          
          <div className="flex items-center p-3 pt-0 justify-end">
            <Button 
              type="submit" 
              size="sm" 
              className="ml-auto gap-1.5"
              disabled={!input.trim() || isSending}
            >
              {isSending ? 'Invio...' : 'Invia'}
              <Send className="size-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatComponent;
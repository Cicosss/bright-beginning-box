import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send } from 'lucide-react';
import UserMentionDropdown from './UserMentionDropdown';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface MessageInputProps {
  onSendMessage: (content: string, mentionedUsers: string[]) => Promise<{ success: boolean; error?: any }>;
  profiles: Profile[];
  parseMentions: (content: string) => { content: string; mentionedUserIds: string[] };
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  profiles,
  parseMentions,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setMessage(value);
    setCursorPosition(cursorPos);

    // Check for @ mentions
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're still in a mention (no spaces after @)
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);

  const handleSelectUser = useCallback((user: Profile) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newMessage = 
        textBeforeCursor.substring(0, lastAtIndex) + 
        `@${user.name} ` + 
        textAfterCursor;
      
      setMessage(newMessage);
      setShowMentions(false);
      
      // Focus back to textarea
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = lastAtIndex + user.name.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }, [message, cursorPosition]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    
    try {
      const { content, mentionedUserIds } = parseMentions(message.trim());
      const result = await onSendMessage(content, mentionedUserIds);
      
      if (result.success) {
        setMessage('');
        setShowMentions(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  }, [message, sending, parseMentions, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const getMentionDropdownPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };
    
    const rect = textarea.getBoundingClientRect();
    return {
      top: rect.top - 10,
      left: rect.left
    };
  }, []);

  return (
    <div className="relative border-t border-border p-4 bg-background">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio... (usa @ per menzionare utenti)"
            className="min-h-[40px] max-h-[120px] resize-none pr-4"
            disabled={disabled || sending}
          />
          
          <UserMentionDropdown
            profiles={profiles}
            searchQuery={mentionQuery}
            onSelectUser={handleSelectUser}
            isVisible={showMentions}
            position={getMentionDropdownPosition()}
          />
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          size="sm"
          className="px-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
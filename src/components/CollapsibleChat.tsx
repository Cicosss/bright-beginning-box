import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import ChatComponent from './ChatComponent';
import { useChatMessages } from '../hooks/useChatMessages';
import { useAuth } from '../hooks/useAuth';

interface UnreadMessage {
  id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

const CollapsibleChat: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string>(new Date().toISOString());
  const { user } = useAuth();
  const { messages } = useChatMessages();
  const prevMessagesLengthRef = useRef(messages.length);

  // Monitor new messages when chat is collapsed
  useEffect(() => {
    if (isCollapsed && messages.length > prevMessagesLengthRef.current) {
      // New messages arrived while chat is collapsed
      const newMessages = messages.slice(prevMessagesLengthRef.current);
      const newUnreadMessages = newMessages
        .filter(msg => msg.sender_id !== user?.id && new Date(msg.created_at) > new Date(lastReadTimestamp))
        .map(msg => ({
          id: msg.id,
          sender_name: msg.sender_name || 'Unknown User',
          content: msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content,
          created_at: msg.created_at
        }));

      if (newUnreadMessages.length > 0) {
        setUnreadMessages(prev => [...prev, ...newUnreadMessages]);
        
        // Show browser notification if supported
        if (Notification.permission === 'granted') {
          const latestMessage = newUnreadMessages[newUnreadMessages.length - 1];
          new Notification(`Nuovo messaggio da ${latestMessage.sender_name}`, {
            body: latestMessage.content,
            icon: '/favicon.ico'
          });
        }
      }
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isCollapsed, user?.id, lastReadTimestamp]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleToggleCollapse = () => {
    if (isCollapsed) {
      // Expanding - mark all messages as read
      setUnreadMessages([]);
      setLastReadTimestamp(new Date().toISOString());
    }
    setIsCollapsed(!isCollapsed);
  };

  const dismissNotification = (messageId: string) => {
    setUnreadMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const dismissAllNotifications = () => {
    setUnreadMessages([]);
  };

  return (
    <div className="relative">
      {/* Notification badges when collapsed */}
      {isCollapsed && unreadMessages.length > 0 && (
        <div className="absolute bottom-16 right-4 space-y-2 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {unreadMessages.length} nuovi messaggi
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissAllNotifications}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          {unreadMessages.slice(-3).reverse().map((message) => (
            <div
              key={message.id}
              className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[280px] max-w-[320px] chat-notification"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">
                      {message.sender_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{message.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(message.id)}
                  className="h-6 w-6 p-0 ml-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          
          {unreadMessages.length > 3 && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleCollapse}
                className="text-xs"
              >
                Vedi tutti i {unreadMessages.length} messaggi
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chat header with collapse button */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Chat di Lavoro</h3>
          {unreadMessages.length > 0 && (
            <div className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center notification-badge">
              {unreadMessages.length}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="p-2"
        >
          {isCollapsed ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Chat content with animation */}
      <div className={`
        transition-all duration-300 ease-out overflow-hidden
        ${isCollapsed ? 'h-0 opacity-0' : 'h-80 opacity-100'}
      `}>
        <div className="h-80 bg-white dark:bg-gray-800">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
};

export default CollapsibleChat;
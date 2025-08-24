import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender_name?: string;
    sender_avatar?: string;
    created_at: string;
    mentions?: string[];
  };
  currentUserId?: string;
  isOwnMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwnMessage 
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessageContent = (content: string, mentions: string[] = []) => {
    let processedContent = content;
    
    // Highlight mentions
    mentions.forEach(mentionName => {
      const mentionRegex = new RegExp(`@${mentionName}`, 'gi');
      processedContent = processedContent.replace(
        mentionRegex,
        `<span class="bg-primary/20 text-primary px-1 rounded font-medium">@${mentionName}</span>`
      );
    });

    return { __html: processedContent };
  };

  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.sender_avatar} />
        <AvatarFallback className="text-xs bg-muted">
          {message.sender_name?.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {message.sender_name || 'Unknown User'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
        </div>
        
        <div className={`
          px-3 py-2 rounded-lg text-sm break-words
          ${isOwnMessage 
            ? 'bg-primary text-primary-foreground rounded-br-sm' 
            : 'bg-muted text-foreground rounded-bl-sm'
          }
        `}>
          <div 
            dangerouslySetInnerHTML={renderMessageContent(message.content, message.mentions)}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
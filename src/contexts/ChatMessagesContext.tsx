import React, { createContext, useContext, ReactNode } from 'react';
import { useChatMessages } from '../hooks/useChatMessages';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  sender_avatar?: string;
  mentions?: string[];
}

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface ChatMessagesContextType {
  messages: ChatMessage[];
  profiles: Profile[];
  loading: boolean;
  sendMessage: (content: string, mentionedUsers?: string[]) => Promise<{ success: boolean; error?: any }>;
  parseMentions: (content: string) => { content: string; mentionedUserIds: string[] };
}

const ChatMessagesContext = createContext<ChatMessagesContextType | null>(null);

export const useChatMessagesContext = () => {
  const context = useContext(ChatMessagesContext);
  if (context === null) {
    throw new Error('useChatMessagesContext must be used within ChatMessagesProvider');
  }
  return context;
};

interface ChatMessagesProviderProps {
  children: ReactNode;
}

export const ChatMessagesProvider: React.FC<ChatMessagesProviderProps> = ({ children }) => {
  const chatData = useChatMessages();

  // Ensure we always provide a valid context value
  const contextValue: ChatMessagesContextType = {
    messages: chatData.messages || [],
    profiles: chatData.profiles || [],
    loading: chatData.loading || false,
    sendMessage: chatData.sendMessage,
    parseMentions: chatData.parseMentions
  };

  return (
    <ChatMessagesContext.Provider value={contextValue}>
      {children}
    </ChatMessagesContext.Provider>
  );
};
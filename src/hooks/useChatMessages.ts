import { useState, useEffect, useCallback } from 'react';
import { supabase } from "../integrations/supabase/client";

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

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all user profiles for mentions - optimized with no dependencies
  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }, []);

  // Optimized query to fetch messages with batched mention queries
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch messages and senders in parallel  
      const [messagesResponse, allProfilesResponse] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, name, avatar_url')
      ]);

      if (messagesResponse.error) throw messagesResponse.error;
      if (allProfilesResponse.error) throw allProfilesResponse.error;

      const messagesData = messagesResponse.data || [];
      const allProfiles = allProfilesResponse.data || [];

      // Batch fetch all mentions for all messages in one query
      const messageIds = messagesData.map(m => m.id);
      const { data: allMentions } = messageIds.length > 0 
        ? await supabase
            .from('message_mentions')
            .select('message_id, mentioned_user_id')
            .in('message_id', messageIds)
        : { data: [] };

      // Group mentions by message_id for efficient lookup
      const mentionsByMessage = (allMentions || []).reduce((acc, mention) => {
        if (!acc[mention.message_id]) acc[mention.message_id] = [];
        acc[mention.message_id].push(mention.mentioned_user_id);
        return acc;
      }, {} as Record<string, string[]>);

      // Transform messages with sender and mention info
      const transformedMessages = messagesData.map(message => {
        const senderProfile = allProfiles.find(p => p.id === message.sender_id);
        const mentionedUserIds = mentionsByMessage[message.id] || [];
        const mentionNames = mentionedUserIds
          .map(id => allProfiles.find(p => p.id === id)?.name)
          .filter(Boolean);
        
        return {
          ...message,
          sender_name: senderProfile?.name || 'Unknown User',
          sender_avatar: senderProfile?.avatar_url,
          mentions: mentionNames
        };
      });

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a new message - optimized 
  const sendMessage = useCallback(async (content: string, mentionedUsers: string[] = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert the message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: user.id
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Insert mentions if any
      if (mentionedUsers.length > 0 && messageData) {
        const mentionInserts = mentionedUsers.map(userId => ({
          message_id: messageData.id,
          mentioned_user_id: userId
        }));

        const { error: mentionsError } = await supabase
          .from('message_mentions')
          .insert(mentionInserts);

        if (mentionsError) throw mentionsError;
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  }, []);

  // Parse @mentions from message content
  const parseMentions = useCallback((content: string): { content: string; mentionedUserIds: string[] } => {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex) || [];
    const mentionedUserIds: string[] = [];

    mentions.forEach(mention => {
      const username = mention.substring(1);
      const profile = profiles.find(p => 
        p.name.toLowerCase().includes(username.toLowerCase())
      );
      if (profile) {
        mentionedUserIds.push(profile.id);
      }
    });

    return { content, mentionedUserIds };
  }, [profiles]);

  // Initialize data and setup real-time listener - fixed dependency array
  useEffect(() => {
    let mounted = true;
    
    const initializeChat = async () => {
      await fetchProfiles();
      if (mounted) await fetchMessages();
    };

    initializeChat();

    // Optimized real-time listener - only refresh when needed
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          if (mounted) fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'message_mentions'
        },
        () => {
          if (mounted) fetchMessages();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(messagesChannel);
    };
  }, []); // Empty dependency array - no more loops

  return {
    messages,
    profiles,
    loading,
    sendMessage,
    parseMentions
  };
};
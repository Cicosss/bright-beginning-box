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

  // Fetch all user profiles for mentions
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

  // Fetch messages with sender info and mentions
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch messages first
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Get unique sender IDs and fetch their profiles
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', senderIds);

      // Fetch mentions for each message and combine with profile data
      const messagesWithMentions = await Promise.all(
        (messagesData || []).map(async (message) => {
          const senderProfile = senderProfiles?.find(p => p.id === message.sender_id);
          
          const { data: mentions } = await supabase
            .from('message_mentions')
            .select('mentioned_user_id')
            .eq('message_id', message.id);
          
          const mentionedUserIds = mentions?.map(m => m.mentioned_user_id) || [];
          let mentionNames: string[] = [];
          
          if (mentionedUserIds.length > 0) {
            const { data: mentionedProfiles } = await supabase
              .from('profiles')
              .select('name')
              .in('id', mentionedUserIds);
            
            mentionNames = mentionedProfiles?.map(p => p.name) || [];
          }
          
          return {
            ...message,
            sender_name: senderProfile?.name || 'Unknown User',
            sender_avatar: senderProfile?.avatar_url,
            mentions: mentionNames
          };
        })
      );

      setMessages(messagesWithMentions);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a new message
  const sendMessage = useCallback(async (content: string, mentionedUsers: string[] = []) => {
    console.log('Sending message:', content, 'with mentions:', mentionedUsers);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('User authenticated:', user.id);

      // Insert the message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: user.id
        })
        .select()
        .single();

      console.log('Message insert result:', messageData, messageError);

      if (messageError) throw messageError;

      // Insert mentions if any
      if (mentionedUsers.length > 0 && messageData) {
        const mentionInserts = mentionedUsers.map(userId => ({
          message_id: messageData.id,
          mentioned_user_id: userId
        }));

        console.log('Inserting mentions:', mentionInserts);

        const { error: mentionsError } = await supabase
          .from('message_mentions')
          .insert(mentionInserts);

        if (mentionsError) throw mentionsError;
      }

      console.log('Message sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  }, []);

  // Parse @mentions from message content
  const parseMentions = useCallback((content: string): { content: string; mentionedUserIds: string[] } => {
    console.log('Parsing mentions for content:', content);
    console.log('Available profiles:', profiles);
    
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex) || [];
    const mentionedUserIds: string[] = [];

    mentions.forEach(mention => {
      const username = mention.substring(1); // Remove @
      console.log('Looking for username:', username);
      const profile = profiles.find(p => 
        p.name.toLowerCase().includes(username.toLowerCase())
      );
      console.log('Found profile:', profile);
      if (profile) {
        mentionedUserIds.push(profile.id);
      }
    });

    console.log('Final mentionedUserIds:', mentionedUserIds);
    return { content, mentionedUserIds };
  }, [profiles]);

  useEffect(() => {
    fetchProfiles();
    fetchMessages();

    // Set up real-time listener for messages
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Message change:', payload);
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_mentions'
        },
        (payload) => {
          console.log('Mention change:', payload);
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [fetchMessages, fetchProfiles]);

  return {
    messages,
    profiles,
    loading,
    sendMessage,
    parseMentions,
    fetchMessages
  };
};
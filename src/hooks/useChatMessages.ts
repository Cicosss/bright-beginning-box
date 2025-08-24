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

  // Send a new message with optimistic update
  const sendMessage = useCallback(async (content: string, mentionedUsers: string[] = []) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile for optimistic update
      const userProfile = profiles.find(p => p.id === user.id);
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: userProfile?.name || 'You',
        sender_avatar: userProfile?.avatar_url,
        mentions: mentionedUsers.map(id => profiles.find(p => p.id === id)?.name).filter(Boolean) as string[]
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert the message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: user.id
        })
        .select()
        .single();

      if (messageError) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        throw messageError;
      }

      // Insert mentions if any
      if (mentionedUsers.length > 0 && messageData) {
        const mentionInserts = mentionedUsers.map(userId => ({
          message_id: messageData.id,
          mentioned_user_id: userId
        }));

        const { error: mentionsError } = await supabase
          .from('message_mentions')
          .insert(mentionInserts);

        if (mentionsError) {
          console.error('Error inserting mentions:', mentionsError);
        }
      }

      // Replace optimistic message with real data when available
      // Real-time listener will handle this automatically

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }
  }, [profiles]);

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

  // Initialize data and setup real-time listener with targeted updates
  useEffect(() => {
    let mounted = true;
    
    const initializeChat = async () => {
      await fetchProfiles();
      if (mounted) await fetchMessages();
    };

    initializeChat();

    // Targeted real-time listeners for better performance
    const messagesChannel = supabase
      .channel('chat-messages-optimized')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (mounted && payload.new) {
            // Remove any temporary optimistic message with the same content
            setMessages(prev => {
              const filtered = prev.filter(m => 
                !m.id.startsWith('temp-') || m.content !== payload.new.content
              );
              
              // Add the real message with profile info
              const senderProfile = profiles.find(p => p.id === payload.new.sender_id);
              const newMessage = {
                ...payload.new,
                sender_name: senderProfile?.name || 'Unknown User',
                sender_avatar: senderProfile?.avatar_url,
                mentions: [] // Will be updated by mentions listener if needed
              };
              
              return [...filtered, newMessage];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (mounted && payload.new) {
            setMessages(prev => 
              prev.map(m => 
                m.id === payload.new.id 
                  ? { ...m, ...payload.new }
                  : m
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (mounted && payload.old) {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_mentions'
        },
        async (payload) => {
          if (mounted && payload.new) {
            // Update the specific message with mention info
            const mentionedProfile = profiles.find(p => p.id === payload.new.mentioned_user_id);
            if (mentionedProfile) {
              setMessages(prev =>
                prev.map(m => 
                  m.id === payload.new.message_id
                    ? { 
                        ...m, 
                        mentions: [...(m.mentions || []), mentionedProfile.name]
                      }
                    : m
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(messagesChannel);
    };
  }, [profiles]); // Depend on profiles for real-time updates

  return {
    messages,
    profiles,
    loading,
    sendMessage,
    parseMentions
  };
};
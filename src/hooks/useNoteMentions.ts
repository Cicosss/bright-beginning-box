import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

interface NoteMention {
  id: string;
  note_id: string;
  mentioned_user_id: string;
  created_at: string;
}

interface NotificationData {
  noteId: string;
  noteTitle: string;
  mentionedBy: string;
  unread: boolean;
}

export const useNoteMentions = () => {
  const [unreadMentions, setUnreadMentions] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch unread mentions for current user
  const fetchUnreadMentions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mentions, error } = await supabase
        .from('note_mentions')
        .select(`
          *,
          notes!inner(id, title, created_by),
          profiles!note_mentions_mentioned_user_id_fkey(name)
        `)
        .eq('mentioned_user_id', user.id);

      if (error) throw error;

      // Transform to notification format
      const notifications: NotificationData[] = (mentions || []).map(mention => ({
        noteId: mention.note_id,
        noteTitle: (mention as any).notes.title,
        mentionedBy: (mention as any).profiles.name,
        unread: true
      }));

      setUnreadMentions(notifications);
    } catch (error) {
      console.error('Error fetching note mentions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create note mentions for tagged users
  const createNoteMentions = useCallback(async (noteId: string, mentionedUserIds: string[]) => {
    try {
      if (mentionedUserIds.length === 0) return;

      // Delete existing mentions for this note first
      await supabase
        .from('note_mentions')
        .delete()
        .eq('note_id', noteId);

      // Insert new mentions
      const mentionInserts = mentionedUserIds.map(userId => ({
        note_id: noteId,
        mentioned_user_id: userId
      }));

      const { error } = await supabase
        .from('note_mentions')
        .insert(mentionInserts);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating note mentions:', error);
    }
  }, []);

  // Parse mentions from text content
  const parseMentions = useCallback((content: string, profiles: { id: string; name: string }[]) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex) || [];
    const mentionedUserIds: string[] = [];
    
    const processedMentions = new Set<string>();

    mentions.forEach(mention => {
      const username = mention.substring(1).toLowerCase();
      if (!processedMentions.has(username)) {
        processedMentions.add(username);
        
        const profile = profiles.find(p => 
          p.name.toLowerCase().includes(username)
        );
        if (profile) {
          mentionedUserIds.push(profile.id);
        }
      }
    });

    return mentionedUserIds;
  }, []);

  // Mark mentions as read when user views notes
  const markMentionsAsRead = useCallback(async () => {
    setUnreadMentions([]);
  }, []);

  useEffect(() => {
    fetchUnreadMentions();

    // Set up real-time listener for new mentions
    const channel = supabase
      .channel('note-mentions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_mentions'
        },
        () => {
          fetchUnreadMentions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadMentions]);

  return {
    unreadMentions,
    unreadCount: unreadMentions.length,
    loading,
    createNoteMentions,
    parseMentions,
    markMentionsAsRead,
    refetch: fetchUnreadMentions
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNotificationsBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      try {
        // Count unread mentions in notes
        const { count, error } = await supabase
          .from('note_mentions')
          .select('id', { count: 'exact' })
          .eq('mentioned_user_id', user.id);

        if (error) throw error;
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchUnreadCount();

    // Set up real-time listener for new mentions
    const channel = supabase
      .channel('note-mentions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'note_mentions',
          filter: `mentioned_user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async () => {
    if (!user?.id) return;
    
    try {
      // In a real implementation, you might mark specific mentions as read
      // For now, we'll just reset the counter
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return {
    unreadCount,
    markAsRead
  };
};
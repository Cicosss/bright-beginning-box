import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../integrations/supabase/client';

export const useNotificationsBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadMentions = async () => {
      try {
        // Count unread note mentions
        const { count: noteMentions } = await supabase
          .from('note_mentions')
          .select('*', { count: 'exact', head: true })
          .eq('mentioned_user_id', user.id);

        // Count unread task mentions
        const { count: taskMentions } = await supabase
          .from('task_mentions')
          .select('*', { count: 'exact', head: true })
          .eq('mentioned_user_id', user.id);

        const totalCount = (noteMentions || 0) + (taskMentions || 0);
        setUnreadCount(totalCount);
      } catch (error) {
        console.error('Error fetching mentions:', error);
        // Fallback to localStorage
        const storedCount = localStorage.getItem(`notifications_${user.id}`) || '0';
        setUnreadCount(parseInt(storedCount));
      }
    };

    fetchUnreadMentions();

    // Set up real-time listeners
    const noteMentionsChannel = supabase
      .channel('note-mentions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_mentions',
          filter: `mentioned_user_id=eq.${user.id}`
        },
        () => fetchUnreadMentions()
      )
      .subscribe();

    const taskMentionsChannel = supabase
      .channel('task-mentions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_mentions',
          filter: `mentioned_user_id=eq.${user.id}`
        },
        () => fetchUnreadMentions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(noteMentionsChannel);
      supabase.removeChannel(taskMentionsChannel);
    };
  }, [user?.id]);

  const markAsRead = () => {
    if (!user?.id) return;
    
    setUnreadCount(0);
    localStorage.setItem(`notifications_${user.id}`, '0');
  };

  const incrementCount = () => {
    if (!user?.id) return;
    
    const newCount = unreadCount + 1;
    setUnreadCount(newCount);
    localStorage.setItem(`notifications_${user.id}`, newCount.toString());
  };

  return {
    unreadCount,
    markAsRead,
    incrementCount
  };
};
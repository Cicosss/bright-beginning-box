import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

interface UserPresence {
  user_id: string;
  name: string;
  avatar_url?: string;
  online_at: string;
}

export const useUserPresence = () => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    const channel = supabase.channel('dashboard_presence');

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.keys(presenceState).forEach(key => {
          const presences = presenceState[key];
          if (presences && presences.length > 0) {
            // Extract user data from the presence object
            const presence = presences[0] as any;
            if (presence.user_id) {
              users.push({
                user_id: presence.user_id,
                name: presence.name,
                avatar_url: presence.avatar_url,
                online_at: presence.online_at
              });
            }
          }
        });

        setOnlineUsers(users);
        setLoading(false);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      });

    // Subscribe and track current user's presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const userPresence: UserPresence = {
          user_id: user.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          online_at: new Date().toISOString(),
        };

        await channel.track(userPresence);
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [user, profile]);

  return {
    onlineUsers,
    loading,
    onlineCount: onlineUsers.length
  };
};
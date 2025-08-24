import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { useProfilesRealtime } from './useProfilesRealtime';

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
  const { profilesMap } = useProfilesRealtime();

  // Function to get enriched presence data with latest profile info
  const enrichPresenceData = useCallback((presence: UserPresence): UserPresence => {
    const latestProfile = profilesMap.get(presence.user_id);
    return {
      ...presence,
      name: latestProfile?.name || presence.name,
      avatar_url: latestProfile?.avatar_url || presence.avatar_url,
    };
  }, [profilesMap]);

  useEffect(() => {
    if (!user || !profile) {
      setOnlineUsers([]);
      setLoading(false);
      return;
    }

    const channel = supabase
      .channel('dashboard_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState<UserPresence>();
        console.log('Presence sync:', presenceState);
        
        const users: UserPresence[] = [];
        Object.values(presenceState).forEach(presences => {
          presences.forEach(presence => {
            // Avoid duplicates by checking user_id and enrich with latest profile data
            if (!users.some(u => u.user_id === presence.user_id)) {
              users.push(enrichPresenceData(presence));
            }
          });
        });
        
        setOnlineUsers(users);
        setLoading(false);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
        setOnlineUsers(prev => {
          const updated = [...prev];
          newPresences.forEach(presence => {
            // Avoid duplicates and enrich with latest profile data
            if (!updated.some(u => u.user_id === presence.user_id)) {
              updated.push(enrichPresenceData(presence));
            }
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        setOnlineUsers(prev =>
          prev.filter(user => 
            !leftPresences.some(left => left.user_id === user.user_id)
          )
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const presenceData = {
            user_id: user.id,
            name: profile.name,
            avatar_url: profile.avatar_url,
            online_at: new Date().toISOString()
          };

          console.log('Tracking presence:', presenceData);
          
          const trackResult = await channel.track(presenceData);
          console.log('Track result:', trackResult);
        }
      });

    return () => {
      console.log('Cleaning up presence channel');
      supabase.removeChannel(channel);
    };
  }, [user, profile, enrichPresenceData]);

  // Effect to update presence when profile changes
  useEffect(() => {
    if (!user || !profile) return;

    const updatePresence = () => {
      const channel = supabase.getChannels().find(ch => ch.topic === 'dashboard_presence');
      if (channel) {
        const presenceData = {
          user_id: user.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          online_at: new Date().toISOString()
        };
        
        channel.track(presenceData);
      }
    };

    updatePresence();
  }, [user, profile?.name, profile?.avatar_url]);

  return {
    onlineUsers,
    loading,
    onlineCount: onlineUsers.length
  };
};
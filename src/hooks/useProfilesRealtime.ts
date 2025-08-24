import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  role?: string;
}

// Global cache for profiles to share across components
let globalProfilesCache: Profile[] = [];
let globalProfilesMap = new Map<string, Profile>();

export const useProfilesRealtime = () => {
  const [profiles, setProfiles] = useState<Profile[]>(globalProfilesCache);
  const [profilesMap, setProfilesMap] = useState<Map<string, Profile>>(globalProfilesMap);
  const [loading, setLoading] = useState(true);

  // Update global cache when profiles change
  const updateGlobalCache = useCallback((newProfiles: Profile[]) => {
    globalProfilesCache = newProfiles;
    globalProfilesMap = new Map(newProfiles.map(p => [p.id, p]));
    setProfiles(newProfiles);
    setProfilesMap(globalProfilesMap);
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role')
        .order('name');

      if (error) throw error;

      const profilesData = data || [];
      updateGlobalCache(profilesData);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [updateGlobalCache]);

  // Invalidate and refetch profiles
  const invalidateProfiles = useCallback(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    // Only fetch if cache is empty
    if (globalProfilesCache.length === 0) {
      fetchProfiles();
    } else {
      setLoading(false);
    }

    // Set up real-time listener for profile changes
    const profilesChannel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        if (payload.new) {
          const newProfile = payload.new as Profile;
          const updatedProfiles = [...globalProfilesCache, newProfile];
          updateGlobalCache(updatedProfiles);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        if (payload.new) {
          const updatedProfile = payload.new as Profile;
          const updatedProfiles = globalProfilesCache.map(p => 
            p.id === updatedProfile.id ? updatedProfile : p
          );
          updateGlobalCache(updatedProfiles);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        if (payload.old) {
          const deletedId = (payload.old as Profile).id;
          const updatedProfiles = globalProfilesCache.filter(p => p.id !== deletedId);
          updateGlobalCache(updatedProfiles);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [fetchProfiles, updateGlobalCache]);

  return {
    profiles,
    profilesMap,
    loading,
    refetch: fetchProfiles,
    invalidateProfiles
  };
};

// Export function to get cached profile by ID
export const getCachedProfile = (id: string): Profile | undefined => {
  return globalProfilesMap.get(id);
};

// Export function to get all cached profiles
export const getAllCachedProfiles = (): Profile[] => {
  return globalProfilesCache;
};
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../integrations/supabase/client';
import { generateAvatarUrl } from '../utils/avatarGenerator';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  role?: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return;

    try {
      // Ensure name is always provided for database constraints
      const profileData = {
        id: user.id,
        name: updates.name || profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utente',
        ...updates
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          return;
        }

        if (data) {
          setProfile(data);
        } else {
          // If no profile exists, use user metadata as fallback with avatar
          const fallbackProfile = {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Utente',
            avatar_url: user.user_metadata?.avatar_url || generateAvatarUrl('avataaars', user.user_metadata?.name || user.email?.split('@')[0] || 'Guest')
          };
          setProfile(fallbackProfile);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    updateProfile
  };
};
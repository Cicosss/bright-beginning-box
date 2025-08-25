import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useProfile } from './useProfile';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  last_sign_in_at?: string;
  created_at: string;
}

interface BanMuteAction {
  id: string;
  targetUserId: string;
  targetUserName: string;
  reason?: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export const useAdmin = () => {
  const { profile } = useProfile();
  const [users, setUsers] = useState<User[]>([]);
  const [bans, setBans] = useState<BanMuteAction[]>([]);
  const [mutes, setMutes] = useState<BanMuteAction[]>([]);
  const [loading, setLoading] = useState(false);

  const isSystemAdmin = profile?.role === 'Amministratore';

  const fetchUsers = useCallback(async () => {
    if (!isSystemAdmin) return;
    
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedUsers: User[] = profiles.map(p => ({
        id: p.id,
        email: '', // Will be populated from auth if needed
        name: p.name,
        role: p.role || 'Dipendente',
        avatar_url: p.avatar_url,
        created_at: p.created_at
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [isSystemAdmin]);

  const fetchBansAndMutes = useCallback(async () => {
    if (!isSystemAdmin) return;

    try {
      const [bansResult, mutesResult] = await Promise.all([
        supabase
          .from('user_bans')
          .select(`
            *,
            banned_user:profiles!user_bans_banned_user_id_fkey(name)
          `)
          .eq('is_active', true)
          .order('banned_at', { ascending: false }),
        
        supabase
          .from('user_mutes')
          .select(`
            *,
            muted_user:profiles!user_mutes_muted_user_id_fkey(name)
          `)
          .eq('is_active', true)
          .order('muted_at', { ascending: false })
      ]);

      if (bansResult.error) throw bansResult.error;
      if (mutesResult.error) throw mutesResult.error;

      setBans(bansResult.data?.map(b => ({
        id: b.id,
        targetUserId: b.banned_user_id,
        targetUserName: (b.banned_user as any)?.name || 'Utente sconosciuto',
        reason: b.reason,
        createdAt: b.banned_at,
        expiresAt: b.expires_at,
        isActive: b.is_active
      })) || []);

      setMutes(mutesResult.data?.map(m => ({
        id: m.id,
        targetUserId: m.muted_user_id,
        targetUserName: (m.muted_user as any)?.name || 'Utente sconosciuto',
        reason: m.reason,
        createdAt: m.muted_at,
        expiresAt: m.expires_at,
        isActive: m.is_active
      })) || []);
    } catch (error) {
      console.error('Error fetching bans/mutes:', error);
    }
  }, [isSystemAdmin]);

  const updateUserRole = useCallback(async (userId: string, newRole: string) => {
    if (!isSystemAdmin) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }, [isSystemAdmin]);

  const banUser = useCallback(async (userId: string, reason: string, expiresAt?: string) => {
    if (!isSystemAdmin) return false;

    try {
      const { error } = await supabase
        .from('user_bans')
        .insert({
          banned_user_id: userId,
          banned_by: profile?.id,
          reason,
          expires_at: expiresAt || null
        });

      if (error) throw error;
      
      await fetchBansAndMutes();
      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      return false;
    }
  }, [isSystemAdmin, profile?.id, fetchBansAndMutes]);

  const muteUser = useCallback(async (userId: string, reason: string, expiresAt?: string) => {
    if (!isSystemAdmin) return false;

    try {
      const { error } = await supabase
        .from('user_mutes')
        .insert({
          muted_user_id: userId,
          muted_by: profile?.id,
          reason,
          expires_at: expiresAt || null
        });

      if (error) throw error;
      
      await fetchBansAndMutes();
      return true;
    } catch (error) {
      console.error('Error muting user:', error);
      return false;
    }
  }, [isSystemAdmin, profile?.id, fetchBansAndMutes]);

  const unbanUser = useCallback(async (banId: string) => {
    if (!isSystemAdmin) return false;

    try {
      const { error } = await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('id', banId);

      if (error) throw error;
      
      await fetchBansAndMutes();
      return true;
    } catch (error) {
      console.error('Error unbanning user:', error);
      return false;
    }
  }, [isSystemAdmin, fetchBansAndMutes]);

  const unmuteUser = useCallback(async (muteId: string) => {
    if (!isSystemAdmin) return false;

    try {
      const { error } = await supabase
        .from('user_mutes')
        .update({ is_active: false })
        .eq('id', muteId);

      if (error) throw error;
      
      await fetchBansAndMutes();
      return true;
    } catch (error) {
      console.error('Error unmuting user:', error);
      return false;
    }
  }, [isSystemAdmin, fetchBansAndMutes]);

  const deleteAllMessages = useCallback(async () => {
    if (!isSystemAdmin) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .gte('created_at', '1900-01-01'); // Delete all messages

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting all messages:', error);
      return false;
    }
  }, [isSystemAdmin]);

  useEffect(() => {
    if (isSystemAdmin) {
      fetchUsers();
      fetchBansAndMutes();
    }
  }, [isSystemAdmin, fetchUsers, fetchBansAndMutes]);

  return {
    isSystemAdmin,
    users,
    bans,
    mutes,
    loading,
    updateUserRole,
    banUser,
    muteUser,
    unbanUser,
    unmuteUser,
    deleteAllMessages,
    refetch: () => {
      fetchUsers();
      fetchBansAndMutes();
    }
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Note } from '../types';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all user profiles
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

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          note_mentions!inner(mentioned_user_id)
        `);

      if (error) throw error;

      const mappedNotes: Note[] = (data || []).map(n => {
        // Get mentioned user names for this note
        const mentionedUserIds = ((n as any).note_mentions || []).map((m: any) => m.mentioned_user_id);
        const mentionNames = mentionedUserIds
          .map((id: string) => profiles.find(p => p.id === id)?.name)
          .filter(Boolean);

        return {
          id: n.id,
          title: n.title,
          content: n.content || '',
          notebook: n.notebook || 'Generale',
          isShared: n.is_shared || false,
          lastModified: new Date(n.updated_at),
          mentions: mentionNames
        };
      });

      setNotes(mappedNotes);
    } catch (error) {
      console.error('Errore nel caricamento note:', error);
    } finally {
      setLoading(false);
    }
  }, [profiles]);

  const createNote = useCallback(async (note: Omit<Note, 'id' | 'lastModified'>, mentionedUserIds: string[] = []) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          title: note.title,
          content: note.content,
          notebook: note.notebook,
          is_shared: note.isShared,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Create note mentions if any
      if (mentionedUserIds.length > 0) {
        const mentionInserts = mentionedUserIds.map(userId => ({
          note_id: data.id,
          mentioned_user_id: userId
        }));

        await supabase.from('note_mentions').insert(mentionInserts);
      }

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content || '',
        notebook: data.notebook || 'Generale',
        isShared: data.is_shared || false,
        lastModified: new Date(data.updated_at),
        mentions: mentionedUserIds
          .map(id => profiles.find(p => p.id === id)?.name)
          .filter(Boolean) as string[]
      };

      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (error) {
      console.error('Errore nella creazione nota:', error);
      throw error;
    }
  }, [profiles]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>, mentionedUserIds?: string[]) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: updates.title,
          content: updates.content,
          notebook: updates.notebook,
          is_shared: updates.isShared
        })
        .eq('id', noteId);

      if (error) throw error;

      // Update mentions if provided
      if (mentionedUserIds !== undefined) {
        // Delete existing mentions
        await supabase
          .from('note_mentions')
          .delete()
          .eq('note_id', noteId);

        // Insert new mentions
        if (mentionedUserIds.length > 0) {
          const mentionInserts = mentionedUserIds.map(userId => ({
            note_id: noteId,
            mentioned_user_id: userId
          }));

          await supabase.from('note_mentions').insert(mentionInserts);
        }
      }

      setNotes(prev =>
        prev.map(n => n.id === noteId 
          ? { 
              ...n, 
              ...updates, 
              lastModified: new Date(),
              mentions: mentionedUserIds !== undefined 
                ? mentionedUserIds
                    .map(id => profiles.find(p => p.id === id)?.name)
                    .filter(Boolean) as string[]
                : n.mentions
            }
          : n
        )
      );
    } catch (error) {
      console.error('Errore nell\'aggiornamento nota:', error);
    }
  }, [profiles]);

  // Parse mentions from text content
  const parseMentions = useCallback((content: string) => {
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
  }, [profiles]);

  useEffect(() => {
    const initializeNotes = async () => {
      await fetchProfiles();
      await fetchNotes();
    };

    initializeNotes();

    // Set up real-time listener for notes
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes'
        },
        (payload) => {
          console.log('Note change:', payload);
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotes]);

  return {
    notes,
    profiles,
    loading,
    refetch: fetchNotes,
    createNote,
    updateNote,
    parseMentions
  };
};
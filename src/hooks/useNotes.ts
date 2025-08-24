import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Note } from '../types';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*');

      if (error) throw error;

      const mappedNotes: Note[] = (data || []).map(n => ({
        id: n.id,
        title: n.title,
        content: n.content || '',
        notebook: n.notebook || 'Generale',
        isShared: n.is_shared || false,
        lastModified: new Date(n.updated_at)
      }));

      setNotes(mappedNotes);
    } catch (error) {
      console.error('Errore nel caricamento note:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (note: Omit<Note, 'id' | 'lastModified'>) => {
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

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content || '',
        notebook: data.notebook || 'Generale',
        isShared: data.is_shared || false,
        lastModified: new Date(data.updated_at)
      };

      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (error) {
      console.error('Errore nella creazione nota:', error);
      throw error;
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
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

      setNotes(prev =>
        prev.map(n => n.id === noteId 
          ? { ...n, ...updates, lastModified: new Date() }
          : n
        )
      );
    } catch (error) {
      console.error('Errore nell\'aggiornamento nota:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotes();

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
    loading,
    refetch: fetchNotes,
    createNote,
    updateNote
  };
};
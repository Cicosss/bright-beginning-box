import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useNotes } from '../hooks/useNotes';
import { useAuth } from '../hooks/useAuth';
import { useProfilesRealtime } from '../hooks/useProfilesRealtime';
import { supabase } from '../integrations/supabase/client';
import { Note } from '../types';
import { NoteCardWithMentions } from './NoteCardWithMentions';
import { NoteColumn } from './NoteColumn';
import { AddNoteModalWithMentions } from './AddNoteModalWithMentions';
import NoteDetailModal from './NoteDetailModal';
import UserMentionDropdown from './UserMentionDropdown';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface NotesViewProps {
  onNoteClick?: (note: Note) => void;
}

const DEFAULT_COLUMNS = [
  { id: 'ideas', title: 'Idee', color: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'in-progress', title: 'In Corso', color: 'bg-yellow-100 dark:bg-yellow-900' },
  { id: 'completed', title: 'Completate', color: 'bg-green-100 dark:bg-green-900' }
];

export function NotesView({ onNoteClick }: NotesViewProps) {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes();
  const { user } = useAuth();
  const { profiles } = useProfilesRealtime(); // Use real-time profiles
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group notes by notebook (using correct mapping)
  const notesByColumn = DEFAULT_COLUMNS.reduce((acc, column) => {
    const columnNotes = notes.filter(note => {
      // Map column titles correctly
      const noteNotebook = note.notebook || 'Idee';
      const columnMatches = noteNotebook === column.title;
      
      const matchesSearch = searchTerm === '' || 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      return columnMatches && matchesSearch;
    });
    acc[column.id] = columnNotes;
    return acc;
  }, {} as Record<string, Note[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const note = notes.find(n => n.id === active.id);
    setActiveNote(note || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNote(null);

    if (!over) return;

    const noteId = active.id as string;
    const newColumnId = over.id as string;

    // Find the column title from the ID
    const newColumn = DEFAULT_COLUMNS.find(col => col.id === newColumnId);
    if (!newColumn) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const currentNotebook = note.notebook || 'Idee';
    
    if (currentNotebook !== newColumn.title) {
      await updateNote(noteId, {
        notebook: newColumn.title
      });
    }
  };

  // Parse mentions utility - fixed regex to handle names with spaces
  const parseMentions = useCallback((content: string): { content: string; mentionedUserIds: string[] } => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    const mentions = content.match(mentionRegex) || [];
    const mentionedUserIds: string[] = [];
    
    mentions.forEach(mention => {
      const username = mention.substring(1).trim();
      mentionedUserIds.push(username);
    });

    return { content, mentionedUserIds };
  }, []);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setShowDetailModal(true);
    if (onNoteClick) {
      onNoteClick(note);
    }
  };

  const handleAddNote = async (noteData: Omit<Note, 'id' | 'lastModified'>) => {
    try {
      // Parse mentions from content
      const { mentionedUserIds } = parseMentions(noteData.content);
      
      // Create note
      const newNote = await createNote(noteData);
      
      // Handle mentions separately
      if (mentionedUserIds.length > 0 && newNote) {
        // Get profiles to map names to IDs - improved matching
        const matchedProfiles = profiles.filter(profile => 
          mentionedUserIds.some(name => 
            profile.name.toLowerCase() === name.toLowerCase()
          )
        );

        if (matchedProfiles.length > 0) {
          const mentions = matchedProfiles.map(profile => ({
            note_id: newNote.id,
            mentioned_user_id: profile.id
          }));

          // Insert mentions directly
          await (supabase as any).rpc('insert_note_mentions', { mentions_data: mentions });
        }
      }
      
      setShowAddModal(false);
    } catch (error) {
      console.error('Errore nella creazione della nota:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      // Parse mentions from content if updated
      let mentionedUserIds: string[] = [];
      if (updates.content) {
        const result = parseMentions(updates.content);
        mentionedUserIds = result.mentionedUserIds;
      }
      
      // Update note
      await updateNote(noteId, updates);
      
      // Handle mentions separately if content was updated
      if (updates.content && mentionedUserIds.length > 0) {
        // Get profiles to map names to IDs - improved matching
        const matchedProfiles = profiles.filter(profile => 
          mentionedUserIds.some(name => 
            profile.name.toLowerCase() === name.toLowerCase()
          )
        );

        if (matchedProfiles.length > 0) {
          // Delete existing mentions
          await (supabase as any).rpc('delete_note_mentions', { note_id: noteId });
          
          // Insert new mentions
          const mentions = matchedProfiles.map(profile => ({
            note_id: noteId,
            mentioned_user_id: profile.id
          }));

          await (supabase as any).rpc('insert_note_mentions', { mentions_data: mentions });
        }
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento nota:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Accesso Richiesto
          </h3>
          <p className="text-muted-foreground">
            Effettua l'accesso per visualizzare e gestire le tue note.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Note Board</h1>
          <p className="text-muted-foreground">Gestisci le tue note in stile Trello</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Nota
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 h-full overflow-y-auto pb-6">
            {DEFAULT_COLUMNS.map((column) => (
              <NoteColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                notes={notesByColumn[column.id] || []}
                onNoteClick={handleNoteClick}
                onUpdateNote={handleUpdateNote}
                profiles={profiles}
                parseMentions={parseMentions}
              />
            ))}
          </div>

          <DragOverlay>
          {activeNote ? (
            <NoteCardWithMentions
              note={activeNote}
              isDragging
              onNoteClick={() => {}}
              onUpdateNote={async () => {}}
              profiles={profiles}
              parseMentions={parseMentions}
            />
          ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <AddNoteModalWithMentions
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddNote}
          columns={DEFAULT_COLUMNS}
        />
      )}

      {/* Note Detail Modal */}
      <NoteDetailModal
        note={selectedNote}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedNote(null);
        }}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={deleteNote}
        columns={DEFAULT_COLUMNS}
      />
    </div>
  );
}
import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNotes } from '../hooks/useNotes';
import { useAuth } from '../hooks/useAuth';
import { Note } from '../types';
import { NoteCard } from './NoteCard';
import { NoteColumn } from './NoteColumn';
import { AddNoteModal } from './AddNoteModal';
import { Button } from './ui/button';
import { Plus, Filter } from 'lucide-react';

interface NotesViewProps {
  onNoteClick?: (note: Note) => void;
}

const DEFAULT_COLUMNS = [
  { id: 'ideas', title: 'Idee', color: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'in-progress', title: 'In Corso', color: 'bg-yellow-100 dark:bg-yellow-900' },
  { id: 'completed', title: 'Completate', color: 'bg-green-100 dark:bg-green-900' },
  { id: 'archived', title: 'Archiviate', color: 'bg-gray-100 dark:bg-gray-800' }
];

export function NotesView({ onNoteClick }: NotesViewProps) {
  const { notes, profiles, loading, createNote, updateNote, parseMentions } = useNotes();
  const { user } = useAuth();
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group notes by notebook (using notebook as column)
  const notesByColumn = DEFAULT_COLUMNS.reduce((acc, column) => {
    const columnNotes = (notes || []).filter(note => 
      (note.notebook || 'ideas').toLowerCase().replace(/\s+/g, '-') === column.id &&
      (searchTerm === '' || 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    acc[column.id] = columnNotes;
    return acc;
  }, {} as Record<string, Note[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const note = (notes || []).find(n => n.id === active.id);
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

    const note = (notes || []).find(n => n.id === noteId);
    if (!note) return;

    const currentColumnId = (note.notebook || 'ideas').toLowerCase().replace(/\s+/g, '-');
    
    if (currentColumnId !== newColumnId) {
      await updateNote(noteId, {
        notebook: newColumn.title
      });
    }
  };

  const handleAddNote = async (noteData: Omit<Note, 'id' | 'lastModified'>) => {
    try {
      // Parse mentions from title and content
      const titleMentions = parseMentions(noteData.title);
      const contentMentions = parseMentions(noteData.content);
      const allMentions = [...new Set([...titleMentions, ...contentMentions])];
      
      await createNote(noteData, allMentions);
      setShowAddModal(false);
    } catch (error) {
      console.error('Errore nella creazione della nota:', error);
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
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full overflow-y-auto pb-6">
            {DEFAULT_COLUMNS.map((column) => (
              <NoteColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                notes={notesByColumn[column.id] || []}
                onNoteClick={onNoteClick || (() => {})}
                onUpdateNote={updateNote}
                profiles={profiles}
                parseMentions={parseMentions}
              />
            ))}
          </div>

          <DragOverlay>
            {activeNote ? (
              <NoteCard
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
        <AddNoteModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddNote}
          columns={DEFAULT_COLUMNS}
          profiles={profiles}
        />
      )}
    </div>
  );
}
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Note } from '../types';
import { NoteCardWithMentions } from './NoteCardWithMentions';

type NoteColumnProps = {
  id: string;
  title: string;
  color: string;
  notes: Note[];
  onNoteClick: (note: Note) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  profiles: Array<{ id: string; name: string; avatar_url?: string }>;
  parseMentions: (content: string) => { content: string; mentionedUserIds: string[] };
}

export const NoteColumn: React.FC<NoteColumnProps> = ({ id, title, color, notes, onNoteClick, onUpdateNote, profiles, parseMentions }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`${color} rounded-lg p-3 mb-4 border border-border`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full">
              {notes.length}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 min-h-32 p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver 
            ? 'border-primary bg-primary/5' 
            : 'border-border/50 hover:border-border'
        }`}
      >
        <SortableContext items={notes.map(note => note.id)} strategy={verticalListSortingStrategy}>
          {notes.map((note) => (
            <NoteCardWithMentions
              key={note.id}
              note={note}
              onNoteClick={onNoteClick}
              onUpdateNote={onUpdateNote}
              profiles={profiles}
              parseMentions={parseMentions}
            />
          ))}
        </SortableContext>

        {notes.length === 0 && (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Nessuna nota</p>
              <p className="text-xs">Trascina qui le note</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
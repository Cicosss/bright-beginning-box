import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note } from '../types';
import { Calendar, Share2, Edit3 } from 'lucide-react';
import { Button } from './ui/button';

type NoteCardProps = {
  note: Note;
  isDragging?: boolean;
  onNoteClick: (note: Note) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, isDragging = false, onNoteClick, onUpdateNote }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: note.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    if (title.trim() !== note.title || content.trim() !== note.content) {
      await onUpdateNote(note.id, {
        title: title.trim(),
        content: content.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
        isDragging ? 'rotate-3 shadow-xl' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      {isEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2 py-1 text-sm font-medium bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Titolo della nota..."
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-background border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Contenuto della nota..."
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Annulla
            </Button>
            <Button size="sm" onClick={handleSave}>
              Salva
            </Button>
          </div>
        </div>
      ) : (
        <div onClick={() => onNoteClick(note)}>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-foreground text-sm line-clamp-2 flex-1">
              {note.title}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              {note.isShared && (
                <Share2 className="w-3 h-3 text-blue-500" />
              )}
              <Button
                size="sm"
                variant="ghost"
                className="w-6 h-6 p-0 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {note.content && (
            <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
              {note.content}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(note.lastModified)}</span>
            </div>
            {note.isShared && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">
                Condivisa
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note } from '../types';
import { Calendar, Share2, Edit3 } from 'lucide-react';
import UserMentionDropdown from './UserMentionDropdown';
import { Button } from './ui/button';

type NoteCardProps = {
  note: Note;
  isDragging?: boolean;
  onNoteClick: (note: Note) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  profiles?: Array<{ id: string; name: string; avatar_url?: string }>;
  parseMentions?: (content: string) => { content: string; mentionedUserIds: string[] };
}

export const NoteCardWithMentions: React.FC<NoteCardProps> = ({ 
  note, 
  isDragging = false, 
  onNoteClick, 
  onUpdateNote, 
  profiles = [], 
  parseMentions 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

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

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (profiles.length > 0) {
      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = newContent.substring(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);

      if (mentionMatch) {
        const query = mentionMatch[1];
        setMentionQuery(query);
        setShowMentionDropdown(true);

        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + (mentionMatch.index || 0) * 8
        });
      } else {
        setShowMentionDropdown(false);
      }
    }
  }, [profiles]);

  const handleMentionSelect = useCallback((profile: any) => {
    const textarea = document.querySelector(`[data-note-id="${note.id}"]`) as HTMLTextAreaElement;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      const mentionStart = textBeforeCursor.lastIndexOf('@');

      if (mentionStart !== -1) {
        const newContent = 
          textBeforeCursor.substring(0, mentionStart) + 
          `@${profile.name} ` + 
          content.substring(cursorPos);

        setContent(newContent);
        setShowMentionDropdown(false);

        setTimeout(() => {
          const newCursorPos = mentionStart + profile.name.length + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    }
  }, [content, note.id]);

  const renderContentWithMentions = useCallback((text: string) => {
    if (!parseMentions || !profiles.length) return text;
    
    const { mentionedUserIds } = parseMentions(text);
    
    if (mentionedUserIds.length === 0) return text;
    
    let formattedText = text;
    mentionedUserIds.forEach(mentionName => {
      const mentionText = `@${mentionName}`;
      const regex = new RegExp(`@${mentionName}`, 'gi');
      formattedText = formattedText.replace(regex, 
        `<span style="background-color: hsl(var(--primary) / 0.2); color: hsl(var(--primary)); font-weight: 600; padding: 0 4px; border-radius: 4px;">${mentionText}</span>`
      );
    });
    
    return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
  }, [parseMentions, profiles]);

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
    setShowMentionDropdown(false);
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
      className={`bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative ${
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
            data-note-id={note.id}
            value={content}
            onChange={handleContentChange}
            className="w-full px-2 py-1 text-sm bg-background border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Contenuto della nota... (usa @ per menzionare)"
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
          {showMentionDropdown && (
            <UserMentionDropdown
              profiles={profiles}
              searchQuery={mentionQuery}
              onSelectUser={handleMentionSelect}
              isVisible={showMentionDropdown}
              position={mentionPosition}
            />
          )}
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
            <div className="text-muted-foreground text-sm line-clamp-3 mb-3">
              {renderContentWithMentions(note.content)}
            </div>
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
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note } from '../types';
import { Calendar, Share2, Edit3, Users } from 'lucide-react';
import { Button } from './ui/button';
import UserMentionDropdown from './UserMentionDropdown';

interface NoteCardProps {
  note: Note;
  isDragging?: boolean;
  onNoteClick: (note: Note) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>, mentionedUserIds?: string[]) => Promise<void>;
  profiles: Array<{ id: string; name: string; avatar_url?: string }>;
  parseMentions: (content: string) => string[];
}

export function NoteCard({ note, isDragging = false, onNoteClick, onUpdateNote, profiles, parseMentions }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  
  // Mention dropdown state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeField, setActiveField] = useState<'title' | 'content'>('title');

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
      // Parse mentions from both title and content
      const titleMentions = parseMentions(title.trim());
      const contentMentions = parseMentions(content.trim());
      const allMentions = [...new Set([...titleMentions, ...contentMentions])];
      
      await onUpdateNote(note.id, {
        title: title.trim(),
        content: content.trim()
      }, allMentions);
    }
    setIsEditing(false);
    setShowMentionDropdown(false);
  };

  const handleCancel = () => {
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false);
    setShowMentionDropdown(false);
  };

  // Handle mention detection in input fields
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, 
    field: 'title' | 'content'
  ) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    if (field === 'title') {
      setTitle(value);
    } else {
      setContent(value);
    }
    
    setCursorPosition(cursorPos);
    setActiveField(field);

    // Check for mention pattern
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentionDropdown(true);
      
      // Calculate position relative to the input
      const rect = e.target.getBoundingClientRect();
      setMentionPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + (mentionMatch.index || 0) * 8
      });
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Handle user selection from mention dropdown
  const handleSelectUser = (user: { id: string; name: string }) => {
    const currentValue = activeField === 'title' ? title : content;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const textAfterCursor = currentValue.substring(cursorPosition);
    
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    
    if (mentionStart !== -1) {
      const newText = 
        textBeforeCursor.substring(0, mentionStart) + 
        `@${user.name} ` + 
        textAfterCursor;
      
      if (activeField === 'title') {
        setTitle(newText);
      } else {
        setContent(newText);
      }
      
      setShowMentionDropdown(false);
    }
  };

  // Render mentions in text content
  const renderContentWithMentions = (text: string) => {
    if (!note.mentions || note.mentions.length === 0) {
      return text;
    }

    let processedText = text;
    note.mentions.forEach(mentionName => {
      const mentionText = `@${mentionName}`;
      const regex = new RegExp(`@${mentionName}`, 'gi');
      processedText = processedText.replace(regex, 
        `<span class="bg-primary/20 text-primary font-semibold px-1 rounded text-xs">${mentionText}</span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <>
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
              id={`title-${note.id}`}
              type="text"
              value={title}
              onChange={(e) => handleInputChange(e, 'title')}
              className="w-full px-2 py-1 text-sm font-medium bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Titolo della nota... (usa @ per menzionare)"
              autoFocus
            />
            <textarea
              id={`content-${note.id}`}
              value={content}
              onChange={(e) => handleInputChange(e, 'content')}
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
          </div>
        ) : (
          <div onClick={() => onNoteClick(note)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 mr-2">
                <h3 className="font-medium text-foreground text-sm line-clamp-2">
                  {renderContentWithMentions(note.title)}
                </h3>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {note.isShared && (
                  <Share2 className="w-3 h-3 text-blue-500" />
                )}
                {note.mentions && note.mentions.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-600 font-medium">
                      {note.mentions.length}
                    </span>
                  </div>
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
              <div className="flex items-center gap-2">
                {note.mentions && note.mentions.length > 0 && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Users className="w-3 h-3" />
                    <span>{note.mentions.join(', ')}</span>
                  </div>
                )}
                {note.isShared && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-xs">
                    Condivisa
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mention Dropdown */}
      {isEditing && (
        <UserMentionDropdown
          profiles={profiles}
          searchQuery={mentionQuery}
          onSelectUser={handleSelectUser}
          isVisible={showMentionDropdown}
          position={mentionPosition}
        />
      )}
    </>
  );
};
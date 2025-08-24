import React, { useState } from 'react';
import { Button } from './ui/button';
import { FileText, X } from 'lucide-react';
import { Note } from '../types';
import UserMentionDropdown from './UserMentionDropdown';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'lastModified'>) => void;
  columns: Array<{ id: string; title: string; color?: string }>;
  profiles: Array<{ id: string; name: string; avatar_url?: string }>;
}

export function AddNoteModal({ isOpen, onClose, onSave, columns, profiles }: AddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notebook, setNotebook] = useState('Idee');
  const [isShared, setIsShared] = useState(false);
  
  // Mention dropdown state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeField, setActiveField] = useState<'title' | 'content'>('title');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim(),
      notebook,
      isShared,
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setNotebook('Idee');
    setIsShared(false);
    setShowMentionDropdown(false);
    onClose();
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
      
      // Restore focus to the field
      setTimeout(() => {
        const fieldElement = document.getElementById(activeField) as HTMLInputElement | HTMLTextAreaElement;
        if (fieldElement) {
          const newCursorPos = mentionStart + user.name.length + 2;
          fieldElement.focus();
          fieldElement.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md relative">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Nuova Nota</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                Titolo * (usa @ per menzionare utenti)
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => handleInputChange(e, 'title')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Inserisci il titolo della nota..."
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-foreground mb-2">
                Contenuto (usa @ per menzionare utenti)
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => handleInputChange(e, 'content')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Inserisci il contenuto della nota..."
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="notebook" className="block text-sm font-medium text-foreground mb-2">
                Colonna
              </label>
              <select
                id="notebook"
                value={notebook}
                onChange={(e) => setNotebook(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.title}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isShared"
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="isShared" className="text-sm text-foreground">
                Condividi con il team
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                Crea Nota
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Mention Dropdown */}
      <UserMentionDropdown
        profiles={profiles}
        searchQuery={mentionQuery}
        onSelectUser={handleSelectUser}
        isVisible={showMentionDropdown}
        position={mentionPosition}
      />
    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { Button } from './ui/button';
import { X, FileText } from 'lucide-react';
import UserMentionDropdown from './UserMentionDropdown';
import { supabase } from '../integrations/supabase/client';

interface AddNoteModalWithMentionsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'lastModified'>) => void;
  columns: Array<{ id: string; title: string; color: string }>;
}

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

export function AddNoteModalWithMentions({ isOpen, onClose, onSave, columns }: AddNoteModalWithMentionsProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notebook, setNotebook] = useState(columns[0]?.title || 'Idee');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url');
      
      if (profilesData) {
        setProfiles(profilesData);
      }
    };

    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);

    if (mentionMatch && profiles.length > 0) {
      const searchQuery = mentionMatch[1];
      setMentionSearchQuery(searchQuery);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX + (mentionMatch.index || 0) * 8
        });
      }
      
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectUser = (selectedUser: Profile) => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
        const beforeMention = textBeforeCursor.substring(0, atIndex);
        const afterMention = content.substring(cursorPos);
        const newContent = `${beforeMention}@${selectedUser.name} ${afterMention}`;
        
        setContent(newContent);
        setShowMentionDropdown(false);
        
        setTimeout(() => {
          const newCursorPos = atIndex + selectedUser.name.length + 2;
          textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current?.focus();
        }, 0);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim(),
      notebook,
      isShared: true, // Always shared now
    });

    // Reset form
    setTitle('');
    setContent('');
    setNotebook(columns[0]?.title || 'Idee');
    setShowMentionDropdown(false);
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setNotebook(columns[0]?.title || 'Idee');
    setShowMentionDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-gray-600 rounded-lg shadow-lg w-full max-w-md relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Nuova Nota</h2>
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
            <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
              Titolo *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Inserisci il titolo della nota..."
              required
              autoFocus
            />
          </div>

          <div className="relative">
            <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
              Contenuto
            </label>
            <textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={handleContentChange}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Inserisci il contenuto della nota... (usa @ per menzionare)"
              rows={4}
            />
            
            {showMentionDropdown && (
              <UserMentionDropdown
                profiles={profiles}
                searchQuery={mentionSearchQuery}
                onSelectUser={handleSelectUser}
                isVisible={showMentionDropdown}
                position={dropdownPosition}
              />
            )}
          </div>

          <div>
            <label htmlFor="notebook" className="block text-sm font-medium text-white mb-2">
              Colonna
            </label>
            <select
              id="notebook"
              value={notebook}
              onChange={(e) => setNotebook(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {columns.map((column) => (
                <option key={column.id} value={column.title}>
                  {column.title}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-white/70 italic">
            Tutte le note sono automaticamente condivise con il team
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
  );
}
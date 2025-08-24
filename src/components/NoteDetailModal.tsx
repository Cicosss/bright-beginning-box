import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, Trash2, Save, Calendar, Share2, User } from 'lucide-react';
import { Button } from './ui/button';
import { Note } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import UserMentionDropdown from './UserMentionDropdown';
import { formatRomeDateTime } from '../utils/dateUtils';
import { generateAvatarUrl } from '../utils/avatarGenerator';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface NoteDetailModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  columns: Array<{ id: string; title: string; color: string }>;
}

const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  isOpen,
  onClose,
  onUpdateNote,
  onDeleteNote,
  columns
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notebook, setNotebook] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [lastModifiedByProfile, setLastModifiedByProfile] = useState<Profile | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Load note data when modal opens
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setNotebook(note.notebook);
      setIsShared(note.isShared);
    }
  }, [note]);

  // Fetch profiles for mentions and last modified user
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url');
      
      if (profilesData) {
        setProfiles(profilesData);
        
        // Find profile of user who last modified the note
        if (note?.lastModifiedBy) {
          const modifierProfile = profilesData.find(p => p.id === note.lastModifiedBy);
          setLastModifiedByProfile(modifierProfile || null);
        }
      }
    };

    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen, note?.lastModifiedBy]);

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
      
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
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
    if (contentRef.current) {
      const cursorPos = contentRef.current.selectionStart;
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
          contentRef.current?.setSelectionRange(newCursorPos, newCursorPos);
          contentRef.current?.focus();
        }, 0);
      }
    }
  };

  const handleSave = async () => {
    if (!note) return;

    try {
      await onUpdateNote(note.id, {
        title: title.trim(),
        content: content.trim(),
        notebook,
        isShared,
        lastModifiedBy: user?.id,
        lastModifiedAt: new Date()
      });

      // Handle mentions separately
      const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
      const mentions = [...content.matchAll(mentionRegex)];
      
      if (mentions.length > 0) {
        // Delete old mentions
        await (supabase.rpc as any)('delete_note_mentions', { note_id: note.id });

        // Insert new mentions
        const mentionsData = mentions
          .map(match => {
            const mentionedUser = profiles.find(p => 
              p.name.toLowerCase() === match[1].toLowerCase()
            );
            return mentionedUser ? {
              note_id: note.id,
              mentioned_user_id: mentionedUser.id
            } : null;
          })
          .filter(Boolean);

        if (mentionsData.length > 0) {
          await (supabase.rpc as any)('insert_note_mentions', { 
            mentions_data: JSON.stringify(mentionsData) 
          });
        }
      } else {
        // No mentions, just delete old ones if any
        await (supabase.rpc as any)('delete_note_mentions', { note_id: note.id });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Errore nel salvataggio nota:', error);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    
    if (window.confirm('Sei sicuro di voler eliminare questa nota? Questa azione non può essere annullata.')) {
      try {
        await onDeleteNote(note.id);
        onClose();
      } catch (error) {
        console.error('Errore nell\'eliminazione nota:', error);
      }
    }
  };

  const renderContentWithMentions = (text: string) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add mention
      parts.push(
        <span key={match.index} className="bg-primary/20 text-primary px-1 rounded font-medium">
          @{match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Dettaglio Nota</h2>
              <p className="text-sm text-gray-600">{notebook}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Modifica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titolo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Titolo della nota..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenuto
                </label>
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={handleContentChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Scrivi il contenuto della nota... (usa @ per menzionare)"
                  rows={8}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colonna
                  </label>
                  <select
                    value={notebook}
                    onChange={(e) => setNotebook(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.title}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                      className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">Condividi con il team</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Salva Modifiche
                </Button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{note.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Creata: {formatRomeDateTime(note.lastModified)}</span>
                  </div>
                  {note.isShared && (
                    <div className="flex items-center gap-1">
                      <Share2 className="w-4 h-4" />
                      <span>Condivisa</span>
                    </div>
                  )}
                </div>
              </div>

              {note.content && (
                <div className="prose max-w-none">
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {renderContentWithMentions(note.content)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Last Modified Info */}
        {!isEditing && (note.lastModifiedAt || note.lastModifiedBy) && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
              <User className="w-3 h-3" />
              <span>
                Ultima modifica di{' '}
                <span className="font-medium">
                  {lastModifiedByProfile?.name || 'Utente sconosciuto'}
                </span>
                {' '}
                {note.lastModifiedAt && formatRomeDateTime(note.lastModifiedAt)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteDetailModal;
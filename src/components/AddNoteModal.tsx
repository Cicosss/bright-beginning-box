import React, { useState } from 'react';
import { Note } from '../types';
import { Button } from './ui/button';
import { X, FileText } from 'lucide-react';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'lastModified'>) => void;
  columns: Array<{ id: string; title: string; color: string }>;
}

export function AddNoteModal({ isOpen, onClose, onSave, columns }: AddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notebook, setNotebook] = useState(columns[0]?.title || 'Idee');
  const [isShared, setIsShared] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim(),
      notebook,
      isShared,
    });

    // Reset form
    setTitle('');
    setContent('');
    setNotebook(columns[0]?.title || 'Idee');
    setIsShared(false);
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setNotebook(columns[0]?.title || 'Idee');
    setIsShared(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md">
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
              Titolo *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Inserisci il titolo della nota..."
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-foreground mb-2">
              Contenuto
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Flag, User, CheckCircle2, Circle, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Task, Priority } from '../types';
import { supabase } from '../integrations/supabase/client';
import UserMentionDropdown from './UserMentionDropdown';
import { useAuth } from '../hooks/useAuth';

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

interface TaskCardWithMentionsProps {
  task: Task;
  onToggleTask: (task: Task) => void;
  onEditTask: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  editingTask: string | null;
  editTitle: string;
  setEditTitle: (title: string) => void;
  startEditing: (task: Task) => void;
  cancelEditing: () => void;
}

const TaskCardWithMentions: React.FC<TaskCardWithMentionsProps> = ({
  task,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  editingTask,
  editTitle,
  setEditTitle,
  startEditing,
  cancelEditing
}) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url');
      
      if (profilesData) {
        setProfiles(profilesData);
      }
    };

    fetchProfiles();
  }, []);

  const getPriorityConfig = (priority: Priority) => {
    const configs = {
      [Priority.Low]: { color: 'text-green-600 bg-green-50', label: 'Bassa', icon: '🟢' },
      [Priority.Medium]: { color: 'text-yellow-600 bg-yellow-50', label: 'Media', icon: '🟡' },
      [Priority.High]: { color: 'text-red-600 bg-red-50', label: 'Alta', icon: '🔴' }
    };
    return configs[priority] || configs[Priority.Medium];
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const taskDate = new Date(date);
    const diffDays = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Domani';
    if (diffDays === -1) return 'Ieri';
    if (diffDays < 0) return `${Math.abs(diffDays)} giorni fa`;
    return `Tra ${diffDays} giorni`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditTitle(value);

    // Check for @ mentions
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1) {
      const searchQuery = value.substring(atIndex + 1);
      setMentionSearchQuery(searchQuery);
      
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX + (atIndex * 8)
        });
      }
      
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectUser = (selectedUser: Profile) => {
    const atIndex = editTitle.lastIndexOf('@');
    const beforeMention = editTitle.substring(0, atIndex);
    const afterMention = editTitle.substring(atIndex + mentionSearchQuery.length + 1);
    const newTitle = `${beforeMention}@${selectedUser.name} ${afterMention}`;
    
    setEditTitle(newTitle);
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };

  const handleSaveTask = async () => {
    if (!editTitle.trim()) return;

    try {
      // Save the task
      await onEditTask(task.id, editTitle);

      // Handle mentions
      const mentionRegex = /@([^@\s]+)/g;
      const mentions = [...editTitle.matchAll(mentionRegex)];
      
      if (mentions.length > 0) {
        // Delete old mentions
        await (supabase.rpc as any)('delete_task_mentions', { task_id: task.id });

        // Insert new mentions
        const mentionsData = mentions
          .map(match => {
            const mentionedUser = profiles.find(p => 
              p.name.toLowerCase() === match[1].toLowerCase()
            );
            return mentionedUser ? {
              task_id: task.id,
              mentioned_user_id: mentionedUser.id
            } : null;
          })
          .filter(Boolean);

        if (mentionsData.length > 0) {
          await (supabase.rpc as any)('insert_task_mentions', { 
            mentions_data: JSON.stringify(mentionsData) 
          });
        }
      } else {
        // No mentions, just delete old ones if any
        await (supabase.rpc as any)('delete_task_mentions', { task_id: task.id });
      }
    } catch (error) {
      console.error('Errore nel salvataggio task:', error);
    }
  };

  const renderTitleWithMentions = (title: string) => {
    const mentionRegex = /@([^@\s]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(title)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(title.substring(lastIndex, match.index));
      }

      // Add mention
      parts.push(
        <span key={match.index} className="bg-primary/20 text-primary px-1 rounded">
          @{match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < title.length) {
      parts.push(title.substring(lastIndex));
    }

    return parts.length > 0 ? parts : title;
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      className={`
        group p-4 border border-border rounded-lg transition-all duration-200 
        ${task.completed ? 'bg-muted/50 opacity-75' : 'bg-background hover:shadow-md'}
        ${isOverdue ? 'border-red-200 bg-red-50/50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleTask(task)}
          className="mt-1 text-primary hover:text-primary/80"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0 relative">
          {editingTask === task.id ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={handleInputChange}
                className="flex-1 px-2 py-1 border border-border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTask();
                  if (e.key === 'Escape') cancelEditing();
                }}
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveTask}
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
              >
                <X className="w-4 h-4" />
              </Button>
              
              <UserMentionDropdown
                profiles={profiles}
                searchQuery={mentionSearchQuery}
                onSelectUser={handleSelectUser}
                isVisible={showMentionDropdown}
                position={dropdownPosition}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {renderTitleWithMentions(task.title)}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig.color}`}>
                  {priorityConfig.icon} {priorityConfig.label}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{task.assignedTo.name}</span>
                </div>
                
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                )}
                
                {task.subTasks && Array.isArray(task.subTasks) && task.subTasks.length > 0 && (
                  <span>
                    {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length} subtask
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        
        {editingTask !== task.id && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEditing(task)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDeleteTask(task.id)}
              className="text-destructive hover:text-destructive/90"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCardWithMentions;
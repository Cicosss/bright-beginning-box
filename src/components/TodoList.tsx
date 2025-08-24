import React, { useState, useCallback } from 'react';
import { Plus, Calendar, Flag, User, CheckCircle2, Circle, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import { Task, Priority } from '../types';
import { supabase } from '../integrations/supabase/client';
import TaskCardWithMentions from './TaskCardWithMentions';

interface TodoListProps {
  onTaskClick?: (task: Task) => void;
}

interface NewTask {
  title: string;
  category: string;
  priority: Priority;
  dueDate: string;
  assignedTo?: string;
}

const TodoList: React.FC<TodoListProps> = ({ onTaskClick }) => {
  const { tasks, loading, updateTask } = useTasks();
  const { user } = useAuth();
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newTask, setNewTask] = useState<NewTask>({
    title: '',
    category: 'Generale',
    priority: Priority.Medium,
    dueDate: '',
    assignedTo: ''
  });

  // Priorità con colori e icone
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

  const handleToggleTask = useCallback(async (task: Task) => {
    await updateTask(task.id, { completed: !task.completed });
  }, [updateTask]);

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          category: newTask.category,
          priority: newTask.priority,
          due_date: newTask.dueDate || null,
          assigned_to: newTask.assignedTo || user.id,
          created_by: user.id
        });

      if (error) throw error;

      setNewTask({ title: '', category: 'Generale', priority: Priority.Medium, dueDate: '', assignedTo: '' });
      setShowNewTaskForm(false);
    } catch (error) {
      console.error('Errore nella creazione task:', error);
    }
  };

  const handleEditTask = async (taskId: string, title: string) => {
    if (!title.trim()) return;

    try {
      await updateTask(taskId, { title });
      setEditingTask(null);
      setEditTitle('');
    } catch (error) {
      console.error('Errore nell\'aggiornamento task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Errore nell\'eliminazione task:', error);
    }
  };

  const startEditing = (task: Task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setEditTitle('');
  };

  // Raggruppa task per categoria
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category || 'Generale';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Accedi per gestire i tuoi task</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">To-Do List Collaborativa</h2>
            <p className="text-muted-foreground">
              {completedTasks} di {totalTasks} task completati
            </p>
          </div>
          <Button onClick={() => setShowNewTaskForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuovo Task
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Form nuovo task */}
      {showNewTaskForm && (
        <div className="p-6 border-b border-border bg-muted/50">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Inserisci il titolo del task..."
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
            
            <div className="flex gap-4 flex-wrap">
              <select
                value={newTask.category}
                onChange={(e) => setNewTask(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Generale">Generale</option>
                <option value="Spedizioni">Spedizioni</option>
                <option value="Clienti">Clienti</option>
                <option value="Amministrazione">Amministrazione</option>
              </select>
              
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as Priority }))}
                className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={Priority.Low}>Bassa</option>
                <option value={Priority.Medium}>Media</option>
                <option value={Priority.High}>Alta</option>
              </select>
              
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewTaskForm(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateTask} disabled={!newTask.title.trim()}>
                Crea Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista task */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Caricamento task...</p>
            </div>
          </div>
        ) : Object.keys(tasksByCategory).length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nessun task ancora</h3>
              <p>Inizia creando il tuo primo task!</p>
              <Button 
                onClick={() => setShowNewTaskForm(true)} 
                className="mt-4 gap-2"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                Crea il primo task
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  {category}
                   <span className="text-sm text-muted-foreground font-normal">
                     ({(categoryTasks as Task[]).filter(t => !t.completed).length})
                   </span>
                </h3>
                
                 <div className="space-y-2">
                   {(categoryTasks as Task[]).map((task) => (
                     <TaskCardWithMentions
                       key={task.id}
                       task={task}
                       onToggleTask={handleToggleTask}
                       onEditTask={handleEditTask}
                       onDeleteTask={handleDeleteTask}
                       editingTask={editingTask}
                       editTitle={editTitle}
                       setEditTitle={setEditTitle}
                       startEditing={startEditing}
                       cancelEditing={cancelEditing}
                     />
                   ))}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;
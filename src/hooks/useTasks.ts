import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Task, Priority } from '../types';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to:profiles!tasks_assigned_to_fkey(*),
          sub_tasks(*)
        `);

      if (error) throw error;

      const mappedTasks: Task[] = (tasksData || []).map(t => ({
        id: t.id,
        title: t.title,
        assignedTo: {
          id: t.assigned_to?.id || '',
          name: t.assigned_to?.name || 'Non assegnato',
          avatarUrl: t.assigned_to?.avatar_url || 'https://picsum.photos/100/100'
        },
        dueDate: new Date(t.due_date || Date.now()),
        priority: t.priority as Priority || Priority.Medium,
        tags: t.tags || [],
        category: t.category || 'Generale',
        subTasks: (t.sub_tasks || []).map(st => ({
          id: st.id,
          text: st.text,
          completed: st.completed
        })),
        completed: t.completed || false
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error('Errore nel caricamento task:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: updates.completed,
          title: updates.title,
          category: updates.category,
          tags: updates.tags,
          due_date: updates.dueDate?.toISOString(),
          priority: updates.priority
        })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, ...updates } : t)
      );
    } catch (error) {
      console.error('Errore nell\'aggiornamento task:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Set up real-time listeners for tasks and sub_tasks
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Task change:', payload);
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sub_tasks'
        },
        (payload) => {
          console.log('Sub-task change:', payload);
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: {
    title: string;
    category?: string;
    priority?: Priority;
    dueDate?: string;
    assignedTo?: string;
    tags?: string[];
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          category: taskData.category || 'Generale',
          priority: taskData.priority || Priority.Medium,
          due_date: taskData.dueDate || null,
          assigned_to: taskData.assignedTo || user.id,
          created_by: user.id,
          tags: taskData.tags || []
        });

      if (error) throw error;
      
      // Real-time will handle the update, but we can also refetch to be sure
      await fetchTasks();
    } catch (error) {
      console.error('Errore nella creazione task:', error);
      throw error;
    }
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    refetch: fetchTasks,
    updateTask,
    createTask
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { CalendarEvent } from '../types';

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      // Recupera eventi del calendario dal database
      const { data: calendarEventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*');

      if (eventsError) throw eventsError;

      // Recupera task e spedizioni per creare eventi automatici
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .not('due_date', 'is', null);

      if (tasksError) throw tasksError;

      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .not('due_date', 'is', null);

      if (shipmentsError) throw shipmentsError;

      // Converti eventi del calendario
      const calendarEvents: CalendarEvent[] = (calendarEventsData || []).map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        type: event.type as CalendarEvent['type'],
        resourceId: event.resource_id || ''
      }));

      // Converti task in eventi
      const taskEvents: CalendarEvent[] = (tasksData || []).map(task => ({
        id: `task-${task.id}`,
        title: `📋 ${task.title}`,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        type: 'task' as const,
        resourceId: task.id
      }));

      // Converti spedizioni in eventi
      const shipmentEvents: CalendarEvent[] = (shipmentsData || []).map(shipment => ({
        id: `shipment-${shipment.id}`,
        title: `📦 ${shipment.order_number}`,
        start: new Date(shipment.due_date),
        end: new Date(shipment.due_date),
        type: 'shipment' as const,
        resourceId: shipment.id
      }));

      setEvents([...calendarEvents, ...taskEvents, ...shipmentEvents]);
    } catch (error) {
      console.error('Errore nel caricamento eventi calendario:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (eventData: {
    title: string;
    start_time: string;
    end_time: string;
    type: 'meeting' | 'pickup';
    resource_id?: string;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Utente non autenticato');

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          created_by: user.user.id
        });

      if (error) throw error;
      
      await fetchEvents();
      return { success: true };
    } catch (error) {
      console.error('Errore nella creazione evento:', error);
      return { success: false, error };
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (eventId: string, updates: {
    title?: string;
    start_time?: string;
    end_time?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;
      
      await fetchEvents();
      return { success: true };
    } catch (error) {
      console.error('Errore nell\'aggiornamento evento:', error);
      return { success: false, error };
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      await fetchEvents();
      return { success: true };
    } catch (error) {
      console.error('Errore nell\'eliminazione evento:', error);
      return { success: false, error };
    }
  }, [fetchEvents]);

  useEffect(() => {
    fetchEvents();

    // Subscription per aggiornamenti in tempo reale
    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        () => {
          fetchEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          fetchEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents
  };
};
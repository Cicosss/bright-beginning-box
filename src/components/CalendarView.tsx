import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { CalendarEvent } from '../types';
import { useAuth } from '../hooks/useAuth';

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

interface NewEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'pickup';
}

function CalendarView({ onEventClick }: CalendarViewProps) {
  const { events, loading, createEvent } = useCalendarEvents();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting'
  });

  // Navigazione calendario
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Ottieni giorni del mese
  const getDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Giorni del mese precedente
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Giorni del mese corrente
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    
    // Giorni del mese successivo per completare la griglia
    const remainingDays = 42 - days.length; // 6 settimane * 7 giorni
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  // Filtra eventi per giorno
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Colori per tipo di evento
  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'shipment': return 'bg-blue-500 text-white';
      case 'task': return 'bg-green-500 text-white';
      case 'pickup': return 'bg-orange-500 text-white';
      case 'meeting': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;

    const startDateTime = `${newEvent.date}T${newEvent.startTime}:00`;
    const endDateTime = `${newEvent.date}T${newEvent.endTime}:00`;

    const result = await createEvent({
      title: newEvent.title,
      start_time: startDateTime,
      end_time: endDateTime,
      type: newEvent.type
    });

    if (result.success) {
      setNewEvent({ title: '', date: '', startTime: '09:00', endTime: '10:00', type: 'meeting' });
      setShowNewEventForm(false);
    }
  };

  const handleDayClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setNewEvent(prev => ({ ...prev, date: dateString }));
    setShowNewEventForm(true);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Accedi per visualizzare il calendario</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Calendario</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Oggi
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => setShowNewEventForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuovo Evento
          </Button>
        </div>

        <h3 className="text-xl font-semibold">
          {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </h3>
      </div>

      {/* Form nuovo evento */}
      {showNewEventForm && (
        <div className="p-6 border-b border-border bg-muted/50">
          <h4 className="font-semibold mb-4">Nuovo Evento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Titolo evento..."
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="time"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="time"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-4 mt-4">
            <select
              value={newEvent.type}
              onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as 'meeting' | 'pickup' }))}
              className="px-3 py-2 border border-border rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="meeting">Riunione</option>
              <option value="pickup">Ritiro</option>
            </select>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setShowNewEventForm(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.date}>
                Crea Evento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Calendario */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>Caricamento calendario...</p>
            </div>
          </div>
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {/* Header giorni della settimana */}
            <div className="grid grid-cols-7 border-b border-border">
              {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
                <div key={day} className="p-4 text-center font-medium text-muted-foreground bg-muted">
                  {day}
                </div>
              ))}
            </div>

            {/* Griglia calendario */}
            <div className="grid grid-cols-7">
              {getDaysInMonth.map((day, index) => {
                const dayEvents = getEventsForDay(day.date);
                const isCurrentMonth = day.isCurrentMonth;
                const isTodayDate = isToday(day.date);

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[120px] border-r border-b border-border p-2 cursor-pointer hover:bg-muted/50 transition-colors
                      ${!isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : 'bg-background'}
                    `}
                    onClick={() => handleDayClick(day.date)}
                  >
                    <div className={`
                      text-sm font-medium mb-2 w-8 h-8 flex items-center justify-center rounded-full
                      ${isTodayDate ? 'bg-primary text-primary-foreground' : ''}
                    `}>
                      {day.date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`
                            text-xs px-2 py-1 rounded text-white cursor-pointer hover:opacity-80 truncate
                            ${getEventTypeColor(event.type)}
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} altri
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarView;
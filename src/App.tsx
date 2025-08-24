import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { KanbanColumnID, Shipment, Task, CalendarEvent, Email, Note, Priority, User, SubTask, Product } from './types';
import { MOCK_NOTES, USERS, KANBAN_COLUMNS, GOOGLE_CLIENT_ID } from './constants';
import { useAuth } from './hooks/useAuth';
import { useShipments } from './hooks/useShipments';
import { useTasks } from './hooks/useTasks';
import { useNotes } from './hooks/useNotes';
import AuthPage from './components/AuthPage';

declare const google: any;

// --- Utility Functions ---
const getPriorityClass = (priority: Priority) => {
  switch (priority) {
    case Priority.High: return 'bg-red-500 hover:bg-red-600';
    case Priority.Medium: return 'bg-yellow-500 hover:bg-yellow-600';
    case Priority.Low: return 'bg-green-500 hover:bg-green-600';
    default: return 'bg-gray-400';
  }
};

const getEventTypeClass = (type: CalendarEvent['type']) => {
    switch(type) {
      case 'shipment': return 'bg-red-500 border-red-700';
      case 'task': return 'bg-yellow-500 border-yellow-700';
      case 'pickup': return 'bg-green-500 border-green-700';
      case 'meeting': return 'bg-purple-500 border-purple-700';
      default: return 'bg-gray-500';
    }
};

// --- ICON Component ---
const Icon = ({ name, className }: { name: string; className?: string }) => (
  <i className={`fa-solid ${name} ${className || ''}`}></i>
);

// --- SIDEBAR Component ---
const Sidebar = ({ activeView, setActiveView, onSignOut }: { activeView: string, setActiveView: (view: string) => void, onSignOut: () => void }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: 'fa-table-columns' },
    { id: 'kanban', name: 'Spedizioni', icon: 'fa-brands fa-trello' },
    { id: 'todo', name: 'To-Do List', icon: 'fa-list-check' },
    { id: 'calendar', name: 'Calendario', icon: 'fa-calendar-days' },
    { id: 'gmail', name: 'Gmail', icon: 'fa-envelope' },
    { id: 'notes', name: 'Blocco Note', icon: 'fa-note-sticky' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col shadow-lg flex-shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
        <Icon name="fa-truck-fast" className="text-2xl text-blue-500" />
        <h1 className="text-xl font-bold">RM Dashboard</h1>
      </div>
      <nav className="flex-grow p-4">
        <ul>
          {menuItems.map(item => (
            <li key={item.id} className="mb-2">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveView(item.id); }}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                  activeView === item.id 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon name={item.icon} className="w-5 text-center" />
                <span>{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-3">
          <img src={USERS[0].avatarUrl} alt={USERS[0].name} className="w-10 h-10 rounded-full" />
          <div>
            <p className="font-semibold">{USERS[0].name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Responsabile</p>
          </div>
        </div>
        <button 
          onClick={onSignOut}
          className="btn btn-secondary w-full text-sm"
        >
          <Icon name="fa-sign-out-alt" className="mr-2" />
          Esci
        </button>
      </div>
    </aside>
  );
};

// --- HEADER Component ---
const Header = ({ title, theme, onToggleTheme, onSearch }: { title: string, theme: string, onToggleTheme: () => void, onSearch: (query: string) => void }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputValue);
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 p-4 shadow-md flex justify-between items-center z-10">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSubmit} className="relative">
            <input 
              type="text" 
              placeholder="Cerca tag, menzioni..." 
              className="pl-10 pr-4 py-2 w-64 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Icon name="fa-search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </form>
        <button onClick={onToggleTheme} className="p-2 w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center">
          <Icon name={theme === 'dark' ? 'fa-sun' : 'fa-moon'} />
        </button>
        <button className="p-2 w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <Icon name="fa-bell" />
        </button>
        <button className="p-2 w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <Icon name="fa-cog" />
        </button>
      </div>
    </header>
  );
};

// --- DASHBOARD VIEW ---
const DashboardView = ({ 
    shipments, 
    tasks, 
    events, 
    notes,
    onCardClick, 
    onTaskClick,
    onNoteClick,
    onEventClick
}: { 
    shipments: Shipment[], 
    tasks: Task[], 
    events: CalendarEvent[],
    notes: Note[],
    onCardClick: (s: Shipment) => void, 
    onTaskClick: (t: Task) => void,
    onNoteClick: (n: Note) => void,
    onEventClick: (e: CalendarEvent) => void,
}) => {
  const summary = {
    pendingShipments: shipments.filter(s => s.status === KanbanColumnID.ToDo || s.status === KanbanColumnID.InProgress).length,
    tasksDueToday: tasks.filter(t => !t.completed && new Date(t.dueDate).toDateString() === new Date().toDateString()).length,
    nextPickup: events.find(e => e.type === 'pickup' && e.start > new Date())
  };

  const SummaryCard = ({ icon, title, value, color }: {icon: string, title: string, value: React.ReactNode, color: string}) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
      <div className={`p-3 rounded-full ${color} text-white`}>
        <Icon name={icon} className="text-2xl w-8 h-8 flex items-center justify-center" />
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
  
  const shipmentsByStatus = {
    [KanbanColumnID.ToDo]: shipments.filter(s => s.status === KanbanColumnID.ToDo),
    [KanbanColumnID.InProgress]: shipments.filter(s => s.status === KanbanColumnID.InProgress),
    [KanbanColumnID.Ready]: shipments.filter(s => s.status === KanbanColumnID.Ready),
  };
  
  const DashboardShipmentCard: React.FC<{shipment: Shipment, onClick: () => void}> = ({shipment, onClick}) => (
    <div onClick={onClick} className="p-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border dark:border-gray-200 dark:border-gray-700/50">
        <div className="flex justify-between items-center">
            <p className="font-semibold text-sm">{shipment.orderNumber}</p>
            <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full ${getPriorityClass(shipment.priority)}`}>{shipment.priority.slice(0,1)}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">{shipment.customer.name}</p>
        <p className="text-xs text-right text-gray-500 mt-1">{shipment.dueDate.toLocaleDateString()}</p>
    </div>
  );
  
  const recentTasks = tasks.filter(t => !t.completed).sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5);
  const recentNotes = notes.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()).slice(0, 3);
  const todayEvents = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).sort((a,b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard icon="fa-box" title="Spedizioni in attesa" value={summary.pendingShipments} color="bg-blue-500" />
        <SummaryCard icon="fa-list-check" title="Task in scadenza oggi" value={summary.tasksDueToday} color="bg-yellow-500" />
        <SummaryCard 
          icon="fa-truck" 
          title="Prossimo ritiro" 
          value={summary.nextPickup ? `${summary.nextPickup.title} @ ${summary.nextPickup.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Nessuno'}
          color="bg-green-500" 
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="font-bold text-xl mb-4">Panoramica Spedizioni</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.keys(shipmentsByStatus) as KanbanColumnID[]).map(status => (
                  <div key={status}>
                      <div className="flex items-center mb-3">
                          <h4 className="font-semibold text-md">{status}</h4>
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                              {shipmentsByStatus[status].length}
                          </span>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                        {shipmentsByStatus[status].length > 0 ? (
                            shipmentsByStatus[status]
                                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                                .map(s => <DashboardShipmentCard key={s.id} shipment={s} onClick={() => onCardClick(s)} />)
                        ) : (
                            <p className="text-sm text-gray-500 italic mt-4">Nessuna spedizione in questa fase.</p>
                        )}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg mb-4">Task Urgenti</h3>
              <ul className="space-y-2">
                  {recentTasks.map(t => (
                      <li key={t.id} onClick={() => onTaskClick(t)} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <div>
                              <p className="font-semibold">{t.title}</p>
                              <p className="text-sm text-gray-500">{t.assignedTo.name}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-sm">{t.dueDate.toLocaleDateString()}</p>
                               <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getPriorityClass(t.priority)}`}>{t.priority}</span>
                          </div>
                      </li>
                  ))}
              </ul>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg mb-4">Note Recenti</h3>
              <ul className="space-y-2">
                  {recentNotes.map(n => (
                      <li key={n.id} onClick={() => onNoteClick(n)} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <Icon name="fa-note-sticky" className="text-yellow-400" />
                          <div>
                              <p className="font-semibold">{n.title}</p>
                              <p className="text-sm text-gray-500">{n.notebook}</p>
                          </div>
                      </li>
                  ))}
              </ul>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="font-bold text-lg mb-4">Eventi di Oggi</h3>
              <ul className="space-y-2">
                  {todayEvents.length > 0 ? todayEvents.map(e => (
                      <li key={e.id} onClick={() => onEventClick(e)} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${getEventTypeClass(e.type)}`}></span>
                          <div>
                              <p className="font-semibold">{e.title}</p>
                              <p className="text-sm text-gray-500">{e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                      </li>
                  )) : <p className="text-sm text-gray-500">Nessun evento per oggi.</p>}
              </ul>
          </div>
      </div>
    </div>
  );
};

// --- KANBAN VIEW ---
const KanbanCard: React.FC<{ shipment: Shipment, onClick: () => void }> = ({ shipment, onClick }) => (
    <div 
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('shipmentId', shipment.id);
      }}
      onClick={onClick} 
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 cursor-pointer hover:shadow-xl transition-shadow"
    >
        <div className="flex justify-between items-start">
            <h4 className="font-bold text-md">{shipment.orderNumber}</h4>
            <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getPriorityClass(shipment.priority)}`}>
                {shipment.priority}
            </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{shipment.customer.name}</p>
        <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Icon name="fa-calendar-alt" />
                <span>{shipment.dueDate.toLocaleDateString()}</span>
            </div>
            <img src={shipment.assignedTo.avatarUrl} alt={shipment.assignedTo.name} className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-gray-800" />
        </div>
    </div>
);

const KanbanColumn: React.FC<{ title: KanbanColumnID, shipments: Shipment[], onCardClick: (shipment: Shipment) => void, onUpdateStatus: (shipmentId: string, newStatus: KanbanColumnID) => void }> = ({ title, shipments, onCardClick, onUpdateStatus }) => {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const shipmentId = e.dataTransfer.getData('shipmentId');
        if (shipmentId) {
            onUpdateStatus(shipmentId, title);
        }
    };

    return (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="bg-gray-200 dark:bg-gray-900 rounded-lg p-3 w-80 flex-shrink-0"
        >
            <h3 className="font-bold text-lg mb-4 px-2">{title} ({shipments.length})</h3>
            <div className="min-h-[200px]">
                {shipments.map(shipment => (
                    <KanbanCard key={shipment.id} shipment={shipment} onClick={() => onCardClick(shipment)} />
                ))}
            </div>
        </div>
    );
};

// Simple modal for shipment details
const ShipmentModal = ({ shipment, onClose }: { shipment: Shipment | null, onClose: () => void }) => {
    if (!shipment) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-2xl font-bold">{shipment.orderNumber}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition">
                        <Icon name="fa-times" className="text-2xl" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold mb-2">Cliente</h4>
                            <p>{shipment.customer.name}</p>
                            <p className="text-sm text-gray-500">{shipment.customer.address}</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">Dettagli</h4>
                            <p><strong>Tracking:</strong> {shipment.trackingNumber}</p>
                            <p><strong>Scadenza:</strong> {shipment.dueDate.toLocaleDateString()}</p>
                            <p><strong>Priorità:</strong> <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getPriorityClass(shipment.priority)}`}>{shipment.priority}</span></p>
                            <p><strong>Assegnato a:</strong> {shipment.assignedTo.name}</p>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h4 className="font-bold mb-2">Prodotti</h4>
                        <ul className="list-disc list-inside">
                            {shipment.products.map(p => (
                                <li key={p.id}>{p.quantity}x {p.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KanbanView = ({ shipments, onCardClick, onUpdateStatus }: { shipments: Shipment[], onCardClick: (shipment: Shipment) => void, onUpdateStatus: (shipmentId: string, newStatus: KanbanColumnID) => void }) => {
    const shipmentsByStatus = useMemo(() => {
        return KANBAN_COLUMNS.reduce((acc, status) => {
            acc[status] = shipments.filter(s => s.status === status);
            return acc;
        }, {} as Record<KanbanColumnID, Shipment[]>);
    }, [shipments]);

    return (
        <div className="p-6 overflow-x-auto">
            <div className="flex space-x-6 min-w-max">
                {KANBAN_COLUMNS.map(status => (
                    <KanbanColumn
                        key={status}
                        title={status}
                        shipments={shipmentsByStatus[status]}
                        onCardClick={onCardClick}
                        onUpdateStatus={onUpdateStatus}
                    />
                ))}
            </div>
        </div>
    );
};

// Simple Task List View
const TaskListView = ({ tasks, onTaskClick }: { tasks: Task[], onTaskClick: (task: Task) => void }) => {
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Lista Task</h3>
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => onTaskClick(task)}>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${task.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div>
                    <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</p>
                    <p className="text-sm text-gray-500">{task.assignedTo.name} • {task.category}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getPriorityClass(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="text-sm text-gray-500">{task.dueDate.toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Notes View
const NotesView = ({ notes, onNoteClick }: { notes: Note[], onNoteClick: (note: Note) => void }) => {
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Note</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div key={note.id} className="p-4 border rounded-lg hover:shadow-md cursor-pointer" onClick={() => onNoteClick(note)}>
                <div className="flex items-center space-x-2 mb-2">
                  <Icon name="fa-note-sticky" className="text-yellow-400" />
                  <h4 className="font-semibold">{note.title}</h4>
                </div>
                <p className="text-sm text-gray-500 mb-2">{note.notebook}</p>
                <p className="text-sm line-clamp-3">{note.content}</p>
                <p className="text-xs text-gray-400 mt-2">{note.lastModified.toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple placeholder views
const CalendarView = () => (
  <div className="p-6">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Calendario</h3>
      <p className="text-gray-500">Vista calendario in sviluppo...</p>
    </div>
  </div>
);

const GmailView = () => (
  <div className="p-6">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Gmail</h3>
      <p className="text-gray-500">Integrazione Gmail in sviluppo...</p>
    </div>
  </div>
);

// Main App Component
export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { shipments, loading: shipmentsLoading, updateShipmentStatus } = useShipments();
  const { tasks, loading: tasksLoading, updateTask } = useTasks();
  const { notes, loading: notesLoading, createNote, updateNote } = useNotes();
  
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Mock events for now
  const events = useMemo<CalendarEvent[]>(() => [], []);

  // Show loading screen during auth check
  if (authLoading || shipmentsLoading || tasksLoading || notesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary">
          <i className="fas fa-spinner animate-spin text-3xl"></i>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated  
  if (!user) {
    return <AuthPage />;
  }

  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            shipments={shipments}
            tasks={tasks}
            events={events}
            notes={notes}
            onCardClick={setSelectedShipment}
            onTaskClick={setSelectedTask}
            onNoteClick={setSelectedNote}
            onEventClick={setSelectedEvent}
          />
        );
      case 'kanban':
        return (
          <KanbanView
            shipments={shipments}
            onCardClick={setSelectedShipment}
            onUpdateStatus={updateShipmentStatus}
          />
        );
      case 'todo':
        return <TaskListView tasks={tasks} onTaskClick={setSelectedTask} />;
      case 'calendar':
        return <CalendarView />;
      case 'gmail':
        return <GmailView />;
      case 'notes':
        return <NotesView notes={notes} onNoteClick={setSelectedNote} />;
      default:
        return <div className="p-6">Vista non trovata</div>;
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'kanban': return 'Spedizioni';
      case 'todo': return 'To-Do List';
      case 'calendar': return 'Calendario';
      case 'gmail': return 'Gmail';
      case 'notes': return 'Blocco Note';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        onSignOut={handleSignOut}
      />
      
      <div className="flex-grow flex flex-col overflow-hidden">
        <Header 
          title={getViewTitle()}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSearch={handleSearch}
        />
        
        <main className="flex-grow overflow-y-auto">
          {renderView()}
        </main>
      </div>

      {/* Modals */}
      <ShipmentModal 
        shipment={selectedShipment}
        onClose={() => setSelectedShipment(null)}
      />
    </div>
  );
}
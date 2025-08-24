import { useState } from 'react';
import { Package, Calendar, StickyNote, Users, MessageSquare, Bell } from 'lucide-react';
import AuthPage from './components/AuthPage';
import { KanbanView } from './components/KanbanView';
import CalendarView from './components/CalendarView';
import TodoList from './components/TodoList';
import { NotesView } from './components/NotesView';
import CollapsibleChat from './components/CollapsibleChat';
import { useAuth } from './hooks/useAuth';
import { useNoteMentions } from './hooks/useNoteMentions';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { unreadCount, markMentionsAsRead } = useNoteMentions();
  const [activeTab, setActiveTab] = useState<string>('shipments');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Mark note mentions as read when user clicks on Notes tab
    if (tab === 'notes' && unreadCount > 0) {
      markMentionsAsRead();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const tabs = [
    { id: 'shipments', label: 'Spedizioni', icon: Package, component: KanbanView },
    { 
      id: 'notes', 
      label: 'Note', 
      icon: StickyNote, 
      component: NotesView,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { id: 'tasks', label: 'Tasks', icon: Users, component: TodoList },
    { id: 'calendar', label: 'Calendario', icon: Calendar, component: CalendarView },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || KanbanView;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Sistema RM</h1>
          <p className="text-sm text-muted-foreground">Gestione logistica</p>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <button 
            className="w-full px-3 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
            onClick={() => console.log('Settings')}
          >
            Impostazioni
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {tabs.find(tab => tab.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            <ActiveComponent />
          </div>
        </main>
      </div>

      {/* Chat */}
      <CollapsibleChat />
    </div>
  );
}

export default App;
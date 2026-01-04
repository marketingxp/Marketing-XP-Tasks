import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { GoogleGenAI } from "@google/genai";
import { Column, Task, Client, BoardData, UserSession, Service, TaskComment, AppNotification } from './types';
import { DEFAULT_COLUMNS, INITIAL_TASKS, INITIAL_CLIENTS, DEFAULT_SERVICES } from './constants';
import { getSupabase, syncBoardToSupabase, fetchBoardFromSupabase, subscribeToBoardChanges, SupabaseConfig, initSupabase, isAutoConnected, dispatchEmailNotification } from './supabase';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import GithubImportModal from './components/GithubImportModal';
import DbSettingsModal from './components/DbSettingsModal';
import ClientsView from './components/ClientsView';
import ServicesView from './components/ServicesView';
import ColumnContainer from './components/ColumnContainer';
import LoginView from './components/LoginView';
import ClientProfileView from './components/ClientProfileView';
import { PlusIcon, SearchIcon, SunIcon, MoonIcon, ExportIcon, ImportIcon, LogoutIcon, GithubIcon, CloudIcon, CalendarIcon, SEOIcon } from './components/Icons';

type ViewType = 'board' | 'clients' | 'services' | 'profile';

const STORAGE_KEY = 'marketing_xp_board_v1';
const SESSION_KEY = 'marketing_xp_session';
const THEME_KEY = 'marketing_xp_theme';
const DB_CONFIG_KEY = 'marketing_xp_supabase_config';
const RESEND_API_KEY = 're_WnKEj827_7aAsTY1QAVzDty2EUZ9z4VfX';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [dbConfig, setDbConfig] = useState<SupabaseConfig | null>(() => {
    const saved = localStorage.getItem(DB_CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [dbStatus, setDbStatus] = useState<'idle' | 'syncing' | 'connected' | 'error' | 'local'>(() => {
    if (isAutoConnected()) return 'idle';
    return dbConfig ? 'idle' : 'local';
  });

  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [globalLogo, setGlobalLogo] = useState<string | undefined>();

  const [currentView, setCurrentView] = useState<ViewType>('board');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalColumnId, setModalColumnId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Ref to track the current editing task ID for the WebSocket closure
  const openTaskIdRef = useRef<string | null>(null);

  const isAdmin = session?.role === 'admin';
  const isReadOnly = session?.role === 'client';

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  useEffect(() => {
    if (isReadOnly && session?.clientId) {
      setClientFilter(session.clientId);
      setCurrentView('board');
    }
  }, [isReadOnly, session]);

  const skipNextSync = useRef(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateStateFromRemote = (data: BoardData) => {
    skipNextSync.current = true;
    
    if (data.tasks) {
      setTasks(data.tasks);
      
      // CRITICAL: Directly update the open modal task if it matches the remote data
      // This ensures that even for ReadOnly clients, the task modal state refreshes
      if (openTaskIdRef.current) {
        const matchingTask = data.tasks.find(t => t.id === openTaskIdRef.current);
        if (matchingTask) {
          setEditingTask({ ...matchingTask });
        }
      }
    }

    const remoteColumns = data.columns || DEFAULT_COLUMNS;
    const mergedColumns = [...remoteColumns];
    DEFAULT_COLUMNS.forEach((def, index) => {
      if (!mergedColumns.find(c => c.id === def.id)) mergedColumns.splice(index, 0, def);
    });
    setColumns(mergedColumns);
    if (data.clients) setClients(data.clients);
    if (data.services) setServices(data.services);
    if (data.notifications) setNotifications(data.notifications || []);
    if (data.globalLogo) setGlobalLogo(data.globalLogo);
  };

  // Ensure our ref stays synced with the open modal
  useEffect(() => {
    openTaskIdRef.current = editingTask?.id || null;
  }, [editingTask?.id]);

  useEffect(() => {
    const setupPersistence = async () => {
      setIsInitializing(true);
      const savedLocal = localStorage.getItem(STORAGE_KEY);
      if (savedLocal) {
        try { updateStateFromRemote(JSON.parse(savedLocal)); } catch (e) {}
      }

      let activeSupabase = getSupabase();
      if (!activeSupabase && dbConfig) activeSupabase = initSupabase(dbConfig);

      if (activeSupabase) {
        setDbStatus('syncing');
        try {
          const remoteData = await fetchBoardFromSupabase();
          if (remoteData) {
            updateStateFromRemote(remoteData);
            setDbStatus('connected');
          } else if (isAdmin) {
            const data: BoardData = { tasks, columns, clients, services, notifications, globalLogo, version: "1.2.0" };
            await syncBoardToSupabase(data, session?.username || 'system');
            setDbStatus('connected');
          }
          
          // Subscribe to live channel for instant propagation
          subscribeToBoardChanges((remoteData) => {
            setIsRemoteUpdate(true);
            updateStateFromRemote(remoteData);
            setTimeout(() => setIsRemoteUpdate(false), 500);
          });
        } catch (err: any) {
          setDbStatus('error');
        }
      } else {
        setDbStatus('local');
      }
      setIsInitializing(false);
    };
    if (session?.isLoggedIn) setupPersistence();
  }, [dbConfig, session?.isLoggedIn]);

  useEffect(() => {
    if (session?.isLoggedIn && !isRemoteUpdate && !isInitializing) {
      if (skipNextSync.current) { skipNextSync.current = false; return; }
      const timeout = setTimeout(async () => {
        const data: BoardData = { tasks, columns, clients, services, notifications, globalLogo, version: "1.2.0" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        const activeSupabase = getSupabase();
        if (activeSupabase) {
          try {
            setDbStatus('syncing');
            await syncBoardToSupabase(data, session.username);
            setDbStatus('connected');
          } catch (e) { setDbStatus('error'); }
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [tasks, columns, clients, services, notifications, globalLogo, session, isRemoteUpdate, isInitializing]);

  const triggerImmediateSync = async (updatedTasks: Task[]) => {
    const activeSupabase = getSupabase();
    if (!activeSupabase || !session?.username) return;
    
    const data: BoardData = { tasks: updatedTasks, columns, clients, services, notifications, globalLogo, version: "1.2.0" };
    try {
      setDbStatus('syncing');
      await syncBoardToSupabase(data, session.username);
      setDbStatus('connected');
    } catch (e) {
      setDbStatus('error');
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>, closeModal: boolean = true) => {
    let finalColumnId = taskData.columnId || 'backlog';
    const taskToSave = { ...taskData, columnId: finalColumnId };

    let nextTasks = [...tasks];
    if (editingTask) {
      const updatedTask = { ...editingTask, ...taskToSave } as Task;
      nextTasks = tasks.map(t => t.id === editingTask.id ? updatedTask : t);
      setTasks(nextTasks);
      if (!closeModal) {
        setEditingTask(updatedTask);
        // Explicitly trigger sync for real-time feedback
        await triggerImmediateSync(nextTasks);
      }
    } else {
      const newTask: Task = { ...taskToSave, id: Math.random().toString(36).substr(2, 9), comments: [] } as Task;
      nextTasks = [newTask, ...tasks];
      setTasks(nextTasks);
      
      if (isReadOnly) {
        const clientName = session?.username || 'Agency Client';
        const newNotif: AppNotification = {
          id: `n-${Date.now()}`,
          taskId: newTask.id,
          clientName,
          message: `Pulse Request: ${newTask.title}`,
          timestamp: new Date().toISOString(),
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
        showToast(`Request queued for review.`, "success");

        const emailBody = `
          <div style="font-family: sans-serif; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="background: #eff6ff; color: #2563eb; padding: 6px 16px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Incoming Pulse Request</span>
            </div>
            <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; font-weight: 800; text-align: center;">${newTask.title}</h2>
          </div>
        `;

        dispatchEmailNotification({
          from: "notifications@updates.marketingxp.co.uk",
          to: "matt@marketingxp.co.uk",
          subject: `[Pulse Request] ${newTask.title} - ${clientName}`,
          html: emailBody,
          resendKey: RESEND_API_KEY
        });
      }
    }

    if (closeModal) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleAuthenticated = (username: string, role: 'admin' | 'client', clientId?: string) => {
    const newSession: UserSession = { isLoggedIn: true, username, lastLogin: new Date().toISOString(), role, clientId };
    setSession(newSession);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setCurrentView('board');
  };

  const handleLogout = () => {
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newMode);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      const matchesClient = clientFilter === 'All' || t.clientId === clientFilter;
      const clientAccess = session?.role === 'client' ? t.clientId === session.clientId : true;
      return matchesSearch && matchesCategory && matchesClient && clientAccess;
    });
  }, [tasks, searchTerm, categoryFilter, clientFilter, session]);

  const renderSyncIndicator = () => {
    switch (dbStatus) {
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-full transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Syncing</span>
          </div>
        );
      case 'connected':
      case 'idle':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-full transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Linked</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-full transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 text-nowrap">Error</span>
          </div>
        );
      case 'local':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Offline</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (!session?.isLoggedIn) return <LoginView onAuthenticated={handleAuthenticated} logo={globalLogo} />;

  const currentClient = clients.find(c => c.id === session.clientId);

  const NavContent = () => (
    <div className="flex items-center gap-1.5">
      <button 
        onClick={() => setCurrentView('board')} 
        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'board' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-premium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
      >
        Workflow
      </button>
      {isAdmin ? (
        <>
          <button 
            onClick={() => setCurrentView('clients')} 
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'clients' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-premium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Clients
          </button>
          <button 
            onClick={() => setCurrentView('services')} 
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'services' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-premium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            Services
          </button>
        </>
      ) : (
        <button 
          onClick={() => setCurrentView('profile')} 
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'profile' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-premium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
        >
          Company
        </button>
      )}
    </div>
  );

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-theme flex flex-col overflow-hidden">
        
        <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="px-5 sm:px-10 py-3.5 sm:py-5">
            <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-6">
              <div className="flex items-center gap-6 sm:gap-10 min-w-0">
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 min-w-0">
                  <div className="h-7 sm:h-10 w-auto overflow-hidden flex-shrink-0">
                    <img src={globalLogo || "./assets/logo.png"} className="h-full object-contain" alt="Logo" />
                  </div>
                  
                  <div className="h-6 w-[1.5px] bg-slate-200/60 dark:bg-slate-800 hidden md:block flex-shrink-0" />
                  
                  <div className="flex flex-col min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <SEOIcon className="w-3.5 h-3.5 text-blue-500 hidden sm:block" />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 leading-none truncate max-w-[120px] sm:max-w-none">
                          {isAdmin ? 'Client Tasks' : `${currentClient?.name || 'Client'} Tasks`}
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        {renderSyncIndicator()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden xl:block bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                  <NavContent />
                </nav>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
                <div className="relative group hidden lg:block">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Quick search..." 
                    className="bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-blue-500/30 rounded-2xl pl-11 pr-5 py-2.5 text-xs w-36 focus:w-60 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none dark:text-white font-medium" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleTheme} 
                    className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-90"
                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={handleLogout} 
                    className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50 active:scale-90" 
                    title="Logout"
                  >
                    <LogoutIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Nav Row */}
          <div className="xl:hidden border-t border-slate-100/50 dark:border-slate-800/50 px-5 py-2 bg-slate-50/50 dark:bg-slate-950/50">
             <div className="max-w-[1800px] mx-auto overflow-x-auto custom-scrollbar no-scrollbar">
                <div className="flex items-center gap-2 min-w-max">
                   <NavContent />
                </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          {currentView === 'board' ? (
            <>
              {/* Board Toolbar */}
              <div className="bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/40 dark:border-slate-800/40 px-5 sm:px-10 py-4 flex flex-wrap items-center gap-6 sm:gap-10 shadow-sm relative z-30">
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Portfolio</span>
                    <select 
                      value={clientFilter} 
                      onChange={(e) => setClientFilter(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 outline-none transition-all dark:text-white appearance-none cursor-pointer hover:border-blue-500/40 shadow-sm"
                    >
                      <option value="All">All Accounts</option>
                      {sortedClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Service</span>
                  <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-500/5 outline-none transition-all dark:text-white appearance-none cursor-pointer hover:border-blue-500/40 shadow-sm"
                  >
                    <option value="All">All Verticals</option>
                    {services.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:hidden flex-1 min-w-[160px]">
                  <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Find tasks..." 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-2.5 text-xs focus:ring-4 focus:ring-blue-500/5 transition-all outline-none dark:text-white font-bold" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => {
                if (isReadOnly) return;
                if (e.active.data.current?.type === 'Column') setActiveColumn(e.active.data.current.column);
                else setActiveTask(e.active.data.current?.task || null);
              }} onDragOver={(e) => {
                if (isReadOnly) return;
                const { active, over } = e;
                if (!over || active.id === over.id || active.data.current?.type !== 'Task') return;
                setTasks((prev) => {
                  const activeIdx = prev.findIndex(t => t.id === active.id);
                  const overIdx = prev.findIndex(t => t.id === over.id);
                  if (over.data.current?.type === 'Column') {
                    const newTasks = [...prev];
                    newTasks[activeIdx] = { ...newTasks[activeIdx], columnId: String(over.id) };
                    return newTasks;
                  }
                  if (prev[activeIdx].columnId !== prev[overIdx].columnId) {
                    const newTasks = [...prev];
                    newTasks[activeIdx] = { ...newTasks[activeIdx], columnId: prev[overIdx].columnId };
                    return arrayMove(newTasks, activeIdx, overIdx);
                  }
                  return arrayMove(prev, activeIdx, overIdx);
                });
              }} onDragEnd={() => { setActiveColumn(null); setActiveTask(null); }}>
                <div className="flex-1 overflow-x-auto p-6 sm:p-10 flex gap-8 items-start custom-scrollbar board-container transition-all duration-500">
                  <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                    {columns.map(column => (
                      <div key={column.id} className="column-snap flex-shrink-0">
                          <ColumnContainer
                              column={column}
                              tasks={filteredTasks.filter(t => t.columnId === column.id)}
                              clients={sortedClients}
                              services={services}
                              onAddTask={(cid) => { setModalColumnId(cid); setEditingTask(null); setIsModalOpen(true); }}
                              onEditTask={(task) => { setEditingTask(task); setIsModalOpen(true); }}
                              onDeleteTask={(tid) => setTasks(prev => prev.filter(t => t.id !== tid))}
                              onDeleteColumn={(id) => setColumns(prev => prev.filter(c => c.id !== id))}
                              isReadOnly={isReadOnly}
                          />
                      </div>
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            </>
          ) : currentView === 'clients' ? (
            <ClientsView clients={sortedClients} tasks={tasks} onAddClient={(n, i, p, l, e) => setClients(prev => [...prev, { id: `c-${Date.now()}`, name: n, industry: i, password: p, logo: l, email: e, color: '#3b82f6' }])} onUpdateClient={(c) => setClients(prev => prev.map(x => x.id === c.id ? c : x))} onDeleteClient={(id) => setClients(prev => prev.filter(c => c.id !== id))} globalLogo={globalLogo} onUpdateGlobalLogo={setGlobalLogo} />
          ) : currentView === 'profile' && isReadOnly && currentClient ? (
            <ClientProfileView 
              client={currentClient} 
              onUpdateClient={(updated) => {
                setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
                showToast("Profile updated successfully.", "success");
              }} 
            />
          ) : (
            <ServicesView services={services} onAddService={(s) => setServices(prev => [...prev, { ...s, id: `s-${Date.now()}` }])} onUpdateService={(s) => setServices(prev => prev.map(x => x.id === s.id ? s : x))} onDeleteService={(id) => setServices(prev => prev.filter(s => s.id !== id))} />
          )}
        </main>

        <TaskModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
          onSave={handleSaveTask} 
          task={editingTask || undefined} 
          defaultColumnId={modalColumnId} 
          clients={sortedClients} 
          services={services} 
          isReadOnly={isReadOnly} 
          currentClientId={session?.clientId}
          currentUsername={session?.username}
        />
        
        {toast && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] sm:w-auto px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6 duration-300 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-white/10 dark:border-black/10">
             <div className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-rose-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center">{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
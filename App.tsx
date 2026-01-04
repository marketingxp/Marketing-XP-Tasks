
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
import { Column, Task, Client, BoardData, UserSession, Service } from './types';
import { DEFAULT_COLUMNS, INITIAL_TASKS, INITIAL_CLIENTS, DEFAULT_SERVICES } from './constants';
import { getSupabase, syncBoardToSupabase, fetchBoardFromSupabase, subscribeToBoardChanges, SupabaseConfig, initSupabase, isAutoConnected } from './supabase';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import GithubImportModal from './components/GithubImportModal';
import DbSettingsModal from './components/DbSettingsModal';
import ClientsView from './components/ClientsView';
import ServicesView from './components/ServicesView';
import ColumnContainer from './components/ColumnContainer';
import LoginView from './components/LoginView';
import { PlusIcon, SearchIcon, SunIcon, MoonIcon, ExportIcon, ImportIcon, LogoutIcon, GithubIcon, CloudIcon } from './components/Icons';

type ViewType = 'board' | 'clients' | 'services';

const STORAGE_KEY = 'marketing_xp_board_v1';
const SESSION_KEY = 'marketing_xp_session';
const THEME_KEY = 'marketing_xp_theme';
const DB_CONFIG_KEY = 'marketing_xp_supabase_config';

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
  const [globalLogo, setGlobalLogo] = useState<string | undefined>();

  const [currentView, setCurrentView] = useState<ViewType>('board');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
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

  const isAdmin = session?.role === 'admin';
  const isReadOnly = session?.role === 'client';

  // Memoized sorted clients for consistent A-Z display
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  useEffect(() => {
    if (isReadOnly && currentView !== 'board') {
      setCurrentView('board');
    }
  }, [isReadOnly, currentView]);

  useEffect(() => {
    if (isReadOnly && session?.clientId) {
      setClientFilter(session.clientId);
    }
  }, [isReadOnly, session]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextSync = useRef(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStateFromRemote = (data: BoardData) => {
    skipNextSync.current = true;
    if (data.tasks) setTasks(data.tasks);
    
    // Ensure core column existence and maintain order
    const remoteColumns = data.columns || DEFAULT_COLUMNS;
    const mergedColumns = [...remoteColumns];
    DEFAULT_COLUMNS.forEach((def, index) => {
      if (!mergedColumns.find(c => c.id === def.id)) {
        mergedColumns.splice(index, 0, def);
      }
    });
    setColumns(mergedColumns);
    
    if (data.clients) setClients(data.clients);
    if (data.services) setServices(data.services);
    if (data.globalLogo) setGlobalLogo(data.globalLogo);
  };

  useEffect(() => {
    const setupPersistence = async () => {
      setIsInitializing(true);
      const savedLocal = localStorage.getItem(STORAGE_KEY);
      if (savedLocal) {
        try {
          updateStateFromRemote(JSON.parse(savedLocal));
        } catch (e) {
          console.error("Local data restoration failed", e);
        }
      }

      let activeSupabase = getSupabase();
      if (!activeSupabase && dbConfig) {
        activeSupabase = initSupabase(dbConfig);
      }

      if (activeSupabase) {
        setDbStatus('syncing');
        try {
          const remoteData = await fetchBoardFromSupabase();
          if (remoteData) {
            updateStateFromRemote(remoteData);
            setDbStatus('connected');
            showToast("Connected to Cloud Vault.", "success");
          } else if (isAdmin) {
            const data: BoardData = { tasks, columns, clients, services, globalLogo, version: "1.2.0" };
            await syncBoardToSupabase(data, session?.username || 'system');
            setDbStatus('connected');
          }
          subscribeToBoardChanges((remoteData) => {
            setIsRemoteUpdate(true);
            updateStateFromRemote(remoteData);
            showToast("Syncing external updates...", "info");
            setTimeout(() => setIsRemoteUpdate(false), 2000);
          });
        } catch (err: any) {
          console.error("Cloud Connectivity Error:", err.message || err);
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
    // Both Admins and Clients should be able to sync their changes (requests, comments, tasks) to the database
    if (session?.isLoggedIn && !isRemoteUpdate && !isInitializing) {
      if (skipNextSync.current) {
        skipNextSync.current = false;
        return;
      }
      const timeout = setTimeout(async () => {
        const data: BoardData = { tasks, columns, clients, services, globalLogo, version: "1.2.0" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        const activeSupabase = getSupabase();
        if (activeSupabase) {
          try {
            setDbStatus('syncing');
            await syncBoardToSupabase(data, session.username);
            setDbStatus('connected');
          } catch (e: any) {
            console.error("Cloud Sync Failed:", e.message || e);
            setDbStatus('error');
          }
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [tasks, columns, clients, services, globalLogo, session, isRemoteUpdate, isInitializing]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

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

  const handleAuthenticated = (username: string, role: 'admin' | 'client', clientId?: string) => {
    const newSession: UserSession = { isLoggedIn: true, username, lastLogin: new Date().toISOString(), role, clientId };
    setSession(newSession);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const onDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    if (event.active.data.current?.type === 'Column') {
      setActiveColumn(event.active.data.current.column);
      return;
    }
    setActiveTask(event.active.data.current?.task || null);
  };

  const onDragOver = (event: DragOverEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    if (!isActiveTask) return;
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: tasks[overIndex].columnId };
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }
    const isOverColumn = over.data.current?.type === 'Column';
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: overId.toString() };
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (isReadOnly) return;
    setActiveColumn(null);
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (active.data.current?.type === 'Column') {
      if (activeId !== overId) {
        setColumns((columns) => {
          const activeIndex = columns.findIndex((c) => c.id === activeId);
          const overIndex = columns.findIndex((c) => c.id === overId);
          return arrayMove(columns, activeIndex, overIndex);
        });
      }
      return;
    }
    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    const overIndex = tasks.findIndex((t) => t.id === overId);
    if (activeIndex !== -1 && overIndex !== -1 && tasks[activeIndex].columnId === tasks[overIndex].columnId) {
      setTasks((tasks) => arrayMove(tasks, activeIndex, overIndex));
    }
  };

  const handleAddTask = (columnId: string) => {
    setModalColumnId(columnId);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleAddColumn = () => {
    const title = prompt("Enter the name for your new workflow stage:");
    if (title && title.trim()) {
      const id = title.trim().toLowerCase().replace(/\s+/g, '-');
      const finalId = columns.some(c => c.id === id) ? `${id}-${Date.now()}` : id;
      setColumns(prev => [...prev, { id: finalId, title: title.trim() }]);
      showToast(`Stage "${title}" added.`, 'success');
    }
  };

  const handleDeleteColumn = (id: string) => {
    if (['backlog', 'this-week', 'next-week', 'in-review', 'complete'].includes(id)) {
      showToast("Cannot delete core workflow stages.", "error");
      return;
    }
    if (window.confirm("Are you sure you want to delete this stage? All tasks in this stage will be moved to the Backlog.")) {
      // Safety: Move tasks to backlog
      setTasks(prev => prev.map(t => t.columnId === id ? { ...t, columnId: 'backlog' } : t));
      setColumns(prev => prev.filter(c => c.id !== id));
      showToast("Stage removed. Tasks relocated to Backlog.", "info");
    }
  };

  const getAutoColumnFromDate = (dueDate: string): string => {
    const parts = dueDate.split('-');
    if (parts.length !== 3) return 'backlog';
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const targetDay = new Date(year, month, day);
    targetDay.setHours(0, 0, 0, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    const currentDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    
    const sundayThisWeek = new Date(today);
    sundayThisWeek.setDate(today.getDate() + today.getDay() === 0 ? 0 : 7 - today.getDay());
    sundayThisWeek.setHours(23, 59, 59, 999);

    const sundayNextWeek = new Date(sundayThisWeek);
    sundayNextWeek.setDate(sundayThisWeek.getDate() + 7);
    sundayNextWeek.setHours(23, 59, 59, 999);

    if (targetDay <= sundayThisWeek) {
      return 'this-week';
    } else if (targetDay <= sundayNextWeek) {
      return 'next-week';
    }
    
    return 'backlog'; // Fallback for any date further in future or in past
  };

  const handleSaveTask = (taskData: Partial<Task>, closeModal: boolean = true) => {
    let finalColumnId = taskData.columnId || 'backlog';

    // Auto-sort logic: Always run if there's a due date
    if (taskData.dueDate) {
      const autoColumn = getAutoColumnFromDate(taskData.dueDate);
      const currentColumnId = editingTask?.columnId || taskData.columnId;
      const planningStages = ['backlog', 'this-week', 'next-week'];
      
      // Auto-move if it's a new task or if it's currently in one of the planning stages
      if (!currentColumnId || planningStages.includes(currentColumnId)) {
        finalColumnId = autoColumn;
      }
    } else if (!taskData.columnId && !editingTask) {
      finalColumnId = 'backlog';
    }

    const taskToSave = { ...taskData, columnId: finalColumnId };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskToSave } as Task : t));
    } else {
      const newTask: Task = { ...taskToSave, id: Math.random().toString(36).substr(2, 9) } as Task;
      setTasks(prev => [newTask, ...prev]);
      if (isReadOnly) {
        const stageName = columns.find(c => c.id === finalColumnId)?.title || 'Backlog';
        showToast(`Request added to ${stageName}`, "success");
      }
    }

    if (closeModal) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (taskId: string) => setTasks(prev => prev.filter(t => t.id !== taskId));

  const handleDuplicateTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      title: `${task.title} (Copy)`
    };
    setTasks(prev => [newTask, ...prev]);
    showToast(`Task duplicated: ${task.title}`, "success");
  };

  const handleAddClient = (name: string, industry: string, password?: string, logo?: string, email?: string) => {
    const newClient: Client = {
      id: `c-${Date.now()}`,
      name,
      industry,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      password: password || Math.floor(100000 + Math.random() * 900000).toString(),
      logo,
      email
    };
    setClients(prev => [...prev, newClient]);
    showToast(`Account created for ${name}`, 'success');
  };

  const handleUpdateClient = (client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    showToast(`Updated ${client.name}`, 'success');
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    showToast("Client removed.", "info");
  };

  const handleAddService = (svc: Omit<Service, 'id'>) => {
    const newSvc = { ...svc, id: `s-${Date.now()}` };
    setServices(prev => [...prev, newSvc]);
  };

  const handleUpdateService = (svc: Service) => setServices(prev => prev.map(s => s.id === svc.id ? svc : s));
  const handleDeleteService = (id: string) => setServices(prev => prev.filter(s => s.id !== id));

  const handleSaveDbConfig = (url: string, key: string) => {
    const config = { url, key };
    setDbConfig(config);
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(config));
    initSupabase(config);
    setIsDbModalOpen(false);
    showToast("Cloud sync configured.", "success");
  };

  const handleExport = () => {
    const data: BoardData = { tasks, columns, clients, services, globalLogo, version: "1.2.0" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-pulse-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          updateStateFromRemote(JSON.parse(event.target?.result as string));
          showToast("Data imported successfully", "success");
        } catch (err) {
          showToast("Invalid JSON file", "error");
        }
      };
      reader.readAsText(file);
    }
  };

  if (!session?.isLoggedIn) {
    return <LoginView onAuthenticated={handleAuthenticated} logo={globalLogo} />;
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-auto overflow-hidden">
                   <img src={globalLogo || "./assets/logo.png"} className="h-full object-contain" alt="Logo" />
                </div>
                <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">MarketingPulse</span>
              </div>
              <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
                <button onClick={() => setCurrentView('board')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'board' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Workflow</button>
                {isAdmin && (
                  <>
                    <button onClick={() => setCurrentView('clients')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'clients' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Clients</button>
                    <button onClick={() => setCurrentView('services')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'services' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Services</button>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group hidden lg:block">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" placeholder="Deep search tasks..." className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-xs w-64 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">{darkMode ? <SunIcon /> : <MoonIcon />}</button>
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                {isAdmin && (
                  <>
                    <button onClick={() => setIsDbModalOpen(true)} className={`p-2 rounded-lg transition-colors ${dbStatus === 'connected' ? 'text-emerald-500' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><CloudIcon /></button>
                    <button onClick={() => setIsGithubModalOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><GithubIcon /></button>
                    <button onClick={handleExport} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Export JSON"><ExportIcon /></button>
                    <button onClick={handleImportClick} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Import JSON">
                      <ImportIcon />
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileImport} accept=".json" />
                    </button>
                  </>
                )}
                <button onClick={handleLogout} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-1" title="Logout"><LogoutIcon /></button>
              </div>
            </div>
          </div>
        </header>

        {currentView === 'board' && (
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2">
            <div className="max-w-[1600px] mx-auto flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2">
                <span>Service:</span>
                <select className="bg-transparent border-none text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="All">All Services</option>
                  {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <span>Account:</span>
                {isReadOnly ? (
                  <select className="bg-transparent border-none text-slate-600 dark:text-slate-300 focus:ring-0 cursor-default" disabled value={session?.clientId}>
                    <option value={session?.clientId}>{session?.username}</option>
                  </select>
                ) : (
                  <select className="bg-transparent border-none text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                    <option value="All">All Clients</option>
                    {sortedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2 text-blue-500">
                <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'syncing' ? 'bg-blue-400 animate-pulse' : dbStatus === 'error' ? 'bg-rose-500' : 'bg-slate-300'}`} />
                <span className="font-bold">{dbStatus === 'connected' ? 'Vault Online' : dbStatus === 'syncing' ? 'Syncing...' : dbStatus === 'error' ? 'Vault Connection Alert' : 'Archive Mode'}</span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
          {currentView === 'board' ? (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
              <div className="h-full overflow-x-auto p-6 flex gap-6 items-start">
                <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map(column => (
                    <ColumnContainer
                      key={column.id}
                      column={column}
                      tasks={filteredTasks.filter(t => t.columnId === column.id)}
                      clients={sortedClients}
                      services={services}
                      onAddTask={handleAddTask}
                      onEditTask={(task) => { setEditingTask(task); setIsModalOpen(true); }}
                      onDeleteTask={handleDeleteTask}
                      onDuplicateTask={handleDuplicateTask}
                      onDeleteColumn={handleDeleteColumn}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </SortableContext>
                {isAdmin && (
                  <button onClick={handleAddColumn} className="flex-shrink-0 w-80 h-[100px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all gap-2 font-bold text-xs uppercase tracking-widest group">
                    <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    New Stage
                  </button>
                )}
              </div>
              <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} client={sortedClients.find(c => c.id === activeTask.clientId)} service={services.find(s => s.name === activeTask.category)} onClick={() => {}} onDelete={() => {}} /> : activeColumn ? <div className="w-80 bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-blue-500 shadow-2xl opacity-80"><h2 className="font-bold text-slate-800 dark:text-white uppercase tracking-widest text-xs">{activeColumn.title}</h2></div> : null}
              </DragOverlay>
            </DndContext>
          ) : currentView === 'clients' ? (
            <ClientsView clients={sortedClients} tasks={tasks} onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient} globalLogo={globalLogo} onUpdateGlobalLogo={setGlobalLogo} />
          ) : (
            <ServicesView services={services} onAddService={handleAddService} onUpdateService={handleUpdateService} onDeleteService={handleDeleteService} />
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
        <GithubImportModal isOpen={isGithubModalOpen} onClose={() => setIsGithubModalOpen(false)} onImport={(importedTasks) => setTasks(prev => [...prev, ...importedTasks])} services={services} columns={columns} />
        <DbSettingsModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} onSave={handleSaveDbConfig} currentUrl={dbConfig?.url} currentKey={dbConfig?.key} />

        {toast && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-center">{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

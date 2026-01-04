
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
import { PlusIcon, SearchIcon, SunIcon, MoonIcon, ExportIcon, ImportIcon, LogoutIcon, GithubIcon, CloudIcon } from './components/Icons';

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

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  useEffect(() => {
    if (isReadOnly && session?.clientId) setClientFilter(session.clientId);
  }, [isReadOnly, session]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextSync = useRef(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const updateStateFromRemote = (data: BoardData) => {
    skipNextSync.current = true;
    if (data.tasks) setTasks(data.tasks);
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
          subscribeToBoardChanges((remoteData) => {
            setIsRemoteUpdate(true);
            updateStateFromRemote(remoteData);
            setTimeout(() => setIsRemoteUpdate(false), 2000);
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

  const handleSaveTask = async (taskData: Partial<Task>, closeModal: boolean = true) => {
    let finalColumnId = taskData.columnId || 'backlog';
    const taskToSave = { ...taskData, columnId: finalColumnId };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskToSave } as Task : t));
    } else {
      const newTask: Task = { ...taskToSave, id: Math.random().toString(36).substr(2, 9), comments: [] } as Task;
      setTasks(prev => [newTask, ...prev]);
      
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
        showToast(`Request queued for Matt.`, "success");

        const emailBody = `
          <div style="font-family: sans-serif; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="background: #eff6ff; color: #2563eb; padding: 6px 16px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Incoming Pulse Request</span>
            </div>
            <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; font-weight: 800; text-align: center;">${newTask.title}</h2>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 120px;">Client Account</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Priority</td>
                <td style="padding: 8px 0; color: ${newTask.priority === 'High' ? '#e11d48' : '#2563eb'}; font-weight: 700;">${newTask.priority}</td>
              </tr>
            </table>
            <div style="background: #f8fafc; padding: 25px; border-radius: 16px; margin-top: 25px; border: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${newTask.description}</p>
            </div>
          </div>
        `;

        const sender = "notifications@updates.marketingxp.co.uk";
        const recipient = "matt@marketingxp.co.uk";

        dispatchEmailNotification({
          from: sender,
          to: recipient,
          subject: `[Pulse Request] ${newTask.title} - ${clientName}`,
          html: emailBody,
          resendKey: RESEND_API_KEY
        }).then(success => {
          if (success) {
            console.log("Email Dispatch: Success.");
          } else {
            console.error("Email Dispatch: Failed.");
            showToast("Network Alert: Cloud dispatch failed. Ensure CORS is active.", "error");
          }
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
  };

  const handleLogout = () => {
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
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

  if (!session?.isLoggedIn) return <LoginView onAuthenticated={handleAuthenticated} logo={globalLogo} />;

  const currentClient = clients.find(c => c.id === session.clientId);

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
                {isAdmin ? (
                  <>
                    <button onClick={() => setCurrentView('clients')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'clients' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Clients</button>
                    <button onClick={() => setCurrentView('services')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'services' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Services</button>
                  </>
                ) : (
                  <button onClick={() => setCurrentView('profile')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'profile' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>My Profile</button>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group hidden lg:block">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Deep search..." className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-xs w-48 focus:w-64 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">{darkMode ? <SunIcon /> : <MoonIcon />}</button>
                <button onClick={handleLogout} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors" title="Logout"><LogoutIcon /></button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {currentView === 'board' ? (
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
              <div className="h-full overflow-x-auto p-6 flex gap-6 items-start custom-scrollbar">
                <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map(column => (
                    <ColumnContainer
                      key={column.id}
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
                  ))}
                </SortableContext>
              </div>
            </DndContext>
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
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
            <span className="text-xs font-bold uppercase tracking-widest text-center">{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

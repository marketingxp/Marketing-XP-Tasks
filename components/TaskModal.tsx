
import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, Client, Service, TaskComment } from '../types';
import { XIcon, EditIcon, TrashIcon, CalendarIcon } from './Icons';

interface TaskModalProps {
  task?: Task;
  onClose: () => void;
  onSave: (task: Partial<Task>, closeModal?: boolean) => void;
  isOpen: boolean;
  defaultColumnId?: string;
  clients: Client[];
  services: Service[];
  isReadOnly?: boolean;
  currentClientId?: string;
  currentUsername?: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  task, 
  onClose, 
  onSave, 
  isOpen, 
  defaultColumnId, 
  clients, 
  services, 
  isReadOnly = false,
  currentClientId,
  currentUsername = 'User'
}) => {
  const lastTaskIdRef = useRef<string | undefined>(task?.id);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'spec' | 'chat'>('spec');
  
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    category: services[0]?.name || '',
    priority: 'Medium' as Priority,
    dueDate: new Date().toISOString().split('T')[0],
    clientId: '',
    columnId: defaultColumnId || 'backlog',
    comments: []
  });

  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const isCreatingRequest = isReadOnly && !task;
  const isViewingExisting = !!task;
  const effectivelyDisabled = isReadOnly && isViewingExisting;

  const currentClient = clients.find(c => c.id === currentClientId);

  // Sync formData with the task prop carefully
  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      if (lastTaskIdRef.current !== task.id) {
        setFormData({
          ...task,
          comments: task.comments || []
        });
        setEditingCommentId(null);
        lastTaskIdRef.current = task.id;
      } else {
        setFormData(prev => {
          const remoteComments = task.comments || [];
          const localComments = prev.comments || [];
          
          const hasCommentsChanged = JSON.stringify(remoteComments) !== JSON.stringify(localComments);
          const hasTitleChanged = prev.title !== task.title;
          const hasDescChanged = prev.description !== task.description;

          if (hasCommentsChanged || hasTitleChanged || hasDescChanged) {
            return {
              ...prev,
              title: task.title,
              description: task.description,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              clientId: task.clientId,
              columnId: task.columnId,
              comments: remoteComments
            };
          }
          return prev;
        });
      }
    } else {
      setFormData({
        title: '',
        description: '',
        category: isReadOnly ? 'Client Requests' : (services[0]?.name || ''),
        priority: 'Medium',
        dueDate: new Date().toISOString().split('T')[0],
        clientId: currentClientId || '',
        columnId: defaultColumnId || 'backlog',
        comments: []
      });
      setEditingCommentId(null);
      lastTaskIdRef.current = undefined;
      setActiveTab('spec'); // Reset tab for new task
    }
  }, [task, isOpen, services, isReadOnly, currentClientId, defaultColumnId]);

  useEffect(() => {
    if (commentsEndRef.current && isViewingExisting) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [formData.comments?.length, isViewingExisting, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectivelyDisabled) return;
    
    const submissionData = isCreatingRequest ? {
      ...formData,
      category: 'Client Requests',
      columnId: 'backlog',
      clientId: currentClientId,
      dueDate: undefined
    } : formData;
    
    onSave(submissionData, true);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSending) return;

    setIsSending(true);

    const comment: TaskComment = {
      id: Math.random().toString(36).substr(2, 9),
      author: currentUsername || 'User',
      role: isReadOnly ? 'client' : 'admin',
      text: newComment.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(formData.comments || []), comment];
    const updatedData = { ...formData, comments: updatedComments };
    
    setFormData(updatedData);
    setNewComment('');

    if (isViewingExisting) {
      onSave(updatedData, false);
    }
    
    setIsSending(false);
  };

  const handleStartEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editCommentText.trim()) return;
    
    const updatedComments = (formData.comments || []).map(c => 
      c.id === commentId ? { ...c, text: editCommentText.trim() } : c
    );
    
    const updatedData = { ...formData, comments: updatedComments };
    setFormData(updatedData);
    setEditingCommentId(null);
    
    if (isViewingExisting) {
      onSave(updatedData, false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!window.confirm("Delete this feedback?")) return;
    
    const updatedComments = (formData.comments || []).filter(c => c.id !== commentId);
    const updatedData = { ...formData, comments: updatedComments };
    
    setFormData(updatedData);
    
    if (isViewingExisting) {
      onSave(updatedData, false);
    }
  };

  const priorities: Priority[] = ['High', 'Medium', 'Low'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 flex flex-col h-full sm:h-[90vh]">
        
        {/* Header */}
        <div className="px-6 sm:px-10 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              {isCreatingRequest ? 'Submit Request' : effectivelyDisabled ? 'Task Overview' : task ? 'Edit Specification' : 'New Task'}
            </h2>
            {(isCreatingRequest || (isReadOnly && task)) && currentClient && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500" />
                <span className="text-[9px] sm:text-[11px] font-black text-blue-500 uppercase tracking-[0.2em]">
                  {currentClient.name}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-all active:scale-90">
            <XIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        {isViewingExisting && (
          <div className="md:hidden flex p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            <div className="flex w-full bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl">
              <button 
                onClick={() => setActiveTab('spec')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'spec' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Specification
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Live Feed {formData.comments && formData.comments.length > 0 && `(${formData.comments.length})`}
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Main Form Section */}
          <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 ${activeTab !== 'spec' && 'hidden md:block'}`}>
            <form id="task-form" onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-3 ml-1">Task Title</label>
                <input
                  required
                  disabled={effectivelyDisabled}
                  type="text"
                  className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-base sm:text-lg font-bold placeholder:text-slate-300 disabled:opacity-70"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Define the scope objective..."
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-3 ml-1">Service Alignment</label>
                  <select
                    disabled={effectivelyDisabled || isCreatingRequest}
                    className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-bold disabled:opacity-70 appearance-none"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {isCreatingRequest ? (
                      <option value="Client Requests">Client Requests</option>
                    ) : (
                      services.map((svc) => (
                        <option key={svc.id} value={svc.name}>{svc.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-3 ml-1">Task Priority</label>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {priorities.map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={effectivelyDisabled}
                        onClick={() => setFormData({ ...formData, priority: p })}
                        className={`flex-1 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                          formData.priority === p 
                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-3 ml-1">Assigned Account</label>
                  <select
                    disabled={effectivelyDisabled}
                    className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-bold disabled:opacity-70"
                    value={formData.clientId || ''}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Internal Agency Task</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-3 ml-1">Project Brief & Details</label>
                <textarea
                  disabled={effectivelyDisabled}
                  className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white min-h-[180px] sm:min-h-[240px] placeholder:text-slate-300 disabled:opacity-70 resize-none leading-relaxed text-sm sm:text-base"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide comprehensive details about this marketing initiative..."
                />
              </div>

              {!isCreatingRequest && (
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
                    <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Deadline</label>
                    {formData.dueDate && !effectivelyDisabled && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({ ...formData, dueDate: undefined })}
                        className="text-[9px] sm:text-[10px] text-blue-500 hover:text-blue-600 font-black uppercase tracking-widest transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      disabled={effectivelyDisabled}
                      type="date"
                      className="w-full px-5 sm:px-6 py-3.5 sm:py-4 pl-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-bold disabled:opacity-70"
                      value={formData.dueDate || ''}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Optimized Collaboration Hub */}
          {isViewingExisting && (
            <div className={`w-full md:w-[420px] bg-slate-50 dark:bg-slate-950/80 md:border-l border-slate-100 dark:border-slate-800 flex flex-col shrink-0 ${activeTab !== 'chat' && 'hidden md:flex'}`}>
              <div className="px-6 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-[0.3em]">Live Feed</h3>
                </div>
                <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 uppercase">
                  {formData.comments?.length || 0} Messages
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                {formData.comments && formData.comments.length > 0 ? (
                  formData.comments.map((comment) => (
                    <div key={comment.id} className={`flex flex-col ${comment.author === currentUsername ? 'items-end' : 'items-start'} group/comment animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${comment.author === currentUsername ? 'text-blue-500' : 'text-slate-400'}`}>
                          {comment.author === currentUsername ? 'YOU' : comment.author}
                        </span>
                        <span className="text-[8px] font-bold text-slate-300 dark:text-slate-700">
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={`max-w-[90%] sm:max-w-[100%] rounded-[1.5rem] sm:rounded-3xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm shadow-sm relative transition-all ${
                        comment.author === currentUsername 
                          ? 'bg-blue-600 text-white rounded-tr-none hover:bg-blue-700' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none hover:border-slate-300 dark:hover:border-slate-600'
                      }`}>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-3 min-w-[180px]">
                            <textarea
                              autoFocus
                              className="w-full p-2 bg-black/10 border border-white/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-white/30 resize-none text-white placeholder:text-white/40"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit(comment.id);
                                } else if (e.key === 'Escape') {
                                  setEditingCommentId(null);
                                }
                              }}
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingCommentId(null)} className="text-[8px] uppercase font-black opacity-80 hover:opacity-100 px-2 py-1">Cancel</button>
                              <button onClick={() => handleSaveEdit(comment.id)} className="text-[8px] uppercase font-black bg-white/20 px-3 py-1 rounded-lg shadow-sm">Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="leading-relaxed break-words font-medium">{comment.text}</p>
                            
                            {comment.author === currentUsername && (
                              <div className="flex gap-2 mt-2 opacity-0 group-hover/comment:opacity-100 transition-opacity justify-end border-t border-white/10 pt-1.5">
                                <button onClick={() => handleStartEdit(comment)} className="p-1 hover:text-white/80 transition-colors" title="Edit">
                                  <EditIcon className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteComment(comment.id)} className="p-1 hover:text-rose-200 transition-colors" title="Delete">
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[2rem] bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <span className="text-2xl sm:text-3xl">💬</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-[0.4em]">Channel Quiet</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 mt-2 font-medium max-w-[200px]">Collaborators' messages will appear here in real-time.</p>
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              <div className="p-4 sm:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <form onSubmit={handleAddComment} className="relative group">
                  <div className="relative">
                    <textarea
                      rows={2}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm dark:text-white placeholder:text-slate-400 resize-none font-medium leading-relaxed shadow-inner"
                      placeholder="Type a message..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(e);
                        }
                      }}
                    />
                    <button 
                      type="submit"
                      disabled={!newComment.trim() || isSending}
                      className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-xl disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 hover:scale-105 transition-all shadow-lg active:scale-95"
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3 sm:gap-4 shrink-0 px-6 sm:px-10">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all border border-slate-200 dark:border-slate-700 shadow-sm ${effectivelyDisabled ? 'w-full' : ''}`}
          >
            {effectivelyDisabled ? 'Close Workspace' : 'Discard'}
          </button>
          {!effectivelyDisabled && (
            <button
              form="task-form"
              type="submit"
              className="flex-[1.5] px-4 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
            >
              {isCreatingRequest ? 'Submit Request' : task ? 'Save Changes' : 'Create Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

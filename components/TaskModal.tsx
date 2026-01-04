
import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority, Client, Service, TaskComment } from '../types';
import { XIcon, EditIcon, TrashIcon } from './Icons';

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
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const isCreatingRequest = isReadOnly && !task;
  const isViewingExisting = !!task;
  const effectivelyDisabled = isReadOnly && isViewingExisting;

  const currentClient = clients.find(c => c.id === currentClientId);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        comments: task.comments || []
      });
    } else if (isOpen) {
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
    }
    setNewComment('');
    setEditingCommentId(null);
  }, [task, defaultColumnId, isOpen, services, isReadOnly, currentClientId]);

  // Scroll to bottom of comments when they update
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [formData.comments]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectivelyDisabled) return;
    
    const submissionData = isCreatingRequest ? {
      ...formData,
      category: 'Client Requests',
      columnId: 'backlog',
      clientId: currentClientId
    } : formData;
    
    onSave(submissionData, true);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: TaskComment = {
      id: Math.random().toString(36).substr(2, 9),
      author: currentUsername,
      role: isReadOnly ? 'client' : 'admin',
      text: newComment.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(formData.comments || []), comment];
    const updatedData = { ...formData, comments: updatedComments };
    
    setFormData(updatedData);
    setNewComment('');

    // Silent update: don't close the modal
    if (isViewingExisting) {
      onSave(updatedData, false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-transparent dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">
              {isCreatingRequest ? 'Submit Task Request' : effectivelyDisabled ? 'Task Details' : task ? 'Edit Task' : 'New Task'}
            </h2>
            {(isCreatingRequest || (isReadOnly && task)) && currentClient && (
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-1">
                Account: {currentClient.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
          {/* Main Form Section */}
          <form id="task-form" onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Title</label>
              <input
                required
                disabled={effectivelyDisabled}
                type="text"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400 disabled:opacity-70"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of your request"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Service Type</label>
                <select
                  disabled={effectivelyDisabled || isCreatingRequest}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white disabled:opacity-70"
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
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                <select
                  disabled={effectivelyDisabled}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white disabled:opacity-70"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {!isReadOnly && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Client Association</label>
                <select
                  disabled={effectivelyDisabled}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white disabled:opacity-70"
                  value={formData.clientId || ''}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                >
                  <option value="">No Specific Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Description</label>
              <textarea
                disabled={effectivelyDisabled}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white min-h-[120px] placeholder:text-slate-400 disabled:opacity-70 resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain the requirements for this request..."
              />
            </div>

            {!isCreatingRequest && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</label>
                  {formData.dueDate && !effectivelyDisabled && (
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, dueDate: undefined })}
                      className="text-[9px] text-blue-500 hover:text-blue-600 font-black uppercase tracking-[0.2em] transition-colors"
                    >
                      Clear Date
                    </button>
                  )}
                </div>
                <input
                  disabled={effectivelyDisabled}
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white disabled:opacity-70"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            )}
          </form>

          {/* Feedback & Messaging Section */}
          {isViewingExisting && (
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-950/50 border-l border-slate-100 dark:border-slate-800 flex flex-col shrink-0 min-h-[300px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Collaboration Hub</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {formData.comments && formData.comments.length > 0 ? (
                  formData.comments.map((comment) => (
                    <div key={comment.id} className={`flex flex-col ${comment.author === currentUsername ? 'items-end' : 'items-start'} group/comment`}>
                      <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs shadow-sm relative ${
                        comment.author === currentUsername 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>
                        <p className="font-bold text-[9px] mb-1 opacity-70 flex justify-between gap-4">
                          <span>{comment.author}</span>
                          <span>{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2 mt-1">
                            <textarea
                              autoFocus
                              className="w-full p-1 bg-white/10 border border-white/20 rounded-lg text-xs outline-none focus:ring-1 focus:ring-white/30 resize-none text-white"
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
                              <button onClick={() => setEditingCommentId(null)} className="text-[8px] uppercase font-black opacity-80 hover:opacity-100">Cancel</button>
                              <button onClick={() => handleSaveEdit(comment.id)} className="text-[8px] uppercase font-black">Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="leading-relaxed break-words">{comment.text}</p>
                            
                            {comment.author === currentUsername && (
                              <div className="flex gap-2 mt-1 opacity-0 group-hover/comment:opacity-100 transition-opacity justify-end">
                                <button onClick={() => handleStartEdit(comment)} className="p-0.5 hover:text-white transition-colors" title="Edit">
                                  <EditIcon className="w-2.5 h-2.5" />
                                </button>
                                <button onClick={() => handleDeleteComment(comment.id)} className="p-0.5 hover:text-rose-300 transition-colors" title="Delete">
                                  <TrashIcon className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <span className="text-xl">💬</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No messages yet</p>
                    <p className="text-[9px] text-slate-500 mt-1">Start the conversation below.</p>
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <form onSubmit={handleAddComment} className="relative">
                  <textarea
                    rows={2}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs dark:text-white placeholder:text-slate-400 resize-none"
                    placeholder="Type feedback..."
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
                    disabled={!newComment.trim()}
                    className="absolute right-2 bottom-2 p-1.5 text-blue-500 disabled:text-slate-300 dark:disabled:text-slate-700 hover:scale-110 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs uppercase tracking-widest transition-colors border border-slate-200 dark:border-slate-700 ${effectivelyDisabled ? 'w-full' : ''}`}
          >
            {effectivelyDisabled ? 'Close' : 'Cancel'}
          </button>
          {!effectivelyDisabled && (
            <button
              form="task-form"
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs uppercase tracking-widest transition-colors shadow-lg shadow-blue-500/20"
            >
              {isCreatingRequest ? 'Submit Request' : task ? 'Update Task' : 'Create Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

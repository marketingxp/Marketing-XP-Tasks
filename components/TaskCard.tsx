import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Client, Service } from '../types';
import { PRIORITY_COLORS, SERVICE_COLOR_MAP } from '../constants';
import { CalendarIcon, TrashIcon, GithubIcon, DuplicateIcon } from './Icons';

interface TaskCardProps {
  task: Task & { githubUrl?: string };
  onClick: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  client?: Client;
  service?: Service;
  isReadOnly?: boolean;
  isDraggingOverlay?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onClick, 
  onDelete, 
  onDuplicate, 
  client, 
  service, 
  isReadOnly = false,
  isDraggingOverlay = false 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    // We remove the disabled: isReadOnly to allow clients to drag cards.
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging && !isDraggingOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[140px] w-full mb-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 animate-pulse transition-all"
      />
    );
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    onClick(task);
  };

  const isClientRequest = task.category === 'Client Requests';
  const serviceColorClass = service ? SERVICE_COLOR_MAP[service.color] || SERVICE_COLOR_MAP.slate : SERVICE_COLOR_MAP.slate;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      onDelete(task.id);
    }
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(task);
    }
  };

  const containerClasses = `
    group/card flex flex-col p-4 mb-3.5 rounded-2xl border shadow-premium transition-all duration-300
    ${isClientRequest ? 'border-rose-200 dark:border-rose-900' : 'border-slate-100 dark:border-slate-700'}
    ${isDraggingOverlay 
      ? 'bg-white dark:bg-slate-800 scale-[1.03] rotate-2 shadow-2xl z-50 cursor-grabbing border-blue-400 dark:border-blue-500/50 ring-4 ring-blue-500/5' 
      : 'bg-white dark:bg-slate-800 hover:-translate-y-1 hover:shadow-premium-hover hover:border-slate-200 dark:hover:border-slate-600'
    }
    ${isDraggingOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}
  `;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={containerClasses}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-lg border flex-shrink-0 transition-colors ${serviceColorClass}`}>
            {task.category}
          </span>
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] self-center ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        </div>
        
        {!isReadOnly && !isDraggingOverlay && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button 
              onClick={handleDuplicateClick}
              className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 touch-manipulation shadow-sm"
              title="Duplicate task"
            >
              <DuplicateIcon className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleDeleteClick}
              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 touch-manipulation shadow-sm"
              title="Delete task"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <h3 className="font-extrabold text-slate-900 dark:text-slate-100 mb-1.5 leading-tight text-sm tracking-tight break-words">
          {task.title}
        </h3>
        
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed break-words whitespace-pre-wrap line-clamp-2 group-hover/card:line-clamp-none transition-all duration-300">
          {task.description}
        </p>
      </div>

      <div className="mt-auto pt-3.5 border-t border-slate-50 dark:border-slate-700/50 flex flex-col gap-3">
        {client && (
          <div className="flex items-center gap-2.5">
            {client.logo ? (
              <div className="w-5 h-5 rounded-lg bg-white border border-slate-100 dark:border-slate-700 p-0.5 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src={client.logo} className="w-full h-full object-contain" alt={client.name} />
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full shadow-inner flex-shrink-0" style={{ backgroundColor: client.color }} />
            )}
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
              {client.name}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap min-h-[24px]">
            {task.dueDate ? (
              <div className="flex items-center text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <CalendarIcon className="mr-1.5 w-3 h-3 opacity-70" />
                <span>{task.dueDate}</span>
              </div>
            ) : <div />}

            {task.githubUrl && (
              <a 
                href={task.githubUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1 text-slate-500 hover:text-blue-500 transition-all bg-white dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 px-2.5 py-1 shadow-sm active:scale-95 touch-manipulation"
                title="View on GitHub"
              >
                <GithubIcon className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none">Pulse</span>
              </a>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
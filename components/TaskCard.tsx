
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
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDelete, onDuplicate, client, service, isReadOnly = false }) => {
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
    disabled: isReadOnly,
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 h-[150px] bg-slate-200 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 w-full mb-4"
      />
    );
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Allow clients to click to view details, even if they can't drag/edit
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isReadOnly ? {} : { ...attributes, ...listeners })}
      onClick={handleCardClick}
      className={`group bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4 mb-4 hover:shadow-md transition-all relative flex flex-col ${
        isClientRequest ? 'border-red-500 dark:border-red-600 border-[2.5px]' : 'border-slate-200 dark:border-slate-700'
      } ${isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="flex justify-between items-start mb-2 pt-1">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${serviceColorClass}`}>
          {task.category}
        </span>
        <div className="flex items-center gap-1.5">
            <span className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handleDuplicateClick}
                  className="p-1 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-100 dark:border-slate-700"
                  title="Duplicate task"
                >
                  <DuplicateIcon className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-100 dark:border-slate-700"
                  title="Delete task"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
        </div>
      </div>
      
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1.5 line-clamp-2 leading-snug text-sm">
        {task.title}
      </h3>
      
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 flex-1">
        {task.description}
      </p>

      <div className="mt-auto">
        {client && (
          <div className="mb-3 flex items-center gap-1.5">
            {client.logo ? (
              <div className="w-5 h-5 rounded bg-white border border-slate-100 dark:border-slate-700 p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
                <img src={client.logo} className="w-full h-full object-contain" alt={client.name} />
              </div>
            ) : (
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: client.color }} />
            )}
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
              {client.name}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
            {task.dueDate ? (
              <div className="flex items-center text-slate-400 dark:text-slate-500 text-[10px]">
                <CalendarIcon className="mr-1 w-3 h-3" />
                <span>{task.dueDate}</span>
              </div>
            ) : <div />}

            {task.githubUrl && (
              <a 
                href={task.githubUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1 text-slate-400 hover:text-blue-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 px-2"
                title="View on GitHub"
              >
                <GithubIcon className="w-2.5 h-2.5" />
                <span className="text-[8px] font-black uppercase tracking-widest">Pulse</span>
              </a>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;

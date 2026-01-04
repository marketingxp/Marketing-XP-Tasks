import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Column, Task, Client, Service } from '../types';
import TaskCard from './TaskCard';
import { PlusIcon, TrashIcon } from './Icons';

interface ColumnContainerProps {
  column: Column;
  tasks: Task[];
  clients: Client[];
  services: Service[];
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask?: (task: Task) => void;
  onDeleteColumn: (columnId: string) => void;
  isReadOnly?: boolean;
}

const ColumnContainer: React.FC<ColumnContainerProps> = ({
  column,
  tasks,
  clients,
  services,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onDeleteColumn,
  isReadOnly = false,
}) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
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
        className="bg-slate-100/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 w-[300px] sm:w-[320px] h-[700px] rounded-[2.5rem] flex-shrink-0"
      />
    );
  }

  const isCoreColumn = ['backlog', 'this-week', 'next-week', 'in-review', 'complete'].includes(column.id);
  const canDelete = !isReadOnly && !isCoreColumn;
  const canAdd = !isReadOnly || column.id === 'backlog';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-[300px] sm:w-[320px] flex flex-col max-h-full group/col"
    >
      <div className="flex items-center justify-between mb-5 px-2 cursor-default shrink-0">
        <div 
          className={`flex items-center gap-2.5 ${isReadOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
          {...(isReadOnly ? {} : { ...attributes, ...listeners })}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <h2 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] text-[10px] sm:text-[11px]">
            {column.title}
          </h2>
          <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 text-[10px] font-black text-slate-500 dark:text-slate-400">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {canAdd && (
            <button
              onClick={() => onAddTask(column.id)}
              className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
              title="Add task"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDeleteColumn(column.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover/col:opacity-100"
              title="Delete stage"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar rounded-[2.5rem] bg-slate-100/30 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/50 p-3.5 sm:p-4 min-h-[500px] transition-colors duration-300">
        <SortableContext
          id={column.id}
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-full flex flex-col">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                client={clients.find((c) => c.id === task.clientId)}
                service={services.find((s) => s.name === task.category)}
                onClick={onEditTask}
                onDelete={onDeleteTask}
                onDuplicate={onDuplicateTask}
                isReadOnly={isReadOnly}
              />
            ))}

            {canAdd && (
              <button
                onClick={() => onAddTask(column.id)}
                className="w-full py-5 mt-auto border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 hover:text-blue-500 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2.5 text-[10px] uppercase font-black tracking-[0.2em] group bg-white/50 dark:bg-transparent hover:bg-white dark:hover:bg-slate-800/50 active:scale-[0.98]"
              >
                <PlusIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{isReadOnly ? 'Request' : 'Add Task'}</span>
              </button>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default ColumnContainer;
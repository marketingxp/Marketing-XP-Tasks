
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
        className="bg-slate-200/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-300 dark:border-slate-800 w-80 h-[600px] rounded-2xl flex-shrink-0"
      />
    );
  }

  // Admin check: Only non-readonly (admins) can delete custom columns
  const isCoreColumn = ['backlog', 'this-week', 'next-week', 'in-review', 'complete'].includes(column.id);
  const canDelete = !isReadOnly && !isCoreColumn;
  
  // Clients can only add to the "backlog" column
  const canAdd = !isReadOnly || column.id === 'backlog';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-80 flex flex-col max-h-full group/col"
    >
      <div className="flex items-center justify-between mb-4 px-1 cursor-default">
        <div 
          className={`flex items-center gap-2 ${isReadOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
          {...(isReadOnly ? {} : { ...attributes, ...listeners })}
        >
          {!isReadOnly && <div className="w-1 h-4 bg-slate-300 dark:bg-slate-700 rounded-full mr-1 opacity-0 group-hover/col:opacity-100 transition-opacity" />}
          <h2 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">
            {column.title}
          </h2>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canAdd && (
            <button
              onClick={() => onAddTask(column.id)}
              className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
              title="Add task"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDeleteColumn(column.id)}
              className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover/col:opacity-100"
              title="Delete stage"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar rounded-xl bg-slate-100/50 dark:bg-slate-900/40 p-3 min-h-[500px]">
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
                className="w-full py-3 mt-auto border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 text-sm font-medium group"
              >
                <PlusIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {isReadOnly ? 'Request Task' : 'Add Task'}
              </button>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default ColumnContainer;

import React, { useState, useRef, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  AlertTriangle,
  Inbox,
  Check,
  X,
} from 'lucide-react';
import { KanbanColumn as IKanbanColumn, Task } from '../../types/domain';
import { TaskCard } from './TaskCard';
import { EmptyState } from '../common/EmptyState';
import { cn } from '../../utils/cn';

export interface KanbanColumnProps {
  column: IKanbanColumn;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onQuickAddTask: (columnId: string) => void;
  onRenameColumn?: (columnId: string, newTitle: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onEditTask,
  onQuickAddTask,
  onRenameColumn,
  onDeleteColumn,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const taskCount = tasks.length;
  const isWipExceeded =
    typeof column.wipLimit === 'number' && column.wipLimit > 0 && taskCount > column.wipLimit;

  const handleSaveTitle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== column.title && onRenameColumn) {
      onRenameColumn(column.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      data-testid={`kanban-column-${column.id}`}
      className="flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 p-3 sm:p-4 min-h-[500px] transition-colors"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Accent Color Dot */}
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.colorAccent || '#64748B' }}
          />

          {/* Title or Inline Edit */}
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                autoFocus
                className="w-full px-2 py-0.5 text-xs font-semibold rounded bg-white dark:bg-slate-950 border border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedTitle(column.title);
                  setIsEditingTitle(false);
                }}
                className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {column.title}
              </h2>
              {/* Task Count Pill */}
              <span className="tabular-nums font-mono text-[11px] font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                {taskCount}
              </span>
            </div>
          )}

          {/* WIP Limit Warning Pill */}
          {isWipExceeded && (
            <span
              title={`Límite de trabajo en progreso excedido (${taskCount}/${column.wipLimit})`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse"
            >
              <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>WIP ({taskCount}/{column.wipLimit})</span>
            </span>
          )}
        </div>

        {/* Column Actions: Quick Add & Menu */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onQuickAddTask(column.id)}
            title={`Agregar tarea a ${column.title}`}
            aria-label={`Agregar tarea a ${column.title}`}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Column Action Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={`Opciones de la columna ${column.title}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-7 w-36 py-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-50 text-xs">
                {onRenameColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsEditingTitle(true);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Renombrar</span>
                  </button>
                )}

                {onDeleteColumn && !column.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteColumn(column.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Droppable Task List */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 flex flex-col space-y-2.5 p-1 rounded-xl transition-colors duration-150',
              snapshot.isDraggingOver
                ? 'bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/40 rounded-xl'
                : ''
            )}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <EmptyState
                  compact
                  icon={Inbox}
                  title="Sin tareas"
                  description="Arrastra una tarjeta aquí o crea una nueva."
                  actionLabel="Agregar tarea"
                  onAction={() => onQuickAddTask(column.id)}
                />
              </div>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEdit={onEditTask}
                  isCompletedColumn={column.isCompletedColumn}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;

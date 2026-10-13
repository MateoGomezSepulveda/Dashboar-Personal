import React, { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  Calendar,
  AlertCircle,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  ListTree,
  CheckCircle2,
} from 'lucide-react';
import { Task } from '../../types/domain';
import { useTasks } from '../../context/TaskContext';
import { HORIZON_CONFIGS, PRIORITY_CONFIGS } from '../../constants/theme';
import { getRelativeDateLabel, isOverdue, isDueToday } from '../../utils/dateUtils';
import { calculateChildProgress } from '../../utils/metrics';
import { cn } from '../../utils/cn';

export interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  isCompletedColumn?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  isCompletedColumn = false,
}) => {
  const { state, deleteTask, duplicateTask } = useTasks();
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

  const priorityConfig = PRIORITY_CONFIGS[task.priority] || PRIORITY_CONFIGS.medium;
  const horizonConfig = HORIZON_CONFIGS[task.horizon] || HORIZON_CONFIGS.daily;

  // Subtasks calculation
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const subtaskPercent =
    totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  // Child tasks rollup calculation
  const childProgress = calculateChildProgress(task.id, state.tasks, state.columns);

  // Tags lookup
  const taskTags = task.tags
    .map((tagId) => state.tags.find((t) => t.id === tagId))
    .filter((t): t is import('../../types/domain').Tag => Boolean(t));

  // Due date status
  const overdue = isOverdue(task.dueDate, isCompletedColumn);
  const dueToday = isDueToday(task.dueDate);
  const relativeDateLabel = getRelativeDateLabel(task.dueDate);

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setMenuOpen(false);
    action();
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => onEdit(task)}
          data-testid={`task-card-${task.id}`}
          className={cn(
            'group relative rounded-xl p-3.5 bg-white dark:bg-slate-900 border transition-all cursor-pointer select-none',
            snapshot.isDragging
              ? 'shadow-2xl shadow-blue-500/15 dark:shadow-black/70 ring-2 ring-blue-500 border-transparent scale-[1.02] rotate-1 z-50'
              : 'border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5'
          )}
        >
          {/* Card Top Row: Grip Handle, Badges & Action Menu */}
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Drag Handle */}
              <div
                {...provided.dragHandleProps}
                onClick={(e) => e.stopPropagation()}
                title="Arrastrar tarjeta"
                className="p-1 -ml-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Horizon Badge */}
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                  horizonConfig.badgeClass
                )}
              >
                {horizonConfig.shortLabel}
              </span>

              {/* Priority Badge */}
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-md border',
                  priorityConfig.badgeClass
                )}
              >
                {priorityConfig.label}
              </span>
            </div>

            {/* Quick Actions Menu Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                aria-label={`Acciones para ${task.title}`}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-60 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Context Dropdown Popover */}
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-6 w-36 py-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 text-xs"
                >
                  <button
                    type="button"
                    onClick={(e) => handleMenuAction(e, () => onEdit(task))}
                    className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleMenuAction(e, () =>
                        onDuplicate ? onDuplicate(task.id) : duplicateTask(task.id)
                      )
                    }
                    className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicar</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    onClick={(e) =>
                      handleMenuAction(e, () =>
                        onDelete ? onDelete(task.id) : deleteTask(task.id)
                      )
                    }
                    className="w-full px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Task Title */}
          <h3
            className={cn(
              'text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-2 line-clamp-2',
              isCompletedColumn && 'line-through text-slate-400 dark:text-slate-500'
            )}
          >
            {task.title}
          </h3>

          {/* Subtasks Progress Bar (if task has subtasks) */}
          {totalSubtasks > 0 && (
            <div className="mb-2.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Subtareas</span>
                <span className="tabular-nums font-mono">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    subtaskPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  )}
                  style={{ width: `${subtaskPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Child Tasks Rollup Pill (if this task is a parent) */}
          {childProgress.total > 0 && (
            <div className="mb-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 text-[10px] font-medium">
              <ListTree className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span>
                {childProgress.completed}/{childProgress.total} hijas ({childProgress.percent}%)
              </span>
            </div>
          )}

          {/* Card Footer: Due Date & Category Tags */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {/* Due Date Indicator */}
            {task.dueDate ? (
              <div
                className={cn(
                  'flex items-center gap-1 text-[11px] font-medium',
                  overdue
                    ? 'text-rose-600 dark:text-rose-400'
                    : dueToday
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {overdue ? (
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                <span>{relativeDateLabel}</span>
              </div>
            ) : (
              <span />
            )}

            {/* Tag Chips */}
            {taskTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {taskTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </span>
                ))}
                {taskTags.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    +{taskTags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;

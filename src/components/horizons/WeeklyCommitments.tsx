import React, { useState } from 'react';
import {
  CalendarDays,
  Target,
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { calculateChildProgress } from '../../utils/metrics';
import { formatDateShort, getRelativeDateLabel } from '../../utils/dateUtils';
import { PRIORITY_CONFIGS } from '../../constants/theme';
import { Task } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface WeeklyCommitmentsProps {
  className?: string;
  onAddTask?: (defaultHorizon?: 'monthly' | 'weekly' | 'daily', parentTaskId?: string) => void;
}

export const WeeklyCommitments: React.FC<WeeklyCommitmentsProps> = ({ className, onAddTask }) => {
  const { state, addTask, toggleSubtask } = useTasks();
  const { tasks, columns } = state;

  const [expandedCommitments, setExpandedCommitments] = useState<Record<string, boolean>>({});

  const weeklyTasks = tasks
    .filter((t) => t.horizon === 'weekly')
    .sort((a, b) => a.order - b.order);

  const toggleExpand = (id: string) => {
    setExpandedCommitments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCreateCommitment = () => {
    if (onAddTask) {
      onAddTask('weekly');
      return;
    }
    const title = window.prompt('Título del nuevo Compromiso Semanal:');
    if (title && title.trim()) {
      addTask({
        title: title.trim(),
        horizon: 'weekly',
        columnId: 'todo',
        priority: 'high',
      });
    }
  };

  const handleAddDailyTask = (parentCommitmentId: string) => {
    if (onAddTask) {
      onAddTask('daily', parentCommitmentId);
      return;
    }
    const title = window.prompt('Título de la nueva Tarea Diaria vinculada:');
    if (title && title.trim()) {
      addTask({
        title: title.trim(),
        horizon: 'daily',
        columnId: 'todo',
        priority: 'high',
        parentTaskId: parentCommitmentId,
      });
    }
  };

  if (weeklyTasks.length === 0) {
    return (
      <div
        className={cn(
          'p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm',
          className
        )}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60 shadow-sm">
          <CalendarDays className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
          Sin Compromisos Semanales Activos
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          El horizonte semanal traduce tus objetivos mensuales en entregables tangibles para el sprint de 7 días.
        </p>
        <button
          type="button"
          onClick={handleCreateCommitment}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Primer Compromiso Semanal</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Horizonte Semanal: Sprint de Compromisos
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-mono font-semibold">
                {weeklyTasks.length} {weeklyTasks.length === 1 ? 'entregable' : 'entregables'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prioridades a 7 días conectadas con metas mensuales y desglosadas en tareas diarias
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateCommitment}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Compromiso</span>
        </button>
      </div>

      {/* Weekly commitments grid */}
      <div className="grid grid-cols-1 gap-6">
        {weeklyTasks.map((task) => {
          const progress = calculateChildProgress(task.id, tasks, columns);
          const isExpanded = expandedCommitments[task.id] ?? true;
          const directChildren = tasks.filter((t) => t.parentTaskId === task.id);
          const parentGoal = task.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : null;
          const priorityConfig = PRIORITY_CONFIGS[task.priority];
          const column = columns.find((c) => c.id === task.columnId);

          return (
            <div
              key={task.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="p-5">
                {/* Meta header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Semanal
                    </span>

                    <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full border', priorityConfig.badgeClass)}>
                      {priorityConfig.label}
                    </span>

                    {column && (
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {column.title}
                      </span>
                    )}
                  </div>

                  {(task.dueDate || task.dueTime) && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Vence: {formatDateShort(task.dueDate)} ({getRelativeDateLabel(task.dueDate)})</span>
                        </span>
                      )}
                      {task.dueTime && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 font-mono font-semibold">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{task.dueTime}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Parent Monthly Goal Link Breadcrumb */}
                {parentGoal && (
                  <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 text-xs">
                    <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium">Meta Mensual:</span>
                    <span className="font-semibold truncate max-w-xs">{parentGoal.title}</span>
                    <ArrowUpRight className="w-3 h-3 text-purple-500" />
                  </div>
                )}

                {/* Title & Description */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  {task.title}
                </h3>

                {task.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {task.description}
                  </p>
                )}

                {/* Progress Rollup Bar for child daily tasks */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Progreso de Tareas Diarias
                    </span>
                    <span className="font-mono tabular-nums text-blue-700 dark:text-blue-300 font-bold">
                      {progress.percent}% ({progress.completed}/{progress.total})
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                {/* Subtasks (Internal Checklist) */}
                {task.subtasks.length > 0 && (
                  <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Checklist interno ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.subtasks.map((st) => (
                        <label
                          key={st.id}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => toggleSubtask(task.id, st.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={cn(st.completed && 'line-through text-slate-400 dark:text-slate-500')}>
                            {st.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions row: toggle children & add daily child */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleExpand(task.id)}
                    className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {isExpanded ? 'Ocultar' : 'Ver'} Tareas Diarias Vinculadas ({directChildren.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddDailyTask(task.id)}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Vincular Tarea Diaria</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Children List */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
                  {directChildren.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                      No hay tareas diarias vinculadas a este compromiso aún. Haz clic en "Vincular Tarea Diaria" para asignar foco táctico de hoy.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Tareas tácticas de ejecución:
                      </div>
                      {directChildren.map((child: Task) => {
                        const childCol = columns.find((c) => c.id === child.columnId);
                        const isDone = childCol?.isCompletedColumn || child.columnId === 'done' || child.completedAt != null;

                        return (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  'text-xs font-medium truncate text-slate-800 dark:text-slate-200',
                                  isDone && 'line-through text-slate-400 dark:text-slate-500'
                                )}
                              >
                                {child.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {child.dueDate && (
                                <span className="text-[10px] text-slate-400">
                                  {getRelativeDateLabel(child.dueDate)}
                                </span>
                              )}
                              {childCol && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {childCol.title}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCommitments;

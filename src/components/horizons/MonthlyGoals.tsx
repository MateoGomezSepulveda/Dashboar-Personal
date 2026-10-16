import React, { useState } from 'react';
import {
  CalendarRange,
  Target,
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FolderGit2,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { calculateChildProgress } from '../../utils/metrics';
import { formatDateShort, getRelativeDateLabel } from '../../utils/dateUtils';
import { PRIORITY_CONFIGS } from '../../constants/theme';
import { Task } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface MonthlyGoalsProps {
  className?: string;
  onAddTask?: (defaultHorizon?: 'monthly' | 'weekly' | 'daily', parentTaskId?: string) => void;
}

export const MonthlyGoals: React.FC<MonthlyGoalsProps> = ({ className, onAddTask }) => {
  const { state, addTask, toggleSubtask } = useTasks();
  const { tasks, columns } = state;

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const monthlyGoals = tasks
    .filter((t) => t.horizon === 'monthly')
    .sort((a, b) => a.order - b.order);

  const toggleExpand = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const handleCreateGoal = () => {
    if (onAddTask) {
      onAddTask('monthly');
      return;
    }
    const title = window.prompt('Título del nuevo Objetivo Mensual:');
    if (title && title.trim()) {
      addTask({
        title: title.trim(),
        horizon: 'monthly',
        columnId: 'todo',
        priority: 'high',
      });
    }
  };

  const handleAddChildCommitment = (parentGoalId: string) => {
    if (onAddTask) {
      onAddTask('weekly', parentGoalId);
      return;
    }
    const title = window.prompt('Título del nuevo Compromiso Semanal:');
    if (title && title.trim()) {
      addTask({
        title: title.trim(),
        horizon: 'weekly',
        columnId: 'todo',
        priority: 'high',
        parentTaskId: parentGoalId,
      });
    }
  };

  if (monthlyGoals.length === 0) {
    return (
      <div
        className={cn(
          'p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm',
          className
        )}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/60 shadow-sm">
          <CalendarRange className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
          Sin Metas Mensuales Definidas
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          Los objetivos mensuales representan el norte estratégico de tus proyectos a 30 días.
          Conecta tus compromisos semanales y tareas diarias a un macro propósito.
        </p>
        <button
          type="button"
          onClick={handleCreateGoal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Primer Objetivo Mensual</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Horizonte Mensual: Objetivos Macro
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-mono font-semibold">
                {monthlyGoals.length} {monthlyGoals.length === 1 ? 'meta' : 'metas'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visión de 30 días con progreso consolidado (rollup) de entregables semanales y tareas diarias
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateGoal}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Meta Mensual</span>
        </button>
      </div>

      {/* Goals list */}
      <div className="grid grid-cols-1 gap-6">
        {monthlyGoals.map((goal) => {
          const progress = calculateChildProgress(goal.id, tasks, columns);
          const isExpanded = expandedGoals[goal.id] ?? true;
          const directChildren = tasks.filter((t) => t.parentTaskId === goal.id);
          const priorityConfig = PRIORITY_CONFIGS[goal.priority];
          const column = columns.find((c) => c.id === goal.columnId);

          return (
            <div
              key={goal.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Goal Card Header */}
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Meta Mensual
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

                  {(goal.dueDate || goal.dueTime) && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {goal.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Vence: {formatDateShort(goal.dueDate)} ({getRelativeDateLabel(goal.dueDate)})</span>
                        </span>
                      )}
                      {goal.dueTime && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 font-mono font-semibold">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{goal.dueTime}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">
                  {goal.title}
                </h3>

                {goal.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {goal.description}
                  </p>
                )}

                {/* Progress Rollup Bar */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FolderGit2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Progreso de Entregables Vinculados
                    </span>
                    <span className="font-mono tabular-nums text-purple-700 dark:text-purple-300 font-bold">
                      {progress.percent}% ({progress.completed}/{progress.total})
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                {/* Subtasks (Internal to Goal) */}
                {goal.subtasks.length > 0 && (
                  <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Hitos internos ({goal.subtasks.filter((s) => s.completed).length}/{goal.subtasks.length}):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {goal.subtasks.map((st) => (
                        <label
                          key={st.id}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => toggleSubtask(goal.id, st.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500"
                          />
                          <span className={cn(st.completed && 'line-through text-slate-400 dark:text-slate-500')}>
                            {st.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions row: toggle children & add weekly child */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleExpand(goal.id)}
                    className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {isExpanded ? 'Ocultar' : 'Ver'} Entregables Vinculados ({directChildren.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddChildCommitment(goal.id)}
                    className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Vincular Compromiso Semanal</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Children List */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
                  {directChildren.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                      No hay tareas semanales o diarias vinculadas a esta meta aún. Haz clic en "Vincular Compromiso Semanal" para comenzar el desglose.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Desglose de entregables:
                      </div>
                      {directChildren.map((child: Task) => {
                        const childCol = columns.find((c) => c.id === child.columnId);
                        const isDone = childCol?.isCompletedColumn || child.columnId === 'done' || child.completedAt != null;
                        const childHorizonLabel = child.horizon === 'weekly' ? 'Semanal' : 'Diario';

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
                              <span
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                                  child.horizon === 'weekly'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                )}
                              >
                                {childHorizonLabel}
                              </span>

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

export default MonthlyGoals;

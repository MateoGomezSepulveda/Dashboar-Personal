import React, { useMemo } from 'react';
import {
  CheckCircle2,
  CalendarDays,
  AlertTriangle,
  CheckCheck,
  BarChart3,
  Flame,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { calculateMetrics } from '../../utils/metrics';
import { cn } from '../../utils/cn';

export interface QuickStatsProps {
  className?: string;
  referenceDate?: string;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ className, referenceDate }) => {
  const { state } = useTasks();
  const { tasks, columns, streakMetadata } = state;

  const metrics = useMemo(() => {
    return calculateMetrics(tasks, columns, referenceDate);
  }, [tasks, columns, referenceDate]);

  const hasOverdue = metrics.overdueCount > 0;

  return (
    <div
      role="region"
      aria-label="Panel de métricas de productividad"
      className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6', className)}
    >
      {/* CARD 1: Progreso Diario / Tasa de Completado */}
      <div className="relative group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Progreso Diario
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {metrics.completedTodayPercent}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            completado hoy
          </span>
        </div>

        {/* Emerald Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
          <div
            className="bg-emerald-500 dark:bg-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, metrics.completedTodayPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{metrics.completedTodayCount} de {metrics.horizonDistribution.daily} diarias</span>
          {streakMetadata && streakMetadata.currentStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <Flame className="w-3 h-3 fill-amber-500/20" />
              <span>{streakMetadata.currentStreak} d racha</span>
            </span>
          )}
        </div>
      </div>

      {/* CARD 2: Compromisos Semanales */}
      <div className="relative group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Compromisos Semanales
          </span>
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
            <CalendarDays className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {metrics.completedWeekPercent}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            del sprint
          </span>
        </div>

        {/* Royal Blue Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, metrics.completedWeekPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{metrics.completedWeekCount} de {metrics.horizonDistribution.weekly} entregables</span>
          <span>{metrics.horizonDistribution.monthly} macro metas</span>
        </div>
      </div>

      {/* CARD 3: Tareas Vencidas */}
      <div
        className={cn(
          'relative group p-4 rounded-2xl border shadow-sm transition-all duration-200',
          hasOverdue
            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              hasOverdue ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            Tareas Vencidas
          </span>
          <div
            className={cn(
              'p-1.5 rounded-lg border',
              hasOverdue
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            )}
          >
            {hasOverdue ? <AlertTriangle className="w-4 h-4" /> : <CheckCheck className="w-4 h-4 text-emerald-500" />}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span
            className={cn(
              'text-3xl font-bold font-mono tabular-nums',
              hasOverdue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-50'
            )}
          >
            {metrics.overdueCount}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {metrics.overdueCount === 1 ? 'tarea retrasada' : 'tareas retrasadas'}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px]">
          {hasOverdue ? (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              Requieren atención prioritaria
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 inline" />
              Todo al día y en cronograma
            </span>
          )}
        </div>
      </div>

      {/* CARD 4: Distribución de Prioridades */}
      <div className="relative group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Distribución de Prioridades
          </span>
          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
            {metrics.totalTasks}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            tareas totales
          </span>
        </div>

        {/* Priority breakdown chips */}
        <div className="mt-3 flex items-center gap-2">
          <div
            title={`Prioridad Alta: ${metrics.priorityDistribution.high}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-mono font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{metrics.priorityDistribution.high}</span>
          </div>

          <div
            title={`Prioridad Media: ${metrics.priorityDistribution.medium}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-mono font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{metrics.priorityDistribution.medium}</span>
          </div>

          <div
            title={`Prioridad Baja: ${metrics.priorityDistribution.low}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{metrics.priorityDistribution.low}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;

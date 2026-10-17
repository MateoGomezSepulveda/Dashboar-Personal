import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  TrendingUp,
  AlertTriangle,
  ListChecks,
  Check,
  RotateCcw,
  Sparkles,
  Calendar,
  Target,
  Award,
  ArrowUpRight,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { Task, Horizon, Priority } from '../../types/domain';
import { getTodayString } from '../../utils/dateUtils';
import { HORIZON_CONFIGS, PRIORITY_CONFIGS } from '../../constants/theme';
import { cn } from '../../utils/cn';

interface PrincipalOverviewProps {
  onSelectTask?: (task: Task) => void;
}

type PendingFilter = 'all' | 'missed' | 'today';

export const PrincipalOverview: React.FC<PrincipalOverviewProps> = ({ onSelectTask }) => {
  const { state, updateTask } = useTasks();
  const { tasks, columns } = state;
  const [pendingFilter, setPendingFilter] = useState<PendingFilter>('all');

  const analytics = useMemo(() => {
    const now = new Date();
    const todayStr = getTodayString(now);
    const currentHH = String(now.getHours()).padStart(2, '0');
    const currentMM = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHH}:${currentMM}`;

    const completedColIds = new Set(
      columns.filter((c) => c.isCompletedColumn || c.id === 'done').map((c) => c.id)
    );

    const isTaskCompleted = (t: Task) =>
      completedColIds.has(t.columnId) || Boolean(t.completedAt);

    const isTaskMissed = (t: Task) => {
      if (isTaskCompleted(t)) return false;
      if (t.dueDate && t.dueDate.slice(0, 10) < todayStr) return true;
      if (
        t.dueTime &&
        (!t.dueDate || t.dueDate.slice(0, 10) === todayStr) &&
        t.dueTime < currentTimeStr
      ) {
        return true;
      }
      return false;
    };

    const completedTasks = tasks.filter(isTaskCompleted);
    const uncompletedTasks = tasks.filter((t) => !isTaskCompleted(t));
    const missedTasks = uncompletedTasks.filter(isTaskMissed);
    const inProgressTasks = uncompletedTasks.filter(
      (t) => t.columnId === 'in-progress' && !isTaskMissed(t)
    );
    const pendingOnTimeTasks = uncompletedTasks.filter(
      (t) => t.columnId !== 'in-progress' && !isTaskMissed(t)
    );

    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;
    const missedRate = total > 0 ? Math.round((missedTasks.length / total) * 100) : 0;

    // Subtasks stats
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    tasks.forEach((t) => {
      if (Array.isArray(t.subtasks)) {
        totalSubtasks += t.subtasks.length;
        completedSubtasks += t.subtasks.filter((st) => st.completed).length;
      }
    });
    const subtaskRate =
      totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    // Breakdown by Horizon
    const byHorizon = (['daily', 'weekly', 'monthly'] as Horizon[]).map((h) => {
      const hTasks = tasks.filter((t) => t.horizon === h);
      const hDone = hTasks.filter(isTaskCompleted).length;
      const hMissed = hTasks.filter(isTaskMissed).length;
      const hPending = hTasks.length - hDone;
      const hRate = hTasks.length > 0 ? Math.round((hDone / hTasks.length) * 100) : 0;
      return {
        horizon: h,
        total: hTasks.length,
        done: hDone,
        pending: hPending,
        missed: hMissed,
        rate: hRate,
      };
    });

    // Breakdown by Priority
    const byPriority = (['high', 'medium', 'low'] as Priority[]).map((p) => {
      const pTasks = tasks.filter((t) => t.priority === p);
      const pDone = pTasks.filter(isTaskCompleted).length;
      const pPending = pTasks.length - pDone;
      const pRate = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
      return {
        priority: p,
        total: pTasks.length,
        done: pDone,
        pending: pPending,
        rate: pRate,
      };
    });

    return {
      todayStr,
      total,
      completedTasks,
      uncompletedTasks,
      missedTasks,
      inProgressTasks,
      pendingOnTimeTasks,
      completionRate,
      missedRate,
      totalSubtasks,
      completedSubtasks,
      subtaskRate,
      byHorizon,
      byPriority,
      isTaskMissed,
    };
  }, [tasks, columns]);

  const handleMarkDone = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const doneColId = columns.find((c) => c.isCompletedColumn)?.id || 'done';
    updateTask(task.id, {
      columnId: doneColId,
      completedAt: new Date().toISOString(),
    });
  };

  const handleReopenTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const todoColId = columns.find((c) => !c.isCompletedColumn)?.id || 'todo';
    updateTask(task.id, {
      columnId: todoColId,
      completedAt: null,
    });
  };

  const filteredUncompleted = useMemo(() => {
    const list = [...analytics.uncompletedTasks].sort((a, b) => {
      const aMissed = analytics.isTaskMissed(a) ? 0 : 1;
      const bMissed = analytics.isTaskMissed(b) ? 0 : 1;
      if (aMissed !== bMissed) return aMissed - bMissed;
      const prioOrder = { high: 0, medium: 1, low: 2 };
      return prioOrder[a.priority] - prioOrder[b.priority];
    });

    if (pendingFilter === 'missed') {
      return list.filter((t) => analytics.isTaskMissed(t));
    }
    if (pendingFilter === 'today') {
      return list.filter(
        (t) => t.horizon === 'daily' || (t.dueDate && t.dueDate.slice(0, 10) === analytics.todayStr)
      );
    }
    return list;
  }, [analytics, pendingFilter]);

  // SVG Ring calculation
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const completedStroke = (analytics.completionRate / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* BLOQUE 1: Balance General de Cumplimiento (Lo que hiciste vs. Lo que no hiciste) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card Izquierda: Anillo de Efectividad Global + Distribución */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Índice de Efectividad
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Balance de Cumplimiento
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-1">
            {/* Donut SVG */}
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - completedStroke}
                  strokeLinecap="round"
                  className="text-emerald-500 dark:text-emerald-400 transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-50">
                  {analytics.completionRate}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Cumplido
                </span>
              </div>
            </div>

            {/* Leyenda detallada de estados */}
            <div className="flex-1 w-full space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50">
                <span className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Sí Cumplidas
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {analytics.completedTasks.length} tareas
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50">
                <span className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  No Cumplidas (Vencidas)
                </span>
                <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                  {analytics.missedTasks.length} tareas
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50">
                <span className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  En Progreso
                </span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                  {analytics.inProgressTasks.length} tareas
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Pendientes (En plazo)
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {analytics.pendingOnTimeTasks.length} tareas
                </span>
              </div>
            </div>
          </div>

          {/* Barra apilada multicapa */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Proporción total ({analytics.total} tareas)</span>
              <span>
                Subtareas hechas:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {analytics.completedSubtasks}/{analytics.totalSubtasks} ({analytics.subtaskRate}%)
                </strong>
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {analytics.total > 0 && (
                <>
                  <div
                    title={`Cumplidas: ${analytics.completedTasks.length}`}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{
                      width: `${(analytics.completedTasks.length / analytics.total) * 100}%`,
                    }}
                  />
                  <div
                    title={`En Progreso: ${analytics.inProgressTasks.length}`}
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{
                      width: `${(analytics.inProgressTasks.length / analytics.total) * 100}%`,
                    }}
                  />
                  <div
                    title={`Pendientes en plazo: ${analytics.pendingOnTimeTasks.length}`}
                    className="bg-slate-400 dark:bg-slate-600 h-full transition-all duration-500"
                    style={{
                      width: `${(analytics.pendingOnTimeTasks.length / analytics.total) * 100}%`,
                    }}
                  />
                  <div
                    title={`No cumplidas / Vencidas: ${analytics.missedTasks.length}`}
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{
                      width: `${(analytics.missedTasks.length / analytics.total) * 100}%`,
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card Derecha: Desglose por Horizonte y Prioridad (Qué tanto cumpliste por categoría) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Desglose Analítico
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Cumplimiento por Horizonte y Prioridad
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Columna: Por Horizonte */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                <span>Por Horizonte Temporal</span>
              </h4>

              {analytics.byHorizon.map((item) => {
                const cfg = HORIZON_CONFIGS[item.horizon];
                const barColor =
                  item.horizon === 'daily'
                    ? 'bg-amber-500'
                    : item.horizon === 'weekly'
                    ? 'bg-blue-600'
                    : 'bg-purple-600';

                return (
                  <div
                    key={item.horizon}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {cfg.label}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.rate}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✔ {item.done} hechas
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ⏳ {item.pending} sin hacer
                        {item.missed > 0 && (
                          <strong className="text-rose-500 ml-1">
                            ({item.missed} vencida{item.missed > 1 ? 's' : ''})
                          </strong>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Columna: Por Prioridad */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Por Nivel de Prioridad</span>
              </h4>

              {analytics.byPriority.map((item) => {
                const cfg = PRIORITY_CONFIGS[item.priority];
                const barColor =
                  item.priority === 'high'
                    ? 'bg-rose-500'
                    : item.priority === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <div
                    key={item.priority}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />
                        Prioridad {cfg.label}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.rate}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✔ {item.done} cumplidas
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ✗ {item.pending} por cumplir
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: Tablero Comparativo Directo — Lo que NO se ha cumplido vs. Lo que SÍ cumpliste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PANEL IZQUIERDO: Tareas No Cumplidas / Pendientes por Hacer */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    Tareas No Cumplidas / Pendientes
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                    {analytics.uncompletedTasks.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lo que te falta por hacer o se venció el plazo
                </p>
              </div>
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPendingFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  pendingFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Todas ({analytics.uncompletedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setPendingFilter('missed')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  pendingFilter === 'missed'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                )}
              >
                Vencidas ({analytics.missedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setPendingFilter('today')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  pendingFilter === 'today'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Hoy
              </button>
            </div>
          </div>

          {/* Lista de Tareas No Cumplidas */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredUncompleted.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-dashed border-emerald-200 dark:border-emerald-900/50">
                <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  ¡Increíble! No tienes tareas pendientes en esta vista
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  Has cumplido con todos tus objetivos programados.
                </p>
              </div>
            ) : (
              filteredUncompleted.map((task) => {
                const missed = analytics.isTaskMissed(task);
                const priorityCfg = PRIORITY_CONFIGS[task.priority];
                const horizonCfg = HORIZON_CONFIGS[task.horizon];

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask?.(task)}
                    className={cn(
                      'group p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer',
                      missed
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                        : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        {missed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            No cumplida a tiempo
                          </span>
                        ) : task.columnId === 'in-progress' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                            En progreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Por hacer
                          </span>
                        )}

                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                            horizonCfg.badgeClass
                          )}
                        >
                          {horizonCfg.shortLabel}
                        </span>

                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                            priorityCfg.badgeClass
                          )}
                        >
                          {priorityCfg.label}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {task.title}
                      </p>

                      {(task.dueDate || task.dueTime) && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </span>
                          )}
                          {task.dueTime && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 font-semibold',
                                missed ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                              )}
                            >
                              <Clock className="w-3 h-3" />
                              {task.dueTime}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleMarkDone(task, e)}
                      title="Marcar como cumplida ahora"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">Cumplir</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Historial de Logros (Tareas que SÍ cumpliste) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    Tareas Cumplidas (Logros)
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    {analytics.completedTasks.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Todo lo que ya completaste exitosamente
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {analytics.completedTasks.length} de {analytics.total}
              </span>
              <p className="text-[10px] text-slate-400">meta global</p>
            </div>
          </div>

          {/* Lista de Tareas Cumplidas */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {analytics.completedTasks.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800">
                <ListChecks className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Aún no has marcado tareas como cumplidas
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Usa el botón &ldquo;Cumplir&rdquo; de la izquierda o mueve una tarjeta a &ldquo;Completado&rdquo;.
                </p>
              </div>
            ) : (
              analytics.completedTasks.map((task) => {
                const horizonCfg = HORIZON_CONFIGS[task.horizon];
                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask?.(task)}
                    className="group p-3 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/15 border border-emerald-200/60 dark:border-emerald-900/40 hover:border-emerald-400 transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          Cumplida
                        </span>

                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                            horizonCfg.badgeClass
                          )}
                        >
                          {horizonCfg.shortLabel}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 line-through decoration-emerald-500/60 truncate">
                        {task.title}
                      </p>

                      {(task.dueDate || task.dueTime) && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          {task.dueDate && <span>{task.dueDate}</span>}
                          {task.dueTime && <span>· {task.dueTime}</span>}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleReopenTask(task, e)}
                      title="Volver a poner como pendiente"
                      className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrincipalOverview;

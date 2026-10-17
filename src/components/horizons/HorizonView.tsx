import React, { useState } from 'react';
import {
  CalendarRange,
  CalendarDays,
  SunMedium,
  LayoutDashboard,
  KanbanSquare,
  ListTree,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { Horizon, Task } from '../../types/domain';
import { QuickStats } from '../layout/QuickStats';
import { PrincipalOverview } from './PrincipalOverview';
import { MonthlyGoals } from './MonthlyGoals';
import { WeeklyCommitments } from './WeeklyCommitments';
import { cn } from '../../utils/cn';

export interface HorizonViewProps {
  className?: string;
  onAddTask?: (defaultHorizon?: Horizon, parentTaskId?: string) => void;
  onSelectTask?: (task: Task) => void;
  kanbanBoardNode?: React.ReactNode;
}

export const HorizonView: React.FC<HorizonViewProps> = ({
  className,
  onAddTask,
  onSelectTask,
  kanbanBoardNode,
}) => {
  const { state } = useTasks();
  const { selectedHorizon } = state;

  // View presentation mode: 'structured' (dedicated horizon hierarchy) vs 'kanban' (board)
  const [viewMode, setViewMode] = useState<'structured' | 'kanban'>('structured');

  // When 'all' (Panel Principal) is selected, display the productivity metrics panel exclusively
  if (selectedHorizon === 'all') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Panel Principal: Resumen de Productividad y Cumplimiento
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Balance de tareas cumplidas vs. no cumplidas, progreso por horizonte y prioridades
            </p>
          </div>
        </div>

        <QuickStats className="mb-0" />
        <PrincipalOverview onSelectTask={onSelectTask} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Sub-header view switcher bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          {selectedHorizon === 'monthly' && (
            <>
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
                <CalendarRange className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Vista Dedicada: Objetivos Mensuales
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Planificación macro estratégica a 30 días
                </p>
              </div>
            </>
          )}

          {selectedHorizon === 'weekly' && (
            <>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Vista Dedicada: Compromisos Semanales
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Entregables del sprint activo a 7 días
                </p>
              </div>
            </>
          )}

          {selectedHorizon === 'daily' && (
            <>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                <SunMedium className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Vista Dedicada: Foco Diario ("Hoy")
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ejecución de alta prioridad para las próximas 24 horas
                </p>
              </div>
            </>
          )}
        </div>

        {/* View mode toggle: Hierarchy List vs Kanban Board */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('structured')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5',
              viewMode === 'structured'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Jerarquía y Rollup</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5',
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            <span>Tablero Kanban</span>
          </button>
        </div>
      </div>

      {/* Render selected view mode */}
      {viewMode === 'kanban' ? (
        <div>{kanbanBoardNode}</div>
      ) : (
        <div>
          {selectedHorizon === 'monthly' && <MonthlyGoals onAddTask={onAddTask} />}
          {selectedHorizon === 'weekly' && <WeeklyCommitments onAddTask={onAddTask} />}
          {selectedHorizon === 'daily' && (
            <div className="space-y-6">
              {/* Daily focus banner */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                    <SunMedium className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Ejecución Crítica del Día
                    </h3>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                      Tarjetas filtradas exclusivamente para el foco de hoy. Completa tareas para sumar a tu racha diaria.
                    </p>
                  </div>
                </div>
              </div>
              {kanbanBoardNode}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HorizonView;

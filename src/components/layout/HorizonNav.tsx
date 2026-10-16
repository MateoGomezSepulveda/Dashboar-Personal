import React from 'react';
import { LayoutDashboard, CalendarRange, CalendarDays, SunMedium } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { Horizon } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface HorizonNavProps {
  className?: string;
}

interface HorizonTabItem {
  id: Horizon | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const HORIZON_TABS: HorizonTabItem[] = [
  {
    id: 'all',
    label: 'Principal',
    icon: LayoutDashboard,
    description: 'Panel principal con métricas, progreso y distribución de prioridades',
  },
  {
    id: 'monthly',
    label: 'Mensual',
    icon: CalendarRange,
    description: 'Objetivos macro y metas estratégicas a 30 días',
  },
  {
    id: 'weekly',
    label: 'Semanal',
    icon: CalendarDays,
    description: 'Compromisos y entregables del sprint a 7 días',
  },
  {
    id: 'daily',
    label: 'Diario',
    icon: SunMedium,
    description: 'Foco táctico y tareas críticas para hoy',
  },
];

export const HorizonNav: React.FC<HorizonNavProps> = ({ className }) => {
  const { state, setHorizonFilter } = useTasks();
  const { selectedHorizon, tasks } = state;

  const counts: Record<Horizon | 'all', number> = {
    all: tasks.length,
    monthly: tasks.filter((t) => t.horizon === 'monthly').length,
    weekly: tasks.filter((t) => t.horizon === 'weekly').length,
    daily: tasks.filter((t) => t.horizon === 'daily').length,
  };

  return (
    <nav
      role="tablist"
      aria-label="Filtro de horizontes temporales"
      className={cn(
        'inline-flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-inner backdrop-blur-sm transition-colors',
        className
      )}
    >
      {HORIZON_TABS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selectedHorizon === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isSelected}
            aria-label={`${tab.label} (${count} tareas)`}
            title={tab.description}
            onClick={() => setHorizonFilter(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs font-medium rounded-xl transition-all duration-200 ease-out select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
              isSelected
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isSelected ? 'scale-110 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span>{tab.label}</span>
            <span
              className={cn(
                'tabular-nums font-mono text-[10px] px-1.5 py-0.5 rounded-full transition-colors',
                isSelected
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-800/60'
                  : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default HorizonNav;

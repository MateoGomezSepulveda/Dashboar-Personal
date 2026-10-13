import React from 'react';
import { LucideIcon, Inbox, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 transition-colors',
        compact ? 'p-4 sm:p-6' : 'p-8 sm:p-12',
        className
      )}
    >
      <div
        className={cn(
          'rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3',
          compact ? 'w-10 h-10' : 'w-12 h-12'
        )}
      >
        <Icon className={cn(compact ? 'w-5 h-5' : 'w-6 h-6', 'stroke-[1.75]')} />
      </div>

      <h3
        className={cn(
          'font-semibold text-slate-800 dark:text-slate-200',
          compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed',
            compact ? 'text-[11px]' : 'text-xs'
          )}
        >
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'mt-3.5 inline-flex items-center gap-1.5 font-medium rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200/60 dark:border-blue-800/60 shadow-sm active:scale-98 transition-all',
            compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
          )}
        >
          <ActionIcon className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;

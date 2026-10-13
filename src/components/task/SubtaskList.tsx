import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Subtask } from '../../types/domain';
import { cn } from '../../utils/cn';

export interface SubtaskListProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
  readOnly?: boolean;
  className?: string;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  subtasks,
  onChange,
  readOnly = false,
  className,
}) => {
  const [newTitle, setNewTitle] = useState('');

  const completedCount = subtasks.filter((st) => st.completed).length;
  const totalCount = subtasks.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleToggle = (id: string) => {
    if (readOnly) return;
    const updated = subtasks.map((st) =>
      st.id === id ? { ...st, completed: !st.completed } : st
    );
    onChange(updated);
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || readOnly) return;

    const newSubtask: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: trimmed,
      completed: false,
      order: subtasks.length,
      createdAt: new Date().toISOString(),
    };

    onChange([...subtasks, newSubtask]);
    setNewTitle('');
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    const updated = subtasks.filter((st) => st.id !== id);
    onChange(updated);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with progress summary */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Subtareas</span>
        </span>
        <span className="tabular-nums font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {completedCount}/{totalCount} ({percent}%)
        </span>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Subtasks items */}
      <div className="space-y-1.5">
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 transition-colors"
          >
            <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
              <input
                type="checkbox"
                checked={st.completed}
                disabled={readOnly}
                onChange={() => handleToggle(st.id)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              />
              <span
                className={cn(
                  'text-xs text-slate-800 dark:text-slate-200 truncate transition-all',
                  st.completed && 'line-through text-slate-400 dark:text-slate-500'
                )}
              >
                {st.title}
              </span>
            </label>

            {!readOnly && (
              <button
                type="button"
                onClick={() => handleDelete(st.id)}
                aria-label={`Eliminar subtarea ${st.title}`}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add subtask input */}
      {!readOnly && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Agregar subtarea..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            aria-label="Agregar subtarea"
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};

export default SubtaskList;

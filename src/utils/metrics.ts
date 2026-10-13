/**
 * ============================================================================
 * PRODUCTIVITY METRICS ENGINE — PERSONAL DASHBOARD
 * ============================================================================
 * Calculates real-time productivity statistics, horizon distributions,
 * priority breakdowns, overdue alerts, and cross-horizon progress rollups.
 */

import { KanbanColumn, ProductivityMetrics, Task } from '../types/domain';

/**
 * Normalizes a date or date-string to standard 'YYYY-MM-DD' calendar date.
 */
function normalizeDateString(date: Date | string | null | undefined): string {
  if (!date) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates high-level productivity metrics across all tasks and columns.
 * 
 * @param tasks - The complete list of tasks in the application.
 * @param columns - The defined Kanban columns to determine terminal completion.
 * @param referenceDate - Optional reference date (YYYY-MM-DD or Date) for overdue calculation.
 * @returns ProductivityMetrics
 */
export function calculateMetrics(
  tasks: Task[],
  columns: KanbanColumn[],
  referenceDate?: string | Date
): ProductivityMetrics {
  const completedColumnIds = new Set(
    columns.filter(c => c.isCompletedColumn).map(c => c.id)
  );

  const totalTasks = tasks.length;
  const refDateStr = normalizeDateString(referenceDate);

  // Daily Tasks
  const dailyTasks = tasks.filter(t => t.horizon === 'daily');
  const completedDaily = dailyTasks.filter(t => completedColumnIds.has(t.columnId));
  const dailyPercent = dailyTasks.length === 0
    ? 0
    : Math.round((completedDaily.length / dailyTasks.length) * 100);

  // Weekly Tasks
  const weeklyTasks = tasks.filter(t => t.horizon === 'weekly');
  const completedWeekly = weeklyTasks.filter(t => completedColumnIds.has(t.columnId));
  const weeklyPercent = weeklyTasks.length === 0
    ? 0
    : Math.round((completedWeekly.length / weeklyTasks.length) * 100);

  // Overdue Tasks: Non-completed column tasks where dueDate < referenceDate
  let overdueCount = 0;
  for (const task of tasks) {
    if (!completedColumnIds.has(task.columnId) && task.dueDate) {
      const taskDueStr = task.dueDate.slice(0, 10);
      if (taskDueStr < refDateStr) {
        overdueCount++;
      }
    }
  }

  // Priority Distribution
  const priorityDistribution = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  // Horizon Distribution
  const horizonDistribution = {
    monthly: tasks.filter(t => t.horizon === 'monthly').length,
    weekly: weeklyTasks.length,
    daily: dailyTasks.length,
  };

  return {
    totalTasks,
    completedTodayCount: completedDaily.length,
    completedTodayPercent: dailyPercent,
    completedWeekCount: completedWeekly.length,
    completedWeekPercent: weeklyPercent,
    overdueCount,
    priorityDistribution,
    horizonDistribution,
  };
}

/**
 * Computes dynamic child progress rollup on a parent task.
 * Evaluates child tasks whose `parentTaskId` equals `parentId`.
 * 
 * @param parentId - The unique ID of the parent task.
 * @param tasks - The complete list of tasks to inspect for children.
 * @param columns - Optional Kanban columns to check terminal completion state.
 * @returns { total: number; completed: number; percent: number }
 */
export function calculateChildProgress(
  parentId: string,
  tasks: Task[],
  columns?: KanbanColumn[]
): { total: number; completed: number; percent: number } {
  const children = tasks.filter(t => t.parentTaskId === parentId);
  if (children.length === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }

  const completedColumnIds = columns
    ? new Set(columns.filter(c => c.isCompletedColumn).map(c => c.id))
    : new Set(['done']);

  const completed = children.filter(c => {
    return (
      (c.completedAt !== null && c.completedAt !== undefined) ||
      completedColumnIds.has(c.columnId) ||
      c.columnId === 'done'
    );
  }).length;

  const percent = Math.round((completed / children.length) * 100);

  return {
    total: children.length,
    completed,
    percent,
  };
}

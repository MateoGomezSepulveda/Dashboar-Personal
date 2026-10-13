/**
 * ============================================================================
 * UNIT TESTS — PRODUCTIVITY METRICS & DATE UTILITIES
 * ============================================================================
 * Tests calculation precision, division-by-zero resilience, overdue logic,
 * cross-horizon progress rollups, and date formatting.
 */

import { describe, it, expect } from 'vitest';
import { calculateMetrics, calculateChildProgress } from '../utils/metrics';
import {
  getTodayString,
  addDays,
  getDaysDifference,
  isOverdue,
  isDueToday,
  isDueTomorrow,
  formatDate,
  formatDateShort,
  getRelativeDateLabel,
} from '../utils/dateUtils';
import { KanbanColumn, Task } from '../types/domain';
import { INITIAL_COLUMNS, INITIAL_TASKS } from '../constants/initialData';

describe('Productivity Metrics Engine (calculateMetrics)', () => {
  const defaultColumns: KanbanColumn[] = [
    { id: 'todo', title: 'Por hacer', order: 0, isCompletedColumn: false },
    { id: 'in-progress', title: 'En progreso', order: 1, isCompletedColumn: false },
    { id: 'done', title: 'Completado', order: 2, isCompletedColumn: true },
  ];

  it('calculates metrics accurately with curated seed tasks', () => {
    const metrics = calculateMetrics(INITIAL_TASKS, INITIAL_COLUMNS, '2026-10-12');

    expect(metrics.totalTasks).toBe(INITIAL_TASKS.length);
    expect(metrics.totalTasks).toBeGreaterThan(0);

    // Horizon distributions
    expect(metrics.horizonDistribution.monthly).toBe(2);
    expect(metrics.horizonDistribution.weekly).toBe(2);
    expect(metrics.horizonDistribution.daily).toBe(4);

    // Daily completion percent: task-daily-2 is done (1 of 4 = 25%)
    expect(metrics.completedTodayCount).toBe(1);
    expect(metrics.completedTodayPercent).toBe(25);

    // Priority distributions
    expect(metrics.priorityDistribution.high).toBeGreaterThan(0);
    expect(metrics.priorityDistribution.medium).toBeGreaterThan(0);
    expect(metrics.priorityDistribution.low).toBeGreaterThan(0);
  });

  it('gracefully handles zero tasks returning 0% without NaN or Infinity', () => {
    const emptyTasks: Task[] = [];
    const metrics = calculateMetrics(emptyTasks, defaultColumns, '2026-10-12');

    expect(metrics.totalTasks).toBe(0);
    expect(metrics.completedTodayCount).toBe(0);
    expect(metrics.completedTodayPercent).toBe(0);
    expect(metrics.completedWeekCount).toBe(0);
    expect(metrics.completedWeekPercent).toBe(0);
    expect(metrics.overdueCount).toBe(0);

    expect(Number.isNaN(metrics.completedTodayPercent)).toBe(false);
    expect(Number.isNaN(metrics.completedWeekPercent)).toBe(false);
    expect(Number.isFinite(metrics.completedTodayPercent)).toBe(true);
    expect(Number.isFinite(metrics.completedWeekPercent)).toBe(true);

    expect(metrics.priorityDistribution).toEqual({ high: 0, medium: 0, low: 0 });
    expect(metrics.horizonDistribution).toEqual({ monthly: 0, weekly: 0, daily: 0 });
  });

  it('correctly handles scenarios where only monthly tasks exist (0 daily and 0 weekly)', () => {
    const monthlyOnlyTasks: Task[] = [
      {
        id: 'm-1',
        title: 'Macro Meta 1',
        description: '',
        horizon: 'monthly',
        columnId: 'todo',
        priority: 'high',
        dueDate: null,
        tags: [],
        subtasks: [],
        order: 0,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const metrics = calculateMetrics(monthlyOnlyTasks, defaultColumns);
    expect(metrics.completedTodayPercent).toBe(0);
    expect(metrics.completedWeekPercent).toBe(0);
    expect(metrics.horizonDistribution.monthly).toBe(1);
    expect(metrics.horizonDistribution.daily).toBe(0);
    expect(metrics.horizonDistribution.weekly).toBe(0);
  });

  it('calculates 100% completion rate when all tasks in a horizon are in completed column', () => {
    const tasks: Task[] = [
      {
        id: 'd-1',
        title: 'Daily 1',
        description: '',
        horizon: 'daily',
        columnId: 'done',
        priority: 'medium',
        dueDate: null,
        tags: [],
        subtasks: [],
        order: 0,
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
        completedAt: '2026-10-12T01:00:00Z',
      },
      {
        id: 'd-2',
        title: 'Daily 2',
        description: '',
        horizon: 'daily',
        columnId: 'done',
        priority: 'high',
        dueDate: null,
        tags: [],
        subtasks: [],
        order: 1,
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
        completedAt: '2026-10-12T02:00:00Z',
      },
    ];

    const metrics = calculateMetrics(tasks, defaultColumns);
    expect(metrics.completedTodayPercent).toBe(100);
    expect(metrics.completedTodayCount).toBe(2);
  });

  it('detects overdue tasks strictly on non-completed columns', () => {
    const refDate = '2026-10-12';
    const tasks: Task[] = [
      // 1. Overdue active task in 'todo' (due 2026-10-01 < 2026-10-12) -> Overdue!
      {
        id: 'overdue-1',
        title: 'Overdue Todo',
        description: '',
        horizon: 'daily',
        columnId: 'todo',
        priority: 'high',
        dueDate: '2026-10-01',
        tags: [],
        subtasks: [],
        order: 0,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      // 2. Overdue active task in 'in-progress' (due 2026-10-10 < 2026-10-12) -> Overdue!
      {
        id: 'overdue-2',
        title: 'Overdue In Progress',
        description: '',
        horizon: 'weekly',
        columnId: 'in-progress',
        priority: 'medium',
        dueDate: '2026-10-10',
        tags: [],
        subtasks: [],
        order: 1,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      // 3. Past due task but in 'done' column (isCompletedColumn: true) -> NOT Overdue!
      {
        id: 'completed-past-due',
        title: 'Completed in the past',
        description: '',
        horizon: 'daily',
        columnId: 'done',
        priority: 'low',
        dueDate: '2026-10-05',
        tags: [],
        subtasks: [],
        order: 2,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-06T00:00:00Z',
        completedAt: '2026-10-06T00:00:00Z',
      },
      // 4. Task due today (2026-10-12) in 'todo' -> NOT Overdue (it is due today)!
      {
        id: 'due-today',
        title: 'Due Today',
        description: '',
        horizon: 'daily',
        columnId: 'todo',
        priority: 'high',
        dueDate: '2026-10-12',
        tags: [],
        subtasks: [],
        order: 3,
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
      },
      // 5. Future task (2026-10-25) in 'todo' -> NOT Overdue
      {
        id: 'future-task',
        title: 'Future Task',
        description: '',
        horizon: 'weekly',
        columnId: 'todo',
        priority: 'low',
        dueDate: '2026-10-25',
        tags: [],
        subtasks: [],
        order: 4,
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
      },
      // 6. Task with null dueDate in 'todo' -> NOT Overdue
      {
        id: 'unscheduled',
        title: 'No Due Date',
        description: '',
        horizon: 'monthly',
        columnId: 'todo',
        priority: 'medium',
        dueDate: null,
        tags: [],
        subtasks: [],
        order: 5,
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
      },
    ];

    const metrics = calculateMetrics(tasks, defaultColumns, refDate);
    // Only overdue-1 and overdue-2 should be counted
    expect(metrics.overdueCount).toBe(2);
  });
});

describe('Cross-Horizon Progress Rollup (calculateChildProgress)', () => {
  const sampleTasks: Task[] = [
    {
      id: 'parent-1',
      title: 'Parent Goal',
      description: '',
      horizon: 'monthly',
      columnId: 'in-progress',
      priority: 'high',
      dueDate: null,
      tags: [],
      subtasks: [],
      parentTaskId: null,
      order: 0,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'child-1',
      title: 'Child Weekly 1',
      description: '',
      horizon: 'weekly',
      columnId: 'done',
      priority: 'medium',
      dueDate: null,
      tags: [],
      subtasks: [],
      parentTaskId: 'parent-1',
      order: 0,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-05T00:00:00Z',
      completedAt: '2026-10-05T00:00:00Z',
    },
    {
      id: 'child-2',
      title: 'Child Weekly 2',
      description: '',
      horizon: 'weekly',
      columnId: 'todo',
      priority: 'high',
      dueDate: null,
      tags: [],
      subtasks: [],
      parentTaskId: 'parent-1',
      order: 1,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      completedAt: null,
    },
  ];

  it('calculates 50% rollup when 1 of 2 children is completed', () => {
    const progress = calculateChildProgress('parent-1', sampleTasks);
    expect(progress.total).toBe(2);
    expect(progress.completed).toBe(1);
    expect(progress.percent).toBe(50);
  });

  it('returns 0 for parent with no children', () => {
    const progress = calculateChildProgress('child-2', sampleTasks);
    expect(progress).toEqual({ total: 0, completed: 0, percent: 0 });
  });

  it('returns 0 for non-existent parent ID', () => {
    const progress = calculateChildProgress('non-existent-id', sampleTasks);
    expect(progress).toEqual({ total: 0, completed: 0, percent: 0 });
  });

  it('evaluates high cardinality children (500 items) rapidly under 25ms', () => {
    const parentId = 'bulk-parent';
    const bulkTasks: Task[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < 500; i++) {
      bulkTasks.push({
        id: `bulk-${i}`,
        title: `Task ${i}`,
        description: '',
        horizon: 'daily',
        columnId: i % 4 === 0 ? 'done' : 'todo', // 125 done, 375 todo
        priority: 'medium',
        dueDate: null,
        tags: [],
        subtasks: [],
        parentTaskId: parentId,
        order: i,
        createdAt: now,
        updatedAt: now,
        completedAt: i % 4 === 0 ? now : null,
      });
    }

    const t0 = performance.now();
    const progress = calculateChildProgress(parentId, bulkTasks);
    const elapsed = performance.now() - t0;

    expect(progress.total).toBe(500);
    expect(progress.completed).toBe(125);
    expect(progress.percent).toBe(25);
    expect(elapsed).toBeLessThan(25);
  });
});

describe('Date Utilities (dateUtils)', () => {
  it('getTodayString returns standard YYYY-MM-DD', () => {
    const dateStr = getTodayString('2026-10-12T15:30:00Z');
    expect(dateStr).toBe('2026-10-12');

    const localToday = getTodayString(new Date(2026, 9, 12)); // Month index 9 = October
    expect(localToday).toBe('2026-10-12');
  });

  it('addDays handles ordinary days, leap years and year-end transitions', () => {
    expect(addDays('2026-10-12', 1)).toBe('2026-10-13');
    expect(addDays('2026-10-12', -1)).toBe('2026-10-11');

    // Leap year 2028 (Feb has 29 days)
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');

    // Non-leap year 2026 (Feb has 28 days)
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');

    // Year end
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('getDaysDifference calculates day difference accurately', () => {
    expect(getDaysDifference('2026-10-12', '2026-10-12')).toBe(0);
    expect(getDaysDifference('2026-10-13', '2026-10-12')).toBe(1);
    expect(getDaysDifference('2026-10-11', '2026-10-12')).toBe(-1);
    expect(getDaysDifference('2026-10-20', '2026-10-10')).toBe(10);
  });

  it('isOverdue evaluates active vs completed tasks against reference date', () => {
    const ref = '2026-10-12';
    expect(isOverdue('2026-10-01', false, ref)).toBe(true);
    expect(isOverdue('2026-10-01', true, ref)).toBe(false); // Completed task is not overdue
    expect(isOverdue('2026-10-12', false, ref)).toBe(false); // Due today is not overdue
    expect(isOverdue('2026-10-13', false, ref)).toBe(false); // Due tomorrow is not overdue
    expect(isOverdue(null, false, ref)).toBe(false);
  });

  it('isDueToday and isDueTomorrow check relative proximity', () => {
    const ref = '2026-10-12';
    expect(isDueToday('2026-10-12', ref)).toBe(true);
    expect(isDueToday('2026-10-13', ref)).toBe(false);

    expect(isDueTomorrow('2026-10-13', ref)).toBe(true);
    expect(isDueTomorrow('2026-10-12', ref)).toBe(false);
  });

  it('formatDate and formatDateShort produce clean Spanish labels', () => {
    expect(formatDate('2026-10-12')).toBe('12/10/2026');
    expect(formatDate(null)).toBe('');

    expect(formatDateShort('2026-10-12')).toBe('12 Oct');
    expect(formatDateShort('2026-05-04')).toBe('4 May');
  });

  it('getRelativeDateLabel returns appropriate Spanish relative terms', () => {
    const ref = '2026-10-12';
    expect(getRelativeDateLabel('2026-10-12', ref)).toBe('Hoy');
    expect(getRelativeDateLabel('2026-10-13', ref)).toBe('Mañana');
    expect(getRelativeDateLabel('2026-10-11', ref)).toBe('Ayer');
    expect(getRelativeDateLabel('2026-10-01', ref)).toBe('Vencida');
    expect(getRelativeDateLabel('2026-10-25', ref)).toBe('25/10/2026');
    expect(getRelativeDateLabel(null, ref)).toBe('');
  });
});

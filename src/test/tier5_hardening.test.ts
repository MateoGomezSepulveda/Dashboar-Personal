// src/test/tier5_hardening.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { taskReducer } from '../context/taskReducer';
import {
  loadState,
  saveState,
  exportJSON,
  importJSON,
  resetToSeed,
  STORAGE_KEY,
  CORRUPT_KEY,
  CORRUPT_BACKUP_KEY,
  CURRENT_SCHEMA_VERSION,
} from '../services/storageService';
import { migrateState, validateAppState, isValidAppState } from '../services/migrationService';
import { calculateMetrics, calculateChildProgress } from '../utils/metrics';
import {
  getTodayString,
  addDays,
  getDaysDifference,
  isOverdue,
  formatDate,
  formatDateShort,
  getRelativeDateLabel,
} from '../utils/dateUtils';
import { DashboardAppState, KanbanColumn, Task } from '../types/domain';
import { INITIAL_APP_STATE, INITIAL_COLUMNS } from '../constants/initialData';

describe('Tier 5 White-Box Adversarial Hardening Suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. STORAGE SERVICE SECURITY & CORRUPTION DEFENSES
  // ==========================================================================
  describe('Storage & Prototype Pollution Hardening', () => {
    it('rejects JSON imports containing __proto__ pollution', () => {
      const maliciousJson = JSON.stringify({
        version: 1,
        tasks: [],
        columns: INITIAL_COLUMNS,
        tags: [],
        ['__proto__']: { injectedAdmin: true },
      });

      const res = importJSON(maliciousJson);
      expect(res.success).toBe(false);
      expect(res.error).toContain('prototipo');
    });

    it('rejects JSON imports containing constructor pollution', () => {
      const maliciousJson = JSON.stringify({
        version: 1,
        tasks: [],
        columns: INITIAL_COLUMNS,
        tags: [],
        constructor: { prototype: { injected: true } },
      });

      const res = importJSON(maliciousJson);
      expect(res.success).toBe(false);
      expect(res.error).toContain('prototipo');
    });

    it('rejects empty, whitespace, and primitive JSON payloads', () => {
      expect(importJSON('').success).toBe(false);
      expect(importJSON('   ').success).toBe(false);
      expect(importJSON('null').success).toBe(false);
      expect(importJSON('42').success).toBe(false);
      expect(importJSON('"string"').success).toBe(false);
    });

    it('handles QuotaExceededError in saveState returning false gracefully', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        const error = new Error('The quota has been exceeded.') as any;
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      });

      const success = saveState(INITIAL_APP_STATE);
      expect(success).toBe(false);
      setItemSpy.mockRestore();
    });

    it('creates corrupt backup key and recovers from unparseable raw data in loadState', () => {
      const rawCorrupt = '{ broken: json invalid syntax';
      window.localStorage.setItem(STORAGE_KEY, rawCorrupt);

      const state = loadState();
      expect(state.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(state.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(window.localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe(rawCorrupt);
      expect(window.localStorage.getItem(CORRUPT_KEY)).toBe(rawCorrupt);
    });

    it('exportJSON produces valid backup string and resetToSeed restores clean seed state', () => {
      const exported = exportJSON(INITIAL_APP_STATE);
      const parsed = JSON.parse(exported);
      expect(parsed.app).toBe('PersonalDashboard');
      expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(parsed.data.version).toBe(CURRENT_SCHEMA_VERSION);

      // Modify storage and verify resetToSeed restores initial state
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, tasks: [] }));
      const resetState = resetToSeed();
      expect(resetState.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
    });
  });

  // ==========================================================================
  // 2. SCHEMA MIGRATION & BACKFILLING HARDENING
  // ==========================================================================
  describe('Schema Migration & Structural Validation Hardening', () => {
    it('validateAppState and isValidAppState catch missing tasks, columns, or tags arrays', () => {
      expect(validateAppState(null).valid).toBe(false);
      expect(validateAppState({}).valid).toBe(false);
      expect(validateAppState({ tasks: [] }).valid).toBe(false);
      expect(validateAppState({ tasks: [], columns: [] }).valid).toBe(false);
      expect(validateAppState({ tasks: [], columns: [], tags: [] }).valid).toBe(true);

      expect(isValidAppState(null)).toBe(false);
      expect(isValidAppState({})).toBe(false);
      expect(isValidAppState({ tasks: [], columns: [], tags: [] })).toBe(true);
    });

    it('migrateState backfills invalid horizons and priorities to safe defaults', () => {
      const legacyState = {
        version: 0,
        tasks: [
          {
            id: 'legacy-t1',
            title: 'Legacy Title',
            horizon: 'bi-weekly', // Invalid horizon
            priority: 'urgent', // Invalid priority
            tags: ['valid-tag', 12345], // Mixed tags
          },
        ],
        columns: [],
        tags: [],
      };

      const migrated = migrateState(legacyState);
      expect(migrated.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.tasks[0].horizon).toBe('daily'); // Default
      expect(migrated.tasks[0].priority).toBe('medium'); // Default
      expect(migrated.tasks[0].tags).toEqual(['valid-tag']); // Filtered
      expect(migrated.columns.length).toBe(INITIAL_COLUMNS.length); // Backfilled default columns
    });
  });

  // ==========================================================================
  // 3. REDUCER ADVANCED BOUNDARIES & INTEGRITY
  // ==========================================================================
  describe('Reducer Edge Conditions & Immutability Hardening', () => {
    const testState: DashboardAppState = {
      ...INITIAL_APP_STATE,
      tasks: [
        {
          id: 'task-a',
          title: 'Task A',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'high',
          dueDate: '2026-10-12',
          tags: [],
          subtasks: [
            { id: 'st-a1', title: 'Subtask A1', completed: false },
          ],
          parentTaskId: null,
          order: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
          completedAt: null,
        },
        {
          id: 'task-b',
          title: 'Task B',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: null,
          order: 1,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
          completedAt: null,
        },
      ],
    };

    it('clamps negative destinationIndex in MOVE_TASK to 0', () => {
      const nextState = taskReducer(testState, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-b', targetColumnId: 'todo', destinationIndex: -99 },
      });

      const todoTasks = nextState.tasks
        .filter(t => t.columnId === 'todo')
        .sort((a, b) => a.order - b.order);

      expect(todoTasks[0].id).toBe('task-b');
      expect(todoTasks[0].order).toBe(0);
      expect(todoTasks[1].id).toBe('task-a');
      expect(todoTasks[1].order).toBe(1);
    });

    it('safely tolerates stale sourceColumnId in MOVE_TASK without duplicate tasks', () => {
      const nextState = taskReducer(testState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-a',
          sourceColumnId: 'in-progress', // Stale/desynchronized
          destinationColumnId: 'done',
          destinationIndex: 0,
        },
      });

      const taskAOccurrences = nextState.tasks.filter(t => t.id === 'task-a');
      expect(taskAOccurrences.length).toBe(1);
      expect(taskAOccurrences[0].columnId).toBe('done');
      expect(taskAOccurrences[0].completedAt).not.toBeNull();
    });

    it('maintains strict 0..N-1 order across 50 rapid sequential moves', () => {
      let cur = testState;
      const ids = ['task-a', 'task-b'];
      const cols = ['todo', 'in-progress', 'done'];

      for (let i = 0; i < 50; i++) {
        const taskId = ids[i % ids.length];
        const targetCol = cols[i % cols.length];
        cur = taskReducer(cur, {
          type: 'MOVE_TASK',
          payload: { taskId, targetColumnId: targetCol, destinationIndex: i % 2 },
        });
      }

      for (const col of cur.columns) {
        const colTasks = cur.tasks
          .filter(t => t.columnId === col.id)
          .sort((a, b) => a.order - b.order);

        colTasks.forEach((t, idx) => {
          expect(t.order).toBe(idx);
        });
      }
    });

    it('redirects tasks to alternative existing column when DELETE_COLUMN fallback equals target column', () => {
      const stateWithCustom = taskReducer(testState, {
        type: 'ADD_COLUMN',
        payload: { id: 'col-qa', title: 'QA Review' },
      });
      const stateWithMovedTask = taskReducer(stateWithCustom, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-a', targetColumnId: 'col-qa' },
      });

      const nextState = taskReducer(stateWithMovedTask, {
        type: 'DELETE_COLUMN',
        payload: { columnId: 'col-qa', fallbackColumnId: 'col-qa' },
      });

      expect(nextState.columns.some(c => c.id === 'col-qa')).toBe(false);
      const reassigned = nextState.tasks.find(t => t.id === 'task-a');
      expect(reassigned?.columnId).not.toBe('col-qa');
      expect(nextState.columns.some(c => c.id === reassigned?.columnId)).toBe(true);
    });

    it('REORDER_COLUMNS returns unchanged state on out-of-bounds start/end index', () => {
      const negativeResult = taskReducer(testState, {
        type: 'REORDER_COLUMNS',
        payload: { startIndex: -1, endIndex: 1 },
      });
      expect(negativeResult).toBe(testState);

      const overflowResult = taskReducer(testState, {
        type: 'REORDER_COLUMNS',
        payload: { startIndex: 0, endIndex: 100 },
      });
      expect(overflowResult).toBe(testState);
    });

    it('ADD_SUBTASK rejects empty or whitespace-only title without adding subtask', () => {
      const nextState = taskReducer(testState, {
        type: 'ADD_SUBTASK',
        payload: { taskId: 'task-a', title: '   ' },
      });

      const taskA = nextState.tasks.find(t => t.id === 'task-a')!;
      expect(taskA.subtasks.length).toBe(1);
    });

    it('moving task from done column back to in-progress resets completedAt to null', () => {
      const stateInDone = taskReducer(testState, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-a', targetColumnId: 'done' },
      });
      expect(stateInDone.tasks.find(t => t.id === 'task-a')?.completedAt).not.toBeNull();

      const stateBackInTodo = taskReducer(stateInDone, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-a', targetColumnId: 'todo' },
      });
      expect(stateBackInTodo.tasks.find(t => t.id === 'task-a')?.completedAt).toBeNull();
    });

    it('guarantees immutability when reducer operates on Object.freeze state', () => {
      const frozenState = Object.freeze({
        ...testState,
        tasks: Object.freeze([...testState.tasks]),
      });

      expect(() => {
        taskReducer(frozenState as DashboardAppState, {
          type: 'SET_THEME',
          payload: 'dark',
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // 4. METRICS & DATE UTILITIES HARDENING
  // ==========================================================================
  describe('Metrics & Timezone-Safe Date Utilities Hardening', () => {
    it('calculateMetrics on empty array returns 0% without NaN or Infinity', () => {
      const metrics = calculateMetrics([], INITIAL_COLUMNS, '2026-10-12');
      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completedTodayPercent).toBe(0);
      expect(metrics.completedWeekPercent).toBe(0);
      expect(Number.isNaN(metrics.completedTodayPercent)).toBe(false);
      expect(Number.isFinite(metrics.completedTodayPercent)).toBe(true);
    });

    it('strictly excludes overdue tasks in completed column from overdueCount', () => {
      const tasksWithOverdueDone: Task[] = [
        {
          id: 'done-overdue',
          title: 'Done Overdue',
          description: '',
          horizon: 'daily',
          columnId: 'done',
          priority: 'high',
          dueDate: '2026-10-01', // Before 2026-10-12
          tags: [],
          subtasks: [],
          order: 0,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const metrics = calculateMetrics(tasksWithOverdueDone, INITIAL_COLUMNS, '2026-10-12');
      expect(metrics.overdueCount).toBe(0);
    });

    it('dateUtils handles leap year dates and addDays boundary transitions safely', () => {
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(getDaysDifference('2026-10-15', '2026-10-12')).toBe(3);
    });

    it('dateUtils formatting and overdue calculation functions work accurately', () => {
      expect(getTodayString('2026-10-12T15:00:00Z')).toBe('2026-10-12');
      expect(formatDate('2026-10-12')).toBe('12/10/2026');
      expect(formatDate(null)).toBe('');
      expect(formatDateShort('2026-10-12')).toBe('12 Oct');
      expect(formatDateShort(null)).toBe('');

      expect(isOverdue('2020-01-01', false, '2026-10-12')).toBe(true);
      expect(isOverdue('2020-01-01', true, '2026-10-12')).toBe(false);
      expect(isOverdue(null, false, '2026-10-12')).toBe(false);
    });

    it('calculateChildProgress calculates child completion rollup correctly', () => {
      const childTasks: Task[] = [
        {
          id: 'child-a',
          title: 'Child A',
          description: '',
          horizon: 'daily',
          columnId: 'done',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: 'parent-1',
          order: 0,
          createdAt: '',
          updatedAt: '',
          completedAt: '2026-10-12T00:00:00Z',
        },
        {
          id: 'child-b',
          title: 'Child B',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: 'parent-1',
          order: 1,
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      ];

      const columnsList: KanbanColumn[] = [...INITIAL_COLUMNS];
      const rollup = calculateChildProgress('parent-1', childTasks, columnsList);
      expect(rollup.total).toBe(2);
      expect(rollup.completed).toBe(1);
      expect(rollup.percent).toBe(50);

      // Non-existent parent
      const emptyRollup = calculateChildProgress('phantom-parent', childTasks);
      expect(emptyRollup.total).toBe(0);
      expect(emptyRollup.percent).toBe(0);
    });

    it('getRelativeDateLabel returns appropriate Spanish relative strings', () => {
      expect(getRelativeDateLabel('2026-10-12', '2026-10-12')).toBe('Hoy');
      expect(getRelativeDateLabel('2026-10-13', '2026-10-12')).toBe('Mañana');
      expect(getRelativeDateLabel('2026-10-11', '2026-10-12')).toBe('Ayer');
      expect(getRelativeDateLabel('2026-10-05', '2026-10-12')).toBe('Vencida');
      expect(getRelativeDateLabel('2026-10-25', '2026-10-12')).toBe('25/10/2026');
      expect(getRelativeDateLabel(null)).toBe('');
    });
  });
});

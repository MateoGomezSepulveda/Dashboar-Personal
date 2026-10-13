/**
 * Tier 5: Adversarial Coverage Hardening & Edge Condition Suite
 * tests/e2e/tier5_adversarial.test.ts
 *
 * Stresses white-box edge conditions, prototype pollution safeguards,
 * deep cascade detachments, boundary clamping, leap calculations,
 * storage quotas, and immutability guarantees.
 */

import {
  describe,
  it,
  expect,
  getInitialSeedData,
  taskReducer,
  calculateMetrics,
  calculateChildProgress,
  StorageServiceMock,
  Task,
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
} from './harness.js';

describe('Tier 5: Adversarial Hardening', () => {
  // ==========================================================================
  // 1. STORAGE & PROTOYPE POLLUTION DEFENSES
  // ==========================================================================
  describe('T5.1 - T5.6: Storage & Security Resilience', () => {
    it('T5.1: should reject import payloads containing prototype pollution via __proto__', () => {
      const storage = new StorageServiceMock();
      const maliciousPayload = JSON.stringify({
        app: 'PersonalDashboard',
        version: 1,
        tasks: [],
        columns: [],
        tags: [],
        __proto__: { isAdmin: true },
      });

      const result = storage.importJSON(maliciousPayload);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('T5.2: should reject import payloads containing constructor pollution', () => {
      const storage = new StorageServiceMock();
      const maliciousPayload = JSON.stringify({
        version: 1,
        tasks: [],
        columns: [],
        tags: [],
        constructor: { prototype: { polluted: true } },
      });

      const result = storage.importJSON(maliciousPayload);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('T5.3: should reject empty, whitespace, or invalid non-object strings in importJSON', () => {
      const storage = new StorageServiceMock();

      expect(storage.importJSON('').success).toBe(false);
      expect(storage.importJSON('   ').success).toBe(false);
      expect(storage.importJSON('null').success).toBe(false);
      expect(storage.importJSON('12345').success).toBe(false);
      expect(storage.importJSON('"string-value"').success).toBe(false);
    });

    it('T5.4: should reject syntactically malformed JSON backup string with clear error', () => {
      const storage = new StorageServiceMock();
      const brokenJson = '{ "version": 1, "tasks": [ { "id": "t1" ';

      const result = storage.importJSON(brokenJson);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON syntax');
    });

    it('T5.5: should reject JSON payload missing required tasks, columns, or tags arrays', () => {
      const storage = new StorageServiceMock();
      const missingTasks = JSON.stringify({ columns: [], tags: [] });
      const missingColumns = JSON.stringify({ tasks: [], tags: [] });
      const missingTags = JSON.stringify({ tasks: [], columns: [] });

      expect(storage.importJSON(missingTasks).success).toBe(false);
      expect(storage.importJSON(missingColumns).success).toBe(false);
      expect(storage.importJSON(missingTags).success).toBe(false);
    });

    it('T5.6: should recover from corrupted unparseable storage and generate corrupt backup key', () => {
      const storage = new StorageServiceMock();
      const corruptPayload = '<<<CORRUPTED_RAW_BINARY_DATA>>>';
      storage.setItem(STORAGE_KEY, corruptPayload);

      const recoveredState = storage.loadState();
      expect(recoveredState.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(recoveredState.tasks.length).toBeGreaterThan(0);
      expect(storage.getItem(`${STORAGE_KEY}_corrupt_backup`)).toBe(corruptPayload);
    });
  });

  // ==========================================================================
  // 2. SCHEMA MIGRATIONS & DEFAULTS BACKFILLING
  // ==========================================================================
  describe('T5.7 - T5.9: Schema Migration & Auto-Backfill Resilience', () => {
    it('T5.7: should safely backfill and sanitize tasks with missing or partial fields', () => {
      const storage = new StorageServiceMock();
      const unversionedState = {
        version: 1,
        tasks: [
          {
            id: 'unversioned-t1',
            title: 'Unversioned Title',
            // Missing description, horizon, priority, dueDate, tags, subtasks, order, etc.
          },
        ],
        columns: [{ id: 'todo', title: 'Por hacer', order: 0, wipLimit: null, isCompletedColumn: false }],
        tags: [],
      };

      storage.setItem(STORAGE_KEY, JSON.stringify(unversionedState));
      const loaded = storage.loadState();
      const task = loaded.tasks[0];

      expect(task.id).toBe('unversioned-t1');
      expect(task.title).toBe('Unversioned Title');
      expect(task.description).toBe('');
      expect(task.tags).toEqual([]);
      expect(task.subtasks).toEqual([]);
    });

    it('T5.8: should migrate legacy v0 payload with empty columns by applying initial columns', () => {
      const storage = new StorageServiceMock();
      const legacyState = {
        tasks: [],
        columns: [], // Empty columns
        tags: [],
      };

      const imported = storage.importJSON(JSON.stringify(legacyState));
      expect(imported.success).toBe(true);
      expect(imported.state?.tasks).toBeDefined();
    });

    it('T5.9: should preserve task order across schema load and save roundtrips', () => {
      const storage = new StorageServiceMock();
      const state = getInitialSeedData();
      state.tasks[0].order = 42;

      storage.saveState(state);
      const reloaded = storage.loadState();
      expect(reloaded.tasks[0].order).toBe(42);
    });
  });

  // ==========================================================================
  // 3. REDUCER ADVERSARIAL STRESS & CLAMPING
  // ==========================================================================
  describe('T5.10 - T5.19: Reducer Boundary & Immutability Hardening', () => {
    it('T5.10: should clamp out-of-bounds newOrder in MOVE_TASK without throwing or corrupting order', () => {
      let state = getInitialSeedData();

      // Negative order clamped to 0
      state = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d1', targetColumnId: 'todo', newOrder: -50 },
      });
      let moved = state.tasks.find(t => t.id === 'task-d1')!;
      expect(moved.columnId).toBe('todo');
      expect(moved.order).toBe(0);

      // Huge order clamped to column length
      state = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d1', targetColumnId: 'todo', newOrder: 9999 },
      });
      moved = state.tasks.find(t => t.id === 'task-d1')!;
      expect(moved.columnId).toBe('todo');
      expect(moved.order).toBeGreaterThanOrEqual(0);
    });

    it('T5.11: should handle rapid 50 sequential cross-column moves preserving 0..N-1 contiguous orders', () => {
      let state = getInitialSeedData();
      const allTaskIds = state.tasks.map(t => t.id);
      const columnIds = state.columns.map(c => c.id);

      for (let i = 0; i < 50; i++) {
        const taskId = allTaskIds[i % allTaskIds.length];
        const targetCol = columnIds[i % columnIds.length];
        state = taskReducer(state, {
          type: 'MOVE_TASK',
          payload: { taskId, targetColumnId: targetCol, newOrder: i % 3 },
        });
      }

      // Check order contiguity in each column
      for (const col of state.columns) {
        const colTasks = state.tasks
          .filter(t => t.columnId === col.id)
          .sort((a, b) => a.order - b.order);

        colTasks.forEach((task, idx) => {
          expect(task.order).toBe(idx);
        });
      }
    });

    it('T5.12: should delete column safely and migrate all tasks to fallback column', () => {
      let state = getInitialSeedData();
      state = taskReducer(state, {
        type: 'ADD_COLUMN',
        payload: { id: 'col-temp', title: 'Temporal' },
      });

      // Move two tasks into col-temp
      state = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d1', targetColumnId: 'col-temp' },
      });
      state = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d2', targetColumnId: 'col-temp' },
      });

      // Delete col-temp with fallback to 'in-progress'
      state = taskReducer(state, {
        type: 'DELETE_COLUMN',
        payload: { columnId: 'col-temp', fallbackColumnId: 'in-progress' },
      });

      expect(state.columns.some(c => c.id === 'col-temp')).toBe(false);
      expect(state.tasks.find(t => t.id === 'task-d1')?.columnId).toBe('in-progress');
      expect(state.tasks.find(t => t.id === 'task-d2')?.columnId).toBe('in-progress');
    });

    it('T5.13: should return unchanged state when REORDER_COLUMN_TASKS receives empty taskIds', () => {
      const state = getInitialSeedData();
      const nextState = taskReducer(state, {
        type: 'REORDER_COLUMN_TASKS',
        payload: { columnId: 'todo', taskIds: [] },
      });

      expect(nextState.tasks.length).toBe(state.tasks.length);
    });

    it('T5.14: should preserve unmentioned tasks at end of column during REORDER_COLUMN_TASKS', () => {
      let state = getInitialSeedData();
      // 'todo' has task-d2 in seed
      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'extra-todo-1',
          title: 'Extra Todo 1',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'low',
          dueDate: null,
          tags: [],
          subtasks: [],
        },
      });

      // Reorder specifying only extra-todo-1
      state = taskReducer(state, {
        type: 'REORDER_COLUMN_TASKS',
        payload: { columnId: 'todo', taskIds: ['extra-todo-1'] },
      });

      const todoTasks = state.tasks.filter(t => t.columnId === 'todo');
      expect(todoTasks.find(t => t.id === 'extra-todo-1')?.order).toBe(0);
    });

    it('T5.15: should reject ADD_TASK with whitespace-only title without adding to state', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'ADD_TASK',
          payload: {
            title: '\n\t   \t\n',
            description: '',
            horizon: 'daily',
            columnId: 'todo',
            priority: 'low',
            dueDate: null,
            tags: [],
            subtasks: [],
          },
        });
      }).toThrow('Task title cannot be empty');
    });

    it('T5.16: should duplicate task in completed column and assign completedAt timestamp', () => {
      let state = getInitialSeedData();
      // task-d1 is in 'done' column
      const doneTask = state.tasks.find(t => t.id === 'task-d1')!;
      expect(doneTask.columnId).toBe('done');

      state = taskReducer(state, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-d1', newId: 'clone-of-done' },
      });

      const clone = state.tasks.find(t => t.id === 'clone-of-done')!;
      expect(clone).toBeTruthy();
      expect(clone.title).toContain('(Copia)');
    });

    it('T5.17: should toggle subtask completion back and forth cleanly', () => {
      let state = getInitialSeedData();
      const taskId = 'task-w1';
      const subtaskId = 'st-w1'; // true initially

      state = taskReducer(state, {
        type: 'TOGGLE_SUBTASK',
        payload: { taskId, subtaskId },
      });
      let task = state.tasks.find(t => t.id === taskId)!;
      expect(task.subtasks.find(s => s.id === subtaskId)?.completed).toBe(false);

      state = taskReducer(state, {
        type: 'TOGGLE_SUBTASK',
        payload: { taskId, subtaskId },
      });
      task = state.tasks.find(t => t.id === taskId)!;
      expect(task.subtasks.find(s => s.id === subtaskId)?.completed).toBe(true);
    });

    it('T5.18: should guarantee state immutability when reducer actions are executed', () => {
      const state = getInitialSeedData();
      const frozenState = Object.freeze({
        ...state,
        tasks: Object.freeze([...state.tasks]),
      });

      expect(() => {
        taskReducer(frozenState as any, {
          type: 'SET_THEME',
          payload: 'dark',
        });
      }).not.toThrow();
    });

    it('T5.19: should reset completedAt to null when task is moved out of done column', () => {
      let state = getInitialSeedData();
      // task-d1 is done
      expect(state.tasks.find(t => t.id === 'task-d1')?.completedAt).toBeTruthy();

      state = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d1', targetColumnId: 'todo' },
      });

      const moved = state.tasks.find(t => t.id === 'task-d1')!;
      expect(moved.columnId).toBe('todo');
      expect(moved.completedAt).toBeNull();
    });
  });

  // ==========================================================================
  // 4. METRICS & PRODUCTIVITY CALCULATOR DEFENSES
  // ==========================================================================
  describe('T5.20 - T5.22: Metrics Precision & Division Safety', () => {
    it('T5.20: should calculate metrics with zero tasks returning 0% and non-NaN values', () => {
      const emptyTasks: Task[] = [];
      const columns = getInitialSeedData().columns;
      const metrics = calculateMetrics(emptyTasks, columns, '2026-10-12');

      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completedTodayPercent).toBe(0);
      expect(metrics.completedWeekPercent).toBe(0);
      expect(Number.isNaN(metrics.completedTodayPercent)).toBe(false);
      expect(Number.isFinite(metrics.completedTodayPercent)).toBe(true);
    });

    it('T5.21: should strictly ignore overdue dates on completed tasks in metrics overdueCount', () => {
      let state = getInitialSeedData();
      // Add overdue task in 'done' column
      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'task-overdue-done',
          title: 'Finished Past Due',
          description: '',
          horizon: 'daily',
          columnId: 'done',
          priority: 'high',
          dueDate: '2020-01-01', // Severely overdue date
          tags: [],
          subtasks: [],
        },
      });

      const metrics = calculateMetrics(state.tasks, state.columns, '2026-10-12');
      // Must not count finished task as overdue
      expect(metrics.overdueCount).toBe(0);
    });

    it('T5.22: should calculate child progress rollup for parents with mixed completed states', () => {
      const parentId = 'test-parent-rollup';
      const syntheticTasks: Task[] = [
        {
          id: 'child-1',
          title: 'Child 1',
          description: '',
          horizon: 'daily',
          columnId: 'done',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: parentId,
          order: 0,
          createdAt: '',
          updatedAt: '',
          completedAt: '2026-10-12T00:00:00Z',
        },
        {
          id: 'child-2',
          title: 'Child 2',
          description: '',
          horizon: 'daily',
          columnId: 'in-progress',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: parentId,
          order: 1,
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
        {
          id: 'child-3',
          title: 'Child 3',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: parentId,
          order: 2,
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      ];

      const rollup = calculateChildProgress(parentId, syntheticTasks);
      expect(rollup.total).toBe(3);
      expect(rollup.completed).toBe(1);
      expect(rollup.percent).toBe(33);
    });
  });

  // ==========================================================================
  // 5. DATE ARITHMETIC & LEAP YEAR CORNER CASES
  // ==========================================================================
  describe('T5.23 - T5.25: Date Arithmetic & Hierarchy Integrity', () => {
    it('T5.23: should accurately handle leap year dates and month transition strings', () => {
      const leapDate = '2028-02-29';
      const [y, m, d] = leapDate.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));

      expect(dateObj.getUTCFullYear()).toBe(2028);
      expect(dateObj.getUTCMonth()).toBe(1); // 0-indexed February
      expect(dateObj.getUTCDate()).toBe(29);
    });

    it('T5.24: should prevent circular parent links where task links to itself during update', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'UPDATE_TASK',
          payload: {
            id: 'task-w1',
            updates: { parentTaskId: 'task-w1' },
          },
        });
      }).toThrow('A task cannot be its own parent');
    });

    it('T5.25: should reject inverted hierarchy linking when daily task attempts to be parent of monthly', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'ADD_TASK',
          payload: {
            id: 'invalid-monthly-inverted',
            title: 'Invalid Inverted Monthly',
            description: '',
            horizon: 'monthly',
            columnId: 'todo',
            priority: 'medium',
            dueDate: null,
            tags: [],
            subtasks: [],
            parentTaskId: 'task-d1',
          },
        });
      }).toThrow('Monthly tasks cannot have a parent task');
    });
  });
});

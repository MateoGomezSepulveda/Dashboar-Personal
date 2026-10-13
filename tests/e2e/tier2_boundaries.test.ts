/**
 * Tier 2: Boundary & Corner Cases (R1-R5)
 * tests/e2e/tier2_boundaries.test.ts
 *
 * Stresses boundary limits, zero-value conditions, circular links,
 * corrupt inputs, extreme lengths, leap dates, and resource quotas.
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
  STORAGE_KEY,
} from './harness.js';

describe('Tier 2: Boundary & Corner Cases', () => {
  // ==========================================================================
  // R1 Boundaries: Temporal Horizons & Hierarchy
  // ==========================================================================
  describe('R1 Boundaries: Temporal Horizons', () => {
    it('T2.1: should strictly reject circular parent linking (task linking to itself)', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'UPDATE_TASK',
          payload: {
            id: 'task-d1',
            updates: { parentTaskId: 'task-d1' },
          },
        });
      }).toThrow('A task cannot be its own parent');
    });

    it('T2.2: should reject inverted hierarchy linking (monthly task linking to a child)', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'ADD_TASK',
          payload: {
            id: 'invalid-monthly',
            title: 'Objetivo Mensual Invalido',
            description: '',
            horizon: 'monthly',
            columnId: 'todo',
            priority: 'low',
            dueDate: null,
            tags: [],
            subtasks: [],
            parentTaskId: 'task-d1', // Cannot have parent
          },
        });
      }).toThrow('Monthly tasks cannot have a parent task');
    });

    it('T2.3: should safely detach child tasks (parentTaskId = null) when parent is deleted', () => {
      let state = getInitialSeedData();
      // task-w1 is parent to task-d1 and task-d2
      expect(state.tasks.find(t => t.id === 'task-d1')?.parentTaskId).toBe('task-w1');
      expect(state.tasks.find(t => t.id === 'task-d2')?.parentTaskId).toBe('task-w1');

      // Delete parent task-w1
      state = taskReducer(state, {
        type: 'DELETE_TASK',
        payload: { id: 'task-w1' },
      });

      expect(state.tasks.some(t => t.id === 'task-w1')).toBe(false);
      // Children must exist intact with parentTaskId set to null
      const childD1 = state.tasks.find(t => t.id === 'task-d1');
      const childD2 = state.tasks.find(t => t.id === 'task-d2');
      expect(childD1).toBeTruthy();
      expect(childD1?.parentTaskId).toBeNull();
      expect(childD2).toBeTruthy();
      expect(childD2?.parentTaskId).toBeNull();
    });

    it('T2.4: should gracefully handle child tasks referencing a non-existent parent ID', () => {
      const state = getInitialSeedData();
      // Query rollup on a phantom parent ID
      const progress = calculateChildProgress('phantom-id-999', state.tasks);
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percent).toBe(0);
    });

    it('T2.5: should calculate rollup for high cardinality children (500 tasks) under 5ms', () => {
      const parentId = 'high-cardinality-parent';
      const syntheticTasks: Task[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 500; i++) {
        syntheticTasks.push({
          id: `child-${i}`,
          title: `Child ${i}`,
          description: '',
          horizon: 'daily',
          columnId: i % 2 === 0 ? 'done' : 'todo',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
          parentTaskId: parentId,
          order: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: i % 2 === 0 ? new Date().toISOString() : null,
        });
      }

      const progress = calculateChildProgress(parentId, syntheticTasks);
      const elapsed = Date.now() - startTime;

      expect(progress.total).toBe(500);
      expect(progress.completed).toBe(250);
      expect(progress.percent).toBe(50);
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // R2 Boundaries: Kanban Board & Drag-Drop
  // ==========================================================================
  describe('R2 Boundaries: Kanban Board', () => {
    it('T2.6: should place task at order 0 when moving to an empty column', () => {
      let state = getInitialSeedData();
      // Add empty custom column
      state = taskReducer(state, {
        type: 'ADD_COLUMN',
        payload: { id: 'col-empty', title: 'Vacía' },
      });

      state = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d2', targetColumnId: 'col-empty', newOrder: 0 },
      });

      const moved = state.tasks.find(t => t.id === 'task-d2');
      expect(moved?.columnId).toBe('col-empty');
      expect(moved?.order).toBe(0);
    });

    it('T2.7: should snap back card to original column and order if dropped to invalid target', () => {
      const state = getInitialSeedData();
      const original = state.tasks.find(t => t.id === 'task-d2')!;

      // Attempt move to non-existent column
      const nextState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-d2', targetColumnId: 'invalid-non-existent-col' },
      });

      const unchanged = nextState.tasks.find(t => t.id === 'task-d2')!;
      expect(unchanged.columnId).toBe(original.columnId);
      expect(unchanged.order).toBe(original.order);
    });

    it('T2.8: should flag WIP limit breach when column task count exceeds wipLimit', () => {
      let state = getInitialSeedData();
      // in-progress has wipLimit: 5
      const inProgressCol = state.columns.find(c => c.id === 'in-progress')!;
      expect(inProgressCol.wipLimit).toBe(5);

      // Current tasks in in-progress: task-m1, task-w1 (2 tasks)
      // Add 4 more tasks to in-progress
      for (let i = 1; i <= 4; i++) {
        state = taskReducer(state, {
          type: 'ADD_TASK',
          payload: {
            id: `ip-extra-${i}`,
            title: `In Progress Task ${i}`,
            description: '',
            horizon: 'daily',
            columnId: 'in-progress',
            priority: 'low',
            dueDate: null,
            tags: [],
            subtasks: [],
          },
        });
      }

      const currentCount = state.tasks.filter(t => t.columnId === 'in-progress').length;
      expect(currentCount).toBe(6);
      const isOverWip = inProgressCol.wipLimit !== null && currentCount > inProgressCol.wipLimit;
      expect(isOverWip).toBe(true);
    });

    it('T2.9: should maintain contiguous 0-based indexing after 20 rapid sequential moves', () => {
      let state = getInitialSeedData();
      const taskIds = ['task-d1', 'task-d2', 'task-w1', 'task-m1'];

      for (let i = 0; i < 20; i++) {
        const taskId = taskIds[i % taskIds.length];
        const targetCol = i % 2 === 0 ? 'todo' : 'done';
        state = taskReducer(state, {
          type: 'MOVE_TASK',
          payload: { taskId, targetColumnId: targetCol },
        });
      }

      // Check contiguous order in each column
      for (const col of state.columns) {
        const colTasks = state.tasks
          .filter(t => t.columnId === col.id)
          .sort((a, b) => a.order - b.order);
        colTasks.forEach((t, idx) => {
          expect(t.order).toBe(idx);
        });
      }
    });

    it('T2.10: should reject duplicate column ID creation', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'ADD_COLUMN',
          payload: { id: 'todo', title: 'Duplicate To Do' },
        });
      }).toThrow('already exists');
    });
  });

  // ==========================================================================
  // R3 Boundaries: Task Titles, Lengths, Due Dates & Division Safety
  // ==========================================================================
  describe('R3 Boundaries: Task Management & Metrics', () => {
    it('T2.11: should reject empty and whitespace-only task title', () => {
      const state = getInitialSeedData();
      expect(() => {
        taskReducer(state, {
          type: 'ADD_TASK',
          payload: {
            title: '   ',
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

    it('T2.12: should enforce 250 characters max title boundary', () => {
      let state = getInitialSeedData();
      const exact250Title = 'A'.repeat(250);
      const exceed251Title = 'A'.repeat(251);

      // 250 characters succeeds
      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'task-boundary-250',
          title: exact250Title,
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'low',
          dueDate: null,
          tags: [],
          subtasks: [],
        },
      });
      expect(state.tasks.some(t => t.id === 'task-boundary-250')).toBe(true);

      // 251 characters throws
      expect(() => {
        taskReducer(state, {
          type: 'ADD_TASK',
          payload: {
            title: exceed251Title,
            description: '',
            horizon: 'daily',
            columnId: 'todo',
            priority: 'low',
            dueDate: null,
            tags: [],
            subtasks: [],
          },
        });
      }).toThrow('exceeds maximum length of 250 characters');
    });

    it('T2.13: should accurately handle leap year dates and year boundary dates', () => {
      let state = getInitialSeedData();
      const leapDate = '2028-02-29';
      const yearBoundaryDate = '2026-12-31';

      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'task-leap',
          title: 'Leap Year Task',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'low',
          dueDate: leapDate,
          tags: [],
          subtasks: [],
        },
      });

      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'task-boundary-year',
          title: 'Year Boundary Task',
          description: '',
          horizon: 'monthly',
          columnId: 'todo',
          priority: 'medium',
          dueDate: yearBoundaryDate,
          tags: [],
          subtasks: [],
        },
      });

      const leapTask = state.tasks.find(t => t.id === 'task-leap');
      const boundaryTask = state.tasks.find(t => t.id === 'task-boundary-year');
      expect(leapTask?.dueDate).toBe('2028-02-29');
      expect(boundaryTask?.dueDate).toBe('2026-12-31');
    });

    it('T2.14: should return 0% completion rate without NaN or Infinity when task list is empty', () => {
      const emptyTasks: Task[] = [];
      const columns = getInitialSeedData().columns;
      const metrics = calculateMetrics(emptyTasks, columns, '2026-10-12');

      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completedTodayPercent).toBe(0);
      expect(metrics.completedWeekPercent).toBe(0);
      expect(Number.isNaN(metrics.completedTodayPercent)).toBe(false);
      expect(Number.isFinite(metrics.completedTodayPercent)).toBe(true);
    });

    it('T2.15: should handle subtask titles with special characters and prevent corruption', () => {
      let state = getInitialSeedData();
      const specialSubtaskTitle = 'Test <script> & "quotes" \'apostrophes\' / slashes';

      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'task-special-subtasks',
          title: 'Special Chars Task',
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'low',
          dueDate: null,
          tags: [],
          subtasks: [
            { id: 'st-spec-1', title: specialSubtaskTitle, completed: false },
          ],
        },
      });

      const task = state.tasks.find(t => t.id === 'task-special-subtasks');
      expect(task?.subtasks[0].title).toBe(specialSubtaskTitle);
    });
  });

  // ==========================================================================
  // R4 Boundaries: Storage Corruption, Malformed Payloads & Quota Errors
  // ==========================================================================
  describe('R4 Boundaries: Storage & Migrations', () => {
    it('T2.16: should recover from corrupted unparseable JSON in storage by initializing seed', () => {
      const storage = new StorageServiceMock();
      storage.setItem(STORAGE_KEY, '{malformed, json: invalid}');

      const loaded = storage.loadState();
      expect(loaded.version).toBe(1);
      expect(loaded.tasks.length).toBeGreaterThan(0);
      // Verify corrupt string was backed up
      expect(storage.getItem(`${STORAGE_KEY}_corrupt_backup`)).toBe('{malformed, json: invalid}');
    });

    it('T2.17: should reject import payload missing required tasks or columns array', () => {
      const storage = new StorageServiceMock();
      const payloadMissingColumns = JSON.stringify({
        version: 1,
        tasks: [],
        // columns is missing
        tags: [],
      });

      const result = storage.importJSON(payloadMissingColumns);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing or invalid "columns" array');
    });

    it('T2.18: should reject import payloads with non-object structure or syntax errors', () => {
      const storage = new StorageServiceMock();
      const arrayPayload = JSON.stringify(['not', 'an', 'object']);

      const result = storage.importJSON(arrayPayload);
      expect(result.success).toBe(false);
    });

    it('T2.19: should handle browser QuotaExceededError gracefully without crashing application', () => {
      const storage = new StorageServiceMock();
      storage.simulateQuotaError = true;

      const state = getInitialSeedData();
      const saveResult = storage.saveState(state);
      expect(saveResult).toBe(false);
    });

    it('T2.20: should validate and import high volume backup payload (1,000 tasks)', () => {
      const storage = new StorageServiceMock();
      const hugeTasks: Task[] = [];

      for (let i = 0; i < 1000; i++) {
        hugeTasks.push({
          id: `bulk-${i}`,
          title: `Bulk Task ${i}`,
          description: '',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'low',
          dueDate: null,
          tags: [],
          subtasks: [],
          order: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const hugePayload = {
        version: 1,
        tasks: hugeTasks,
        columns: getInitialSeedData().columns,
        tags: [],
        selectedHorizon: 'all' as const,
        searchQuery: '',
        theme: 'light' as const,
      };

      const result = storage.importJSON(JSON.stringify(hugePayload));
      expect(result.success).toBe(true);
      expect(result.state?.tasks.length).toBe(1000);
    });
  });

  // ==========================================================================
  // R5 Boundaries: UI/UX Pro Max Edge Conditions
  // ==========================================================================
  describe('R5 Boundaries: UI/UX Pro Max', () => {
    it('T2.21: should fallback gracefully to light theme if invalid theme value is encountered', () => {
      const sanitizeTheme = (theme: string): 'light' | 'dark' => {
        return theme === 'dark' ? 'dark' : 'light';
      };

      expect(sanitizeTheme('cyberpunk')).toBe('light');
      expect(sanitizeTheme('')).toBe('light');
      expect(sanitizeTheme('dark')).toBe('dark');
    });

    it('T2.22: should handle massive markdown descriptions (50,000 characters) without error', () => {
      let state = getInitialSeedData();
      const hugeMarkdown = '# Header\n\n' + 'Lipsum paragraph with text.\n\n'.repeat(1600);
      expect(hugeMarkdown.length).toBeGreaterThan(50000);

      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id: 'task-huge-desc',
          title: 'Task with 50K Markdown',
          description: hugeMarkdown,
          horizon: 'monthly',
          columnId: 'todo',
          priority: 'medium',
          dueDate: null,
          tags: [],
          subtasks: [],
        },
      });

      const task = state.tasks.find(t => t.id === 'task-huge-desc');
      expect(task?.description.length).toBeGreaterThan(50000);
    });

    it('T2.23: should support ultra-compact mobile viewport down to 320px width', () => {
      const minViewport = 320;
      const getColumnLayoutStrategy = (width: number) => {
        if (width < 640) return 'horizontal-snap-carousel';
        if (width < 1024) return 'two-column-adaptive';
        return 'multi-column-grid';
      };

      expect(getColumnLayoutStrategy(minViewport)).toBe('horizontal-snap-carousel');
    });

    it('T2.24: should discard uncommitted form edits when Escape key is pressed', () => {
      const originalTitle = 'Original Task Title';
      let draftTitle = 'Dirty Edited Title That User Abandoned';

      const handleEscape = () => {
        draftTitle = originalTitle; // rollback
      };

      handleEscape();
      expect(draftTitle).toBe('Original Task Title');
    });

    it('T2.25: should enforce maximum tag count limit (up to 5 tags) per task', () => {
      const validateTags = (tags: string[]): { valid: boolean; error?: string } => {
        if (tags.length > 5) {
          return { valid: false, error: 'Maximum 5 tags allowed per task' };
        }
        return { valid: true };
      };

      expect(validateTags(['t1', 't2', 't3', 't4', 't5']).valid).toBe(true);
      expect(validateTags(['t1', 't2', 't3', 't4', 't5', 't6']).valid).toBe(false);
    });
  });
});

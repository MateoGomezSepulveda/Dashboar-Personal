// src/test/challenger_stress.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { taskReducer } from '../context/taskReducer';
import { DashboardAppState, KanbanColumn, Task } from '../types/domain';
import { INITIAL_APP_STATE } from '../constants/initialData';

describe('Milestone 1 Challenger Stress & Boundary Test Suite', () => {
  const testColumns: KanbanColumn[] = [
    { id: 'todo', title: 'Por hacer', order: 0, wipLimit: null, isCompletedColumn: false },
    { id: 'in-progress', title: 'En progreso', order: 1, wipLimit: 3, isCompletedColumn: false },
    { id: 'done', title: 'Completado', order: 2, wipLimit: null, isCompletedColumn: true },
  ];

  let state: DashboardAppState;

  beforeEach(() => {
    state = {
      version: 1,
      columns: [...testColumns],
      tags: [
        { id: 'tag-frontend', name: 'Frontend', color: '#2563EB' },
        { id: 'tag-backend', name: 'Backend', color: '#10B981' },
      ],
      selectedHorizon: 'all',
      searchQuery: '',
      theme: 'dark',
      tasks: [
        {
          id: 'task-1',
          title: 'Macro Meta Mensual',
          description: 'Hito principal',
          horizon: 'monthly',
          columnId: 'todo',
          priority: 'high',
          dueDate: '2026-10-31',
          tags: ['tag-frontend'],
          subtasks: [
            { id: 'st-1', title: 'Sub 1', completed: true, order: 0 },
            { id: 'st-2', title: 'Sub 2', completed: false, order: 1 },
          ],
          parentTaskId: null,
          order: 0,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
          completedAt: null,
        },
        {
          id: 'task-2',
          title: 'Compromiso Semanal',
          description: 'Desglose',
          horizon: 'weekly',
          columnId: 'todo',
          priority: 'medium',
          dueDate: '2026-10-20',
          tags: ['tag-backend'],
          subtasks: [],
          parentTaskId: 'task-1',
          order: 1,
          createdAt: '2026-10-02T00:00:00Z',
          updatedAt: '2026-10-02T00:00:00Z',
          completedAt: null,
        },
        {
          id: 'task-3',
          title: 'Tarea Diaria 1',
          description: 'Ejecución hoy',
          horizon: 'daily',
          columnId: 'in-progress',
          priority: 'high',
          dueDate: '2026-10-12',
          tags: ['tag-frontend'],
          subtasks: [],
          parentTaskId: 'task-2',
          order: 0,
          createdAt: '2026-10-03T00:00:00Z',
          updatedAt: '2026-10-03T00:00:00Z',
          completedAt: null,
        },
      ],
    };
  });

  // ==========================================================================
  // 1. RAPID SEQUENTIAL MOVES
  // ==========================================================================
  describe('1. Rapid Sequential Moves', () => {
    it('preserves contiguous 0..N-1 orders across a rapid sequence of 10 moves', () => {
      let cur = state;

      // 1. Move task-1 from todo to in-progress at index 0
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'in-progress', destinationIndex: 0 },
      });
      // 2. Move task-2 to in-progress at index 2
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-2', destinationColumnId: 'in-progress', destinationIndex: 2 },
      });
      // 3. Move task-3 to done at index 0
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-3', destinationColumnId: 'done', destinationIndex: 0 },
      });
      // 4. Move task-1 within in-progress from 0 to 1
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'in-progress', destinationIndex: 1 },
      });
      // 5. Move task-2 to done at index 1
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-2', destinationColumnId: 'done', destinationIndex: 1 },
      });
      // 6. Move task-3 back to todo at index 0
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-3', destinationColumnId: 'todo', destinationIndex: 0 },
      });
      // 7. Move task-1 to done at index 0
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'done', destinationIndex: 0 },
      });
      // 8. Move task-2 within done from 1 to 0
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-2', destinationColumnId: 'done', destinationIndex: 0 },
      });
      // 9. Move task-3 to done at index 99 (out of bounds)
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-3', destinationColumnId: 'done', destinationIndex: 99 },
      });
      // 10. Move task-1 back to todo at index 0
      cur = taskReducer(cur, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'todo', destinationIndex: 0 },
      });

      // Verify contiguous order for all columns
      for (const col of cur.columns) {
        const colTasks = cur.tasks
          .filter(t => t.columnId === col.id)
          .sort((a, b) => a.order - b.order);

        colTasks.forEach((t, idx) => {
          expect(t.order).toBe(idx);
        });
      }

      // Total task count must remain exactly 3
      expect(cur.tasks.length).toBe(3);
      expect(new Set(cur.tasks.map(t => t.id)).size).toBe(3);
    });

    it('ADVERSARIAL: Stale sourceColumnId does not duplicate task in state', () => {
      // task-1 is in 'todo'
      // Suppose client sends stale sourceColumnId = 'in-progress'
      const nextState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-1',
          sourceColumnId: 'in-progress', // STALE! Actual column is 'todo'
          destinationColumnId: 'done',
          destinationIndex: 0,
        },
      });

      const task1Occurrences = nextState.tasks.filter(t => t.id === 'task-1');
      // If the reducer improperly uses payload.sourceColumnId to filter out the task,
      // task-1 will appear in both 'todo' and 'done'!
      // A robust reducer should either deduplicate or use task.columnId as single source of truth.
      expect(task1Occurrences.length).toBe(1);
    });
  });

  // ==========================================================================
  // 2. OUT-OF-BOUNDS ORDERS & CLAMPING
  // ==========================================================================
  describe('2. Out-of-bounds Orders', () => {
    it('clamps negative destinationIndex to 0 for intra-column and inter-column moves', () => {
      // Intra-column
      const nextIntra = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-2', destinationColumnId: 'todo', destinationIndex: -99 },
      });
      const t2Intra = nextIntra.tasks.find(t => t.id === 'task-2');
      expect(t2Intra?.order).toBe(0);

      // Inter-column
      const nextInter = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-3', destinationColumnId: 'todo', destinationIndex: -50 },
      });
      const t3Inter = nextInter.tasks.find(t => t.id === 'task-3');
      expect(t3Inter?.order).toBe(0);
    });

    it('clamps excessive destinationIndex to column length', () => {
      const nextState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-3', destinationColumnId: 'todo', destinationIndex: 999999 },
      });
      const t3 = nextState.tasks.find(t => t.id === 'task-3');
      // In 'todo' there were 2 tasks (0, 1). Adding t3 should give order 2.
      expect(t3?.order).toBe(2);
    });

    it('normalizes arbitrary out-of-bounds orders in ADD_TASK', () => {
      const nextState = taskReducer(state, {
        type: 'ADD_TASK',
        payload: { title: 'High Order Task', columnId: 'todo', order: 888 },
      });
      const added = nextState.tasks.find(t => t.title === 'High Order Task');
      expect(added?.order).toBe(2); // Normalized contiguous order
    });

    it('ADVERSARIAL: REORDER_COLUMNS with out-of-bounds startIndex is safely handled', () => {
      const nextState = taskReducer(state, {
        type: 'REORDER_COLUMNS',
        payload: { startIndex: 99, endIndex: 0 },
      });
      // Columns array must not contain undefined or corrupt entries
      expect(nextState.columns.length).toBe(state.columns.length);
      nextState.columns.forEach(c => {
        expect(c).toBeDefined();
        expect(typeof c.id).toBe('string');
      });
    });
  });

  // ==========================================================================
  // 3. EMPTY LISTS & ZERO-TASK BOUNDARIES
  // ==========================================================================
  describe('3. Empty Lists', () => {
    it('moves a task into an empty column cleanly', () => {
      // Column 'done' starts completely empty
      expect(state.tasks.filter(t => t.columnId === 'done').length).toBe(0);

      const nextState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'done', destinationIndex: 0 },
      });

      const doneTasks = nextState.tasks.filter(t => t.columnId === 'done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].order).toBe(0);
      expect(doneTasks[0].completedAt).toBeTruthy();
    });

    it('moves the last remaining task out of a column, leaving it empty', () => {
      // 'in-progress' has only task-3
      const nextState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-3', destinationColumnId: 'done', destinationIndex: 0 },
      });

      const inProgressTasks = nextState.tasks.filter(t => t.columnId === 'in-progress');
      expect(inProgressTasks.length).toBe(0);
    });

    it('safely handles empty state.tasks across all actions', () => {
      const emptyState: DashboardAppState = { ...state, tasks: [] };

      // None of these should throw or corrupt state
      expect(() => taskReducer(emptyState, { type: 'DELETE_TASK', payload: 'any' })).not.toThrow();
      expect(() => taskReducer(emptyState, { type: 'UPDATE_TASK', payload: { id: 'x', updates: {} } })).not.toThrow();
      expect(() => taskReducer(emptyState, { type: 'MOVE_TASK', payload: { taskId: 'x', destinationColumnId: 'todo' } })).not.toThrow();
      expect(() => taskReducer(emptyState, { type: 'DUPLICATE_TASK', payload: { id: 'x' } })).not.toThrow();
      expect(() => taskReducer(emptyState, { type: 'TOGGLE_SUBTASK', payload: { taskId: 'x', subtaskId: 'y' } })).not.toThrow();

      const addedState = taskReducer(emptyState, {
        type: 'ADD_TASK',
        payload: { title: 'First Task', columnId: 'todo' },
      });
      expect(addedState.tasks.length).toBe(1);
      expect(addedState.tasks[0].order).toBe(0);
    });

    it('ADVERSARIAL: REORDER_COLUMN_TASKS with partial taskIds does not silently drop unmentioned tasks', () => {
      // 'todo' has task-1 and task-2
      const nextState = taskReducer(state, {
        type: 'REORDER_COLUMN_TASKS',
        payload: { columnId: 'todo', taskIds: ['task-1'] }, // Omitted task-2!
      });

      const task2 = nextState.tasks.find(t => t.id === 'task-2');
      // If task-2 is silently dropped, data loss occurs
      expect(task2).toBeDefined();
    });
  });

  // ==========================================================================
  // 4. MOVING BETWEEN COLUMNS & COMPLETED LIFECYCLE
  // ==========================================================================
  describe('4. Moving Between Columns', () => {
    it('sets completedAt when moved to a completed column', () => {
      const nextState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'done', destinationIndex: 0 },
      });
      const moved = nextState.tasks.find(t => t.id === 'task-1');
      expect(moved?.columnId).toBe('done');
      expect(moved?.completedAt).toBeTruthy();
    });

    it('clears completedAt to null when moved out of a completed column', () => {
      // First move to done
      const doneState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'done', destinationIndex: 0 },
      });

      // Then move back to in-progress
      const nextState = taskReducer(doneState, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'in-progress', destinationIndex: 0 },
      });

      const movedBack = nextState.tasks.find(t => t.id === 'task-1');
      expect(movedBack?.columnId).toBe('in-progress');
      expect(movedBack?.completedAt).toBeNull();
    });
  });

  // ==========================================================================
  // 5. ORPHAN TASK DETACHMENT ON PARENT DELETION
  // ==========================================================================
  describe('5. Orphan Task Detachment on Parent Deletion', () => {
    it('detaches children and sets parentTaskId to null when parent is deleted', () => {
      // task-2 has parentTaskId = 'task-1'
      expect(state.tasks.find(t => t.id === 'task-2')?.parentTaskId).toBe('task-1');

      const nextState = taskReducer(state, {
        type: 'DELETE_TASK',
        payload: 'task-1',
      });

      expect(nextState.tasks.some(t => t.id === 'task-1')).toBe(false);
      const child = nextState.tasks.find(t => t.id === 'task-2');
      expect(child).toBeDefined();
      expect(child?.parentTaskId).toBeNull();
    });

    it('preserves multi-level hierarchy when top-level parent is deleted', () => {
      // task-1 -> task-2 -> task-3
      // Deleting task-1 detaches task-2, but task-3 still points to task-2
      const nextState = taskReducer(state, {
        type: 'DELETE_TASK',
        payload: 'task-1',
      });

      const t2 = nextState.tasks.find(t => t.id === 'task-2');
      const t3 = nextState.tasks.find(t => t.id === 'task-3');

      expect(t2?.parentTaskId).toBeNull();
      expect(t3?.parentTaskId).toBe('task-2');
    });
  });

  // ==========================================================================
  // 6. DUPLICATE TASK DEEP COPYING
  // ==========================================================================
  describe('6. Duplicate Task Deep Copying', () => {
    it('generates unique IDs for duplicated subtasks', () => {
      const nextState = taskReducer(state, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-1' },
      });

      const duplicate = nextState.tasks.find(t => t.title === 'Macro Meta Mensual (Copia)');
      expect(duplicate).toBeDefined();
      expect(duplicate?.id).not.toBe('task-1');
      expect(duplicate?.subtasks.length).toBe(2);
      expect(duplicate?.subtasks[0].id).not.toBe('st-1');
      expect(duplicate?.subtasks[1].id).not.toBe('st-2');
    });

    it('ADVERSARIAL: Deep copies the tags array to prevent reference sharing', () => {
      const nextState = taskReducer(state, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-1' },
      });

      const original = nextState.tasks.find(t => t.id === 'task-1');
      const duplicate = nextState.tasks.find(t => t.title === 'Macro Meta Mensual (Copia)');

      expect(original).toBeDefined();
      expect(duplicate).toBeDefined();
      // If tags array is reference-shared, modifying duplicate.tags mutates original.tags!
      expect(duplicate!.tags).not.toBe(original!.tags);
    });

    it('ADVERSARIAL: Duplicating a task in a completed column assigns valid completedAt', () => {
      // First move task-1 to 'done'
      const doneState = taskReducer(state, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'done', destinationIndex: 0 },
      });

      const dupState = taskReducer(doneState, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-1' },
      });

      const dupInDone = dupState.tasks.find(t => t.title === 'Macro Meta Mensual (Copia)');
      expect(dupInDone).toBeDefined();
      expect(dupInDone?.columnId).toBe('done');
      // Invariant: all tasks in done column must have non-null completedAt
      expect(dupInDone?.completedAt).toBeTruthy();
    });
  });

  // ==========================================================================
  // 7. IMMUTABILITY & PURITY
  // ==========================================================================
  describe('7. Immutability & Purity', () => {
    it('does not mutate deeply frozen state on any action', () => {
      const deeplyFrozenState = JSON.parse(JSON.stringify(state));
      Object.freeze(deeplyFrozenState);
      Object.freeze(deeplyFrozenState.tasks);
      Object.freeze(deeplyFrozenState.columns);
      deeplyFrozenState.tasks.forEach((t: Task) => {
        Object.freeze(t);
        Object.freeze(t.subtasks);
        Object.freeze(t.tags);
      });

      expect(() => {
        taskReducer(deeplyFrozenState, {
          type: 'MOVE_TASK',
          payload: { taskId: 'task-1', destinationColumnId: 'in-progress', destinationIndex: 1 },
        });
      }).not.toThrow();

      expect(() => {
        taskReducer(deeplyFrozenState, {
          type: 'ADD_TASK',
          payload: { title: 'New Task', columnId: 'todo' },
        });
      }).not.toThrow();

      expect(() => {
        taskReducer(deeplyFrozenState, {
          type: 'DELETE_TASK',
          payload: 'task-1',
        });
      }).not.toThrow();

      expect(() => {
        taskReducer(deeplyFrozenState, {
          type: 'DUPLICATE_TASK',
          payload: { id: 'task-1' },
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // 8. RESET_STATE DEFAULT BEHAVIOR
  // ==========================================================================
  describe('8. Reset State Behavior', () => {
    it('ADVERSARIAL: RESET_STATE without payload resets to initial seed state rather than no-op', () => {
      // Modify state first
      const modifiedState = taskReducer(state, {
        type: 'ADD_TASK',
        payload: { title: 'Temp Task', columnId: 'todo' },
      });
      expect(modifiedState.tasks.length).toBe(4);

      // Reset without payload
      const resetState = taskReducer(modifiedState, {
        type: 'RESET_STATE',
      });

      // If resetState does nothing when called without arguments, this fails
      expect(resetState.tasks.length).not.toBe(4);
    });
  });
});

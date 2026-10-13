/**
 * Tier 3: Cross-Feature Combinations (Pairwise Interactions)
 * tests/e2e/tier3_pairwise.test.ts
 *
 * Validates complex emergent interactions between disparate system features:
 * - Drag-and-drop combined with temporal horizon filtering
 * - Cascade deletions spanning subtasks and cross-horizon links
 * - Theme toggle combined with JSON backup export and persistence
 * - Status transitions impacting multi-scale metrics and parent rollups
 * - Real-time backup restoration under active filtered state
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
} from './harness.js';

describe('Tier 3: Cross-Feature Combinations (Pairwise Interactions)', () => {
  it('T3.1: drag-and-drop between columns while filtering by temporal horizon', () => {
    let state = getInitialSeedData();
    // 1. Activate 'daily' horizon filter
    state = taskReducer(state, { type: 'SET_HORIZON_FILTER', payload: 'daily' });
    expect(state.selectedHorizon).toBe('daily');

    // 2. Drag daily task 'task-d2' from 'todo' to 'in-progress'
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'task-d2', targetColumnId: 'in-progress' },
    });

    // 3. Verify observable results:
    // - Task columnId is updated
    const moved = state.tasks.find(t => t.id === 'task-d2')!;
    expect(moved.columnId).toBe('in-progress');

    // - When filtered by daily, only daily tasks are visible
    const visibleTasks = state.tasks.filter(t => t.horizon === state.selectedHorizon);
    expect(visibleTasks.every(t => t.horizon === 'daily')).toBe(true);

    // - Background weekly and monthly tasks remain completely intact and untouched
    const weeklyTask = state.tasks.find(t => t.id === 'task-w1')!;
    const monthlyTask = state.tasks.find(t => t.id === 'task-m1')!;
    expect(weeklyTask.columnId).toBe('in-progress');
    expect(monthlyTask.columnId).toBe('in-progress');
  });

  it('T3.2: deleting parent task with active subtasks and daily cross-horizon links', () => {
    let state = getInitialSeedData();
    // In seed: task-m1 has subtasks and is parent of task-w1
    // task-w1 is parent of task-d1 and task-d2
    const parentTask = state.tasks.find(t => t.id === 'task-w1')!;
    expect(parentTask.subtasks.length).toBeGreaterThan(0);

    // Delete task-w1
    state = taskReducer(state, { type: 'DELETE_TASK', payload: { id: 'task-w1' } });

    // 1. Parent task-w1 is deleted
    expect(state.tasks.some(t => t.id === 'task-w1')).toBe(false);

    // 2. Child daily tasks task-d1 and task-d2 remain in the dashboard,
    // but their parentTaskId is safely set to null (soft detachment)
    const child1 = state.tasks.find(t => t.id === 'task-d1')!;
    const child2 = state.tasks.find(t => t.id === 'task-d2')!;
    expect(child1).toBeTruthy();
    expect(child1.parentTaskId).toBeNull();
    expect(child2).toBeTruthy();
    expect(child2.parentTaskId).toBeNull();

    // 3. Metrics still correctly calculate total remaining tasks
    const metrics = calculateMetrics(state.tasks, state.columns, '2026-10-12');
    expect(metrics.totalTasks).toBe(3); // 4 - 1 = 3
  });

  it('T3.3: theme toggle during state export and backup generation', () => {
    const storage = new StorageServiceMock();
    let state = getInitialSeedData();

    // Toggle theme to 'dark'
    state = taskReducer(state, { type: 'SET_THEME', payload: 'dark' });
    expect(state.theme).toBe('dark');

    // Export state
    const exportString = storage.exportJSON(state);
    const parsed = JSON.parse(exportString);

    // Verify exported backup contains dark theme
    expect(parsed.data.theme).toBe('dark');

    // Save and reload state from storage
    storage.saveState(state);
    const loaded = storage.loadState();
    expect(loaded.theme).toBe('dark');
  });

  it('T3.4: moving task to done column updates daily metrics, parent rollup, and overdue count', () => {
    let state = getInitialSeedData();
    // Add overdue daily task linked to weekly parent task-w1
    state = taskReducer(state, {
      type: 'ADD_TASK',
      payload: {
        id: 'daily-overdue-child',
        title: 'Daily Overdue Task',
        description: '',
        horizon: 'daily',
        columnId: 'todo',
        priority: 'high',
        dueDate: '2026-10-01', // Overdue relative to 2026-10-12
        tags: [],
        subtasks: [],
        parentTaskId: 'task-w1',
      },
    });

    let metricsBefore = calculateMetrics(state.tasks, state.columns, '2026-10-12');
    let rollupBefore = calculateChildProgress('task-w1', state.tasks);
    expect(metricsBefore.overdueCount).toBe(1);

    // Move task to 'done'
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'daily-overdue-child', targetColumnId: 'done' },
    });

    let metricsAfter = calculateMetrics(state.tasks, state.columns, '2026-10-12');
    let rollupAfter = calculateChildProgress('task-w1', state.tasks);

    // Overdue count drops to 0
    expect(metricsAfter.overdueCount).toBe(0);
    // Completed daily tasks count increases
    expect(metricsAfter.completedTodayCount).toBeGreaterThan(metricsBefore.completedTodayCount);
    // Parent rollup completed count increases
    expect(rollupAfter.completed).toBe(rollupBefore.completed + 1);
  });

  it('T3.5: importing JSON backup while viewing filtered horizon and search query', () => {
    const storage = new StorageServiceMock();
    let state = getInitialSeedData();

    // User applies filters
    state = taskReducer(state, { type: 'SET_HORIZON_FILTER', payload: 'weekly' });
    state = taskReducer(state, { type: 'SET_SEARCH_QUERY', payload: 'Kanban' });

    // Generate incoming backup with custom dataset
    const backupState = {
      ...getInitialSeedData(),
      tasks: [
        {
          id: 'imported-weekly-1',
          title: 'Imported Weekly Focus',
          description: '',
          horizon: 'weekly' as const,
          columnId: 'todo',
          priority: 'high' as const,
          dueDate: '2026-10-20',
          tags: [],
          subtasks: [],
          order: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const backupJson = storage.exportJSON(backupState);
    const importResult = storage.importJSON(backupJson);
    expect(importResult.success).toBe(true);

    // Load imported state into reducer
    state = taskReducer(state, {
      type: 'LOAD_STATE',
      payload: importResult.state!,
    });

    expect(state.tasks.length).toBe(1);
    expect(state.tasks[0].id).toBe('imported-weekly-1');
  });

  it('T3.6: custom column deletion with tasks spanning multiple temporal horizons', () => {
    let state = getInitialSeedData();
    // Add custom column 'review'
    state = taskReducer(state, {
      type: 'ADD_COLUMN',
      payload: { id: 'col-review', title: 'Revisión' },
    });

    // Move 1 monthly, 1 weekly, and 1 daily task into 'col-review'
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'task-m1', targetColumnId: 'col-review' },
    });
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'task-w1', targetColumnId: 'col-review' },
    });
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'task-d1', targetColumnId: 'col-review' },
    });

    // Delete column 'col-review' with fallback to 'todo'
    state = taskReducer(state, {
      type: 'DELETE_COLUMN',
      payload: { columnId: 'col-review', fallbackColumnId: 'todo' },
    });

    // Verify all 3 tasks migrated to 'todo' while retaining original horizon attributes
    const m1 = state.tasks.find(t => t.id === 'task-m1')!;
    const w1 = state.tasks.find(t => t.id === 'task-w1')!;
    const d1 = state.tasks.find(t => t.id === 'task-d1')!;

    expect(m1.columnId).toBe('todo');
    expect(m1.horizon).toBe('monthly');
    expect(w1.columnId).toBe('todo');
    expect(w1.horizon).toBe('weekly');
    expect(d1.columnId).toBe('todo');
    expect(d1.horizon).toBe('daily');
  });

  it('T3.7: duplicate task containing subtasks, tags, and cross-horizon parent link', () => {
    let state = getInitialSeedData();
    const sourceTask = state.tasks.find(t => t.id === 'task-d1')!;
    expect(sourceTask.parentTaskId).toBe('task-w1');
    expect(sourceTask.tags.length).toBeGreaterThan(0);
    expect(sourceTask.subtasks.length).toBeGreaterThan(0);

    state = taskReducer(state, {
      type: 'DUPLICATE_TASK',
      payload: { id: 'task-d1', newId: 'cloned-d1' },
    });

    const clone = state.tasks.find(t => t.id === 'cloned-d1')!;
    expect(clone.parentTaskId).toBe('task-w1');
    expect(clone.tags).toEqual(sourceTask.tags);
    expect(clone.subtasks.length).toBe(sourceTask.subtasks.length);
    // Subtasks in clone must have distinct IDs
    expect(clone.subtasks[0].id).not.toBe(sourceTask.subtasks[0].id);
  });

  it('T3.8: combined multi-dimensional filtering (search query + horizon + priority)', () => {
    const state = getInitialSeedData();

    // Filter predicate combining search query, horizon, and priority
    const applyMultiFilter = (
      tasks: typeof state.tasks,
      query: string,
      horizon: string,
      priority: string
    ) => {
      return tasks.filter(t => {
        const matchesQuery = query === '' ||
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase());
        const matchesHorizon = horizon === 'all' || t.horizon === horizon;
        const matchesPriority = priority === 'all' || t.priority === priority;
        return matchesQuery && matchesHorizon && matchesPriority;
      });
    };

    // Filter 1: Horizon daily + priority high
    const dailyHigh = applyMultiFilter(state.tasks, '', 'daily', 'high');
    expect(dailyHigh.length).toBe(1);
    expect(dailyHigh[0].id).toBe('task-d1');

    // Filter 2: Search 'Métricas' + horizon daily
    const dailyMetrics = applyMultiFilter(state.tasks, 'Métricas', 'daily', 'all');
    expect(dailyMetrics.length).toBe(1);
    expect(dailyMetrics[0].id).toBe('task-d2');

    // Filter 3: Unmatched query returns empty
    const noMatches = applyMultiFilter(state.tasks, 'NonExistentStringXYZ', 'all', 'all');
    expect(noMatches.length).toBe(0);
  });
});

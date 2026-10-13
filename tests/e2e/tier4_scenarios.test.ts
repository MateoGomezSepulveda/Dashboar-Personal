/**
 * Tier 4: Real-World Application Scenarios
 * tests/e2e/tier4_scenarios.test.ts
 *
 * Simulates realistic multi-week workflows and holistic user journeys:
 * - Full Sprint Lifecycle (Goal -> Commitments -> Tasks -> Execution -> Completion)
 * - Weekly Review & Backlog Grooming (Pruning, Rescheduling, Reordering)
 * - Disaster Recovery & Multi-Device Migration (Backup -> Corruption -> Restore)
 * - Daily Deep-Work Focus Workflow (Quick capture, Markdown, Subtasks, KPI updates)
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

describe('Tier 4: Real-World Application Scenarios', () => {
  it('T4.1: Full Sprint Lifecycle Scenario (Monthly Goal -> Weekly Sprints -> Daily Execution)', () => {
    let state = getInitialSeedData();
    const storage = new StorageServiceMock();

    // ------------------------------------------------------------------------
    // STAGE 1: Monthly Kickoff & Goal Definition
    // ------------------------------------------------------------------------
    const monthlyGoalId = 'goal-q4-launch';
    state = taskReducer(state, {
      type: 'ADD_TASK',
      payload: {
        id: monthlyGoalId,
        title: 'Lanzamiento Oficial Plataforma Productividad Q4',
        description: '## Objetivo Estratégico\nEntregar versión final con persistencia local y soporte táctil.',
        horizon: 'monthly',
        columnId: 'in-progress',
        priority: 'high',
        dueDate: '2026-10-31',
        tags: ['tag-architecture'],
        subtasks: [],
        parentTaskId: null,
      },
    });

    // ------------------------------------------------------------------------
    // STAGE 2: Weekly Commitment Breakdown
    // ------------------------------------------------------------------------
    const sprintWeekId = 'sprint-week-42';
    state = taskReducer(state, {
      type: 'ADD_TASK',
      payload: {
        id: sprintWeekId,
        title: 'Sprint 42: Tablero Kanban & Gestor de Persistencia',
        description: 'Desarrollar el core del tablero y almacenamiento seguro.',
        horizon: 'weekly',
        columnId: 'in-progress',
        priority: 'high',
        dueDate: '2026-10-18',
        tags: ['tag-frontend', 'tag-architecture'],
        subtasks: [],
        parentTaskId: monthlyGoalId,
      },
    });

    // ------------------------------------------------------------------------
    // STAGE 3: Daily Task Generation with Checklist Subtasks
    // ------------------------------------------------------------------------
    const dailyTaskIds = ['s42-daily-1', 's42-daily-2', 's42-daily-3'];
    dailyTaskIds.forEach((id, idx) => {
      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id,
          title: `Tarea de Ejecución Diaria ${idx + 1}`,
          description: `Detalles de implementación del paso ${idx + 1}`,
          horizon: 'daily',
          columnId: 'todo',
          priority: 'high',
          dueDate: '2026-10-14',
          tags: ['tag-frontend'],
          subtasks: [
            { id: `st-${id}-a`, title: 'Implementación básica', completed: false },
            { id: `st-${id}-b`, title: 'Pruebas de validación', completed: false },
          ],
          parentTaskId: sprintWeekId,
        },
      });
    });

    // Check initial child rollup on the weekly sprint task (0% completed)
    let sprintRollup = calculateChildProgress(sprintWeekId, state.tasks);
    expect(sprintRollup.total).toBe(3);
    expect(sprintRollup.completed).toBe(0);
    expect(sprintRollup.percent).toBe(0);

    // ------------------------------------------------------------------------
    // STAGE 4: Daily Execution Over Consecutive Days
    // ------------------------------------------------------------------------
    // Day 1: User moves first task to in-progress and completes its subtasks
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 's42-daily-1', targetColumnId: 'in-progress' },
    });
    state = taskReducer(state, {
      type: 'TOGGLE_SUBTASK',
      payload: { taskId: 's42-daily-1', subtaskId: 'st-s42-daily-1-a' },
    });
    state = taskReducer(state, {
      type: 'TOGGLE_SUBTASK',
      payload: { taskId: 's42-daily-1', subtaskId: 'st-s42-daily-1-b' },
    });
    // Task 1 is completed
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 's42-daily-1', targetColumnId: 'done' },
    });

    // Rollup updates to 33%
    sprintRollup = calculateChildProgress(sprintWeekId, state.tasks);
    expect(sprintRollup.completed).toBe(1);
    expect(sprintRollup.percent).toBe(33);

    // Day 2 & 3: User finishes remaining two tasks
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 's42-daily-2', targetColumnId: 'done' },
    });
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 's42-daily-3', targetColumnId: 'done' },
    });

    // ------------------------------------------------------------------------
    // STAGE 5: Sprint Completion & Progress Consolidation
    // ------------------------------------------------------------------------
    sprintRollup = calculateChildProgress(sprintWeekId, state.tasks);
    expect(sprintRollup.completed).toBe(3);
    expect(sprintRollup.percent).toBe(100);

    // Sprint itself is marked done
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: sprintWeekId, targetColumnId: 'done' },
    });

    // Verify monthly goal rollup now reflects completed sprint
    const monthlyRollup = calculateChildProgress(monthlyGoalId, state.tasks);
    expect(monthlyRollup.total).toBe(1);
    expect(monthlyRollup.completed).toBe(1);
    expect(monthlyRollup.percent).toBe(100);

    // Persist finalized sprint state
    storage.saveState(state);
    const loaded = storage.loadState();
    expect(loaded.tasks.find(t => t.id === sprintWeekId)?.columnId).toBe('done');
  });

  it('T4.2: Weekly Review and Backlog Grooming Workflow', () => {
    let state = getInitialSeedData();

    // 1. User identifies overdue tasks during weekly review
    state = taskReducer(state, {
      type: 'ADD_TASK',
      payload: {
        id: 'lingering-task-1',
        title: 'Revisión de Dependencias Desactualizadas',
        description: 'Audit npm packages.',
        horizon: 'weekly',
        columnId: 'todo',
        priority: 'medium',
        dueDate: '2026-10-05', // Passed due date
        tags: ['tag-architecture'],
        subtasks: [],
      },
    });

    let metrics = calculateMetrics(state.tasks, state.columns, '2026-10-12');
    expect(metrics.overdueCount).toBe(1);

    // 2. User reschedules the overdue task to next week
    state = taskReducer(state, {
      type: 'UPDATE_TASK',
      payload: {
        id: 'lingering-task-1',
        updates: { dueDate: '2026-10-19' },
      },
    });

    metrics = calculateMetrics(state.tasks, state.columns, '2026-10-12');
    expect(metrics.overdueCount).toBe(0); // No longer overdue

    // 3. User grooms column: reorders priority tasks to top of 'in-progress'
    const inProgressTasks = state.tasks.filter(t => t.columnId === 'in-progress');
    const reorderedIds = inProgressTasks.map(t => t.id).reverse();

    state = taskReducer(state, {
      type: 'REORDER_COLUMN_TASKS',
      payload: { columnId: 'in-progress', taskIds: reorderedIds },
    });

    const updatedColTasks = state.tasks
      .filter(t => t.columnId === 'in-progress')
      .sort((a, b) => a.order - b.order);
    expect(updatedColTasks[0].id).toBe(reorderedIds[0]);

    // 4. User prunes obsolete task
    state = taskReducer(state, {
      type: 'DELETE_TASK',
      payload: { id: 'task-d2' },
    });
    expect(state.tasks.some(t => t.id === 'task-d2')).toBe(false);
  });

  it('T4.3: Disaster Recovery and Cross-Device Migration Scenario', () => {
    const primaryStorage = new StorageServiceMock();
    let state = getInitialSeedData();

    // 1. User builds custom setup with new column and tags
    state = taskReducer(state, {
      type: 'ADD_COLUMN',
      payload: { id: 'col-qa', title: 'Control de Calidad', wipLimit: 2 },
    });

    state = taskReducer(state, {
      type: 'ADD_TASK',
      payload: {
        id: 'migrated-task-1',
        title: 'Verificación de Integridad de Copias',
        description: 'Validar schema matching al 100%.',
        horizon: 'daily',
        columnId: 'col-qa',
        priority: 'high',
        dueDate: '2026-10-15',
        tags: ['tag-frontend'],
        subtasks: [
          { id: 'st-mig-1', title: 'Exportar JSON', completed: true },
          { id: 'st-mig-2', title: 'Importar JSON', completed: true },
        ],
      },
    });

    primaryStorage.saveState(state);

    // 2. User exports JSON backup
    const backupJson = primaryStorage.exportJSON(state);
    expect(backupJson.length).toBeGreaterThan(100);

    // 3. Disaster occurs on second device (empty clean environment)
    const secondaryStorage = new StorageServiceMock();
    expect(secondaryStorage.loadState().tasks.length).toBe(4); // Default seed

    // 4. User imports backup onto second device
    const importResult = secondaryStorage.importJSON(backupJson);
    expect(importResult.success).toBe(true);

    let restoredState = taskReducer(getInitialSeedData(), {
      type: 'LOAD_STATE',
      payload: importResult.state!,
    });

    // 5. Verify absolute fidelity
    expect(restoredState.columns.some(c => c.id === 'col-qa')).toBe(true);
    const restoredTask = restoredState.tasks.find(t => t.id === 'migrated-task-1')!;
    expect(restoredTask).toBeTruthy();
    expect(restoredTask.columnId).toBe('col-qa');
    expect(restoredTask.subtasks.every(s => s.completed)).toBe(true);
  });

  it('T4.4: Daily Deep-Work Focus Workflow (Dark Mode, Capture & Drilldown)', () => {
    let state = getInitialSeedData();

    // 1. User opens app in Dark Mode and navigates to Daily Horizon
    state = taskReducer(state, { type: 'SET_THEME', payload: 'dark' });
    state = taskReducer(state, { type: 'SET_HORIZON_FILTER', payload: 'daily' });
    expect(state.theme).toBe('dark');
    expect(state.selectedHorizon).toBe('daily');

    // 2. Quick capture 2 tasks for today's session
    const taskIds = ['deep-work-task-1', 'deep-work-task-2'];
    taskIds.forEach((id, i) => {
      state = taskReducer(state, {
        type: 'ADD_TASK',
        payload: {
          id,
          title: `Foco Crítico de Hoy #${i + 1}`,
          description: '## Notas de Sesión\n- Máxima concentración\n- Sin distracciones',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'high',
          dueDate: '2026-10-12',
          tags: ['tag-frontend'],
          subtasks: [
            { id: `st-dw-${i}-1`, title: 'Bloque Pomodoro 1', completed: false },
            { id: `st-dw-${i}-2`, title: 'Bloque Pomodoro 2', completed: false },
          ],
        },
      });
    });

    // 3. User works through task 1
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'deep-work-task-1', targetColumnId: 'in-progress' },
    });
    state = taskReducer(state, {
      type: 'TOGGLE_SUBTASK',
      payload: { taskId: 'deep-work-task-1', subtaskId: 'st-dw-0-1' },
    });
    state = taskReducer(state, {
      type: 'TOGGLE_SUBTASK',
      payload: { taskId: 'deep-work-task-1', subtaskId: 'st-dw-0-2' },
    });
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'deep-work-task-1', targetColumnId: 'done' },
    });

    // 4. User finishes task 2 as well
    state = taskReducer(state, {
      type: 'MOVE_TASK',
      payload: { taskId: 'deep-work-task-2', targetColumnId: 'done' },
    });

    // 5. Verify real-time productivity ribbons display progress
    const metrics = calculateMetrics(state.tasks, state.columns, '2026-10-12');
    expect(metrics.completedTodayCount).toBeGreaterThanOrEqual(3);
    expect(metrics.completedTodayPercent).toBeGreaterThanOrEqual(75);
  });
});

import { describe, it, expect } from 'vitest';
import { INITIAL_APP_STATE, INITIAL_COLUMNS, INITIAL_TASKS, INITIAL_TAGS } from '../constants/initialData';
import { Horizon } from '../types/domain';

describe('Domain Models & Seed Data Integrity', () => {
  it('contains the three default Kanban columns in contiguous order', () => {
    expect(INITIAL_COLUMNS).toHaveLength(3);
    const ids = INITIAL_COLUMNS.map((c) => c.id);
    expect(ids).toEqual(['todo', 'in-progress', 'done']);
    expect(INITIAL_COLUMNS.find((c) => c.id === 'done')?.isCompletedColumn).toBe(true);
  });

  it('contains seed tasks covering all three temporal horizons', () => {
    const horizons: Horizon[] = ['monthly', 'weekly', 'daily'];
    horizons.forEach((h) => {
      const tasksInHorizon = INITIAL_TASKS.filter((t) => t.horizon === h);
      expect(tasksInHorizon.length).toBeGreaterThan(0);
    });
  });

  it('contains tasks distributed across all default columns', () => {
    const todoTasks = INITIAL_TASKS.filter((t) => t.columnId === 'todo');
    const inProgressTasks = INITIAL_TASKS.filter((t) => t.columnId === 'in-progress');
    const doneTasks = INITIAL_TASKS.filter((t) => t.columnId === 'done');

    expect(todoTasks.length).toBeGreaterThan(0);
    expect(inProgressTasks.length).toBeGreaterThan(0);
    expect(doneTasks.length).toBeGreaterThan(0);
  });

  it('validates parent-child relationships and prevents circularity in seed data', () => {
    INITIAL_TASKS.forEach((task) => {
      if (task.parentTaskId) {
        const parent = INITIAL_TASKS.find((p) => p.id === task.parentTaskId);
        expect(parent).toBeDefined();
        // A daily task parent must be weekly or monthly
        if (task.horizon === 'daily') {
          expect(['weekly', 'monthly']).toContain(parent?.horizon);
        }
        // A weekly task parent must be monthly
        if (task.horizon === 'weekly') {
          expect(parent?.horizon).toBe('monthly');
        }
      }
    });
  });

  it('verifies that done tasks have completedAt timestamp set', () => {
    const doneTasks = INITIAL_TASKS.filter((t) => t.columnId === 'done');
    doneTasks.forEach((t) => {
      expect(t.completedAt).toBeTruthy();
    });
  });

  it('verifies subtask progress calculations on sample tasks', () => {
    const taskWithSubtasks = INITIAL_TASKS.find((t) => t.id === 'task-monthly-1');
    expect(taskWithSubtasks).toBeDefined();
    const total = taskWithSubtasks!.subtasks.length;
    const completed = taskWithSubtasks!.subtasks.filter((s) => s.completed).length;
    expect(total).toBe(3);
    expect(completed).toBe(2);
    expect(Math.round((completed / total) * 100)).toBe(67);
  });

  it('verifies initial app state contains all entities and schema version', () => {
    expect(INITIAL_APP_STATE.version).toBe(1);
    expect(INITIAL_APP_STATE.tasks).toEqual(INITIAL_TASKS);
    expect(INITIAL_APP_STATE.columns).toEqual(INITIAL_COLUMNS);
    expect(INITIAL_APP_STATE.tags).toEqual(INITIAL_TAGS);
    expect(INITIAL_APP_STATE.selectedHorizon).toBe('all');
    expect(INITIAL_APP_STATE.theme).toBe('dark');
  });
});

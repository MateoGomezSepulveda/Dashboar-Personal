/**
 * ============================================================================
 * SCHEMA MIGRATION SERVICE — PERSONAL DASHBOARD
 * ============================================================================
 * Handles schema version detection, automated sequential migrations,
 * and structural validation for persisted state and JSON imports.
 */

import { DashboardAppState, Horizon, KanbanColumn, Priority, Subtask, Tag, Task } from '../types/domain';
import { INITIAL_APP_STATE, INITIAL_COLUMNS, INITIAL_TAGS } from '../constants/initialData';

/** Current schema version definition */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Validates that an object contains the required arrays and structural
 * characteristics of a valid DashboardAppState.
 */
export function isValidAppState(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const candidate = obj as Record<string, unknown>;
  return (
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.columns) &&
    Array.isArray(candidate.tags)
  );
}

/**
 * Comprehensive schema validator returning descriptive error messages.
 */
export function validateAppState(obj: unknown): { valid: boolean; error?: string } {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, error: 'State must be an object' };
  }
  const candidate = obj as Record<string, unknown>;
  if (!Array.isArray(candidate.tasks)) {
    return { valid: false, error: 'Missing or invalid "tasks" array' };
  }
  if (!Array.isArray(candidate.columns)) {
    return { valid: false, error: 'Missing or invalid "columns" array' };
  }
  if (!Array.isArray(candidate.tags)) {
    return { valid: false, error: 'Missing or invalid "tags" array' };
  }
  return { valid: true };
}

/**
 * Backfills a raw task object with required fields and safe defaults.
 */
function backfillTaskDefaults(raw: any, index: number): Task {
  const task = raw && typeof raw === 'object' ? raw : {};
  const id = typeof task.id === 'string' && task.id ? task.id : `task-${Date.now()}-${index}`;
  const title = typeof task.title === 'string' && task.title.trim() ? task.title.trim() : 'Tarea sin título';
  const description = typeof task.description === 'string' ? task.description : '';
  const horizon: Horizon = ['monthly', 'weekly', 'daily'].includes(task.horizon) ? task.horizon : 'daily';
  const columnId = typeof task.columnId === 'string' && task.columnId ? task.columnId : 'todo';
  const priority: Priority = ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium';
  const dueDate = typeof task.dueDate === 'string' ? task.dueDate : null;
  const dueTime = typeof task.dueTime === 'string' ? task.dueTime : null;
  const tags = Array.isArray(task.tags)
    ? task.tags.filter((t: unknown) => typeof t === 'string')
    : [];

  const subtasks: Subtask[] = Array.isArray(task.subtasks)
    ? task.subtasks.map((st: any, sIdx: number) => ({
        id: typeof st?.id === 'string' && st.id ? st.id : `st-${index}-${sIdx}`,
        title: typeof st?.title === 'string' ? st.title : 'Subtarea',
        completed: Boolean(st?.completed),
        order: typeof st?.order === 'number' ? st.order : sIdx,
        createdAt: typeof st?.createdAt === 'string' ? st.createdAt : new Date().toISOString(),
      }))
    : [];

  const order = typeof task.order === 'number' ? task.order : index;
  const createdAt = typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString();
  const updatedAt = typeof task.updatedAt === 'string' ? task.updatedAt : new Date().toISOString();
  const completedAt = typeof task.completedAt === 'string' ? task.completedAt : null;
  const parentTaskId = typeof task.parentTaskId === 'string' ? task.parentTaskId : null;
  const googleCalendarEventId = typeof task.googleCalendarEventId === 'string' ? task.googleCalendarEventId : null;

  return {
    id,
    title,
    description,
    horizon,
    columnId,
    priority,
    dueDate,
    dueTime,
    tags,
    subtasks,
    parentTaskId,
    order,
    createdAt,
    updatedAt,
    completedAt,
    googleCalendarEventId,
  };
}

/**
 * Migration step: transforms an unversioned (v0) state to version 1.
 */
function migrateV0ToV1(raw: any): DashboardAppState {
  const state = raw && typeof raw === 'object' ? raw : {};

  // Backfill columns
  const columns: KanbanColumn[] = Array.isArray(state.columns) && state.columns.length > 0
    ? state.columns.map((col: any, idx: number) => ({
        id: typeof col?.id === 'string' && col.id ? col.id : `col-${idx}`,
        title: typeof col?.title === 'string' ? col.title : `Columna ${idx + 1}`,
        order: typeof col?.order === 'number' ? col.order : idx,
        colorAccent: typeof col?.colorAccent === 'string' ? col.colorAccent : '#64748B',
        wipLimit: typeof col?.wipLimit === 'number' ? col.wipLimit : null,
        isCompletedColumn: Boolean(col?.isCompletedColumn),
        isDefault: Boolean(col?.isDefault),
      }))
    : [...INITIAL_COLUMNS];

  // Backfill tags
  const tags: Tag[] = Array.isArray(state.tags)
    ? state.tags.map((tg: any, idx: number) => ({
        id: typeof tg?.id === 'string' && tg.id ? tg.id : `tag-${idx}`,
        name: typeof tg?.name === 'string' ? tg.name : `Etiqueta ${idx + 1}`,
        color: typeof tg?.color === 'string' ? tg.color : '#2563EB',
      }))
    : [...INITIAL_TAGS];

  // Backfill tasks
  const tasks: Task[] = Array.isArray(state.tasks)
    ? state.tasks.map((task: any, idx: number) => backfillTaskDefaults(task, idx))
    : [];

  const selectedHorizon = ['all', 'monthly', 'weekly', 'daily'].includes(state.selectedHorizon)
    ? state.selectedHorizon
    : 'all';

  const searchQuery = typeof state.searchQuery === 'string' ? state.searchQuery : '';
  const theme = state.theme === 'light' || state.theme === 'dark' ? state.theme : 'dark';
  const lastUpdated = typeof state.lastUpdated === 'string' ? state.lastUpdated : new Date().toISOString();

  const streakMetadata = state.streakMetadata && typeof state.streakMetadata === 'object'
    ? {
        currentStreak: typeof state.streakMetadata.currentStreak === 'number' ? state.streakMetadata.currentStreak : 0,
        longestStreak: typeof state.streakMetadata.longestStreak === 'number' ? state.streakMetadata.longestStreak : 0,
        lastActiveDate: typeof state.streakMetadata.lastActiveDate === 'string' ? state.streakMetadata.lastActiveDate : null,
      }
    : {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
      };

  return {
    version: 1,
    tasks,
    columns,
    tags,
    selectedHorizon,
    searchQuery,
    theme,
    lastUpdated,
    streakMetadata,
  };
}

interface MigrationStep {
  fromVersion: number;
  toVersion: number;
  migrate: (state: any) => any;
}

/**
 * Sequential migration pipeline.
 * Additional migrations (e.g. v1 -> v2) can be registered here in future milestones.
 */
const MIGRATION_PIPELINE: MigrationStep[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    migrate: migrateV0ToV1,
  },
];

/**
 * Executes the migration pipeline on raw state to bring it up to CURRENT_SCHEMA_VERSION.
 */
export function migrateState(rawState: unknown): DashboardAppState {
  if (!rawState || typeof rawState !== 'object') {
    return { ...INITIAL_APP_STATE };
  }

  let state: any = { ...(rawState as Record<string, unknown>) };

  // Detect current version (supporting both .version and .schemaVersion)
  let currentVersion = typeof state.version === 'number'
    ? state.version
    : typeof state.schemaVersion === 'number'
    ? state.schemaVersion
    : 0;

  for (const step of MIGRATION_PIPELINE) {
    if (currentVersion < step.toVersion) {
      state = step.migrate(state);
      currentVersion = step.toVersion;
    }
  }

  // Ensure version reflects CURRENT_SCHEMA_VERSION and required fields are defined
  state.version = CURRENT_SCHEMA_VERSION;

  return state as DashboardAppState;
}

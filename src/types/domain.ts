/**
 * ============================================================================
 * DOMAIN TYPES & INTERFACES — PERSONAL DASHBOARD
 * ============================================================================
 * Defines the core entities, temporal horizons, Kanban columns, tags, metrics,
 * and state structures for the Personal Dashboard application.
 */

// ----------------------------------------------------------------------------
// 1. Temporal Horizons & Priorities
// ----------------------------------------------------------------------------

/**
 * Three temporal planning horizons representing planning granularity:
 * - 'monthly': High-level macro milestones, strategic goals (30-day scope).
 * - 'weekly': Sprint deliverables, operational commitments (7-day scope).
 * - 'daily': Tactical focus items for execution today ("Hoy") (24-hour scope).
 */
export type Horizon = 'monthly' | 'weekly' | 'daily';
export type HorizonType = Horizon; // Convenience alias

/**
 * Task priority levels with semantic visual hierarchy.
 */
export type Priority = 'low' | 'medium' | 'high';
export type TaskPriority = Priority; // Convenience alias

// ----------------------------------------------------------------------------
// 2. Subtasks & Checklist Entities
// ----------------------------------------------------------------------------

export interface Subtask {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Title or description of the checklist item (1-200 characters) */
  title: string;
  /** Completion status */
  completed: boolean;
  /** Contiguous 0-indexed display order */
  order?: number;
  /** ISO 8601 creation timestamp */
  createdAt?: string;
}

// ----------------------------------------------------------------------------
// 3. Category Tags System
// ----------------------------------------------------------------------------

export interface Tag {
  /** Unique slug or identifier (e.g. 'tag-frontend') */
  id: string;
  /** Display label (e.g. 'Frontend', 'Arquitectura') */
  name: string;
  /** Hex color or Tailwind color token (e.g. '#2563EB') */
  color: string;
}
export type TaskTag = Tag; // Convenience alias

// ----------------------------------------------------------------------------
// 4. Task Entity Model
// ----------------------------------------------------------------------------

export interface Task {
  /** Unique task identifier (UUID v4) */
  id: string;
  /** Mandatory task title (1-250 characters, trimmed) */
  title: string;
  /** Rich-text description supporting GitHub Flavored Markdown (GFM) */
  description: string;
  /** Temporal horizon */
  horizon: Horizon;
  /** Current Kanban column ID (references KanbanColumn.id) */
  columnId: string;
  /** Urgency / priority level */
  priority: Priority;
  /** Due date formatted as 'YYYY-MM-DD' or null if unscheduled */
  dueDate: string | null;
  /** Optional time component 'HH:mm' or null */
  dueTime?: string | null;
  /** Array of assigned Tag IDs */
  tags: string[];
  /** Ordered list of subtask checklist items */
  subtasks: Subtask[];
  /** ID of parent task in higher horizon, establishing cross-horizon links */
  parentTaskId?: string | null;
  /** Contiguous 0-indexed position within its Kanban column */
  order: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
  /** ISO 8601 completion timestamp when moved to a completed column, or null */
  completedAt?: string | null;
}

// ----------------------------------------------------------------------------
// 5. Kanban Column Model
// ----------------------------------------------------------------------------

export interface KanbanColumn {
  /** Unique column identifier (e.g. 'todo', 'in-progress', 'done') */
  id: string;
  /** Display title (e.g. 'Por hacer', 'En progreso', 'Completado') */
  title: string;
  /** Contiguous 0-indexed horizontal column order */
  order: number;
  /** Hex color accent for column indicator and drag highlights */
  colorAccent?: string;
  /** Maximum recommended tasks (WIP limit), null = unlimited */
  wipLimit?: number | null;
  /** Flag identifying terminal 'Done' status for velocity & completion rates */
  isCompletedColumn?: boolean;
  /** Built-in default columns cannot be deleted by the user */
  isDefault?: boolean;
}

/** Convenience alias matching the prompt specification */
export type Column = KanbanColumn;

// ----------------------------------------------------------------------------
// 6. User Preferences & Global State
// ----------------------------------------------------------------------------

export interface UserPreferences {
  theme: 'light' | 'dark';
  activeHorizonFilter?: Horizon | 'all';
  soundEnabled?: boolean;
  collapseCompletedColumns?: boolean;
}

export interface DashboardStreakMetadata {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // 'YYYY-MM-DD'
}

export interface DashboardAppState {
  /** Schema version for migration validation (default: 1) */
  version: number;
  /** All user tasks */
  tasks: Task[];
  /** Defined Kanban columns */
  columns: KanbanColumn[];
  /** Defined tags */
  tags: Tag[];
  /** Active temporal filter in navigation bar */
  selectedHorizon: Horizon | 'all';
  /** Global search filter query */
  searchQuery: string;
  /** Current active theme */
  theme: 'light' | 'dark';
  /** Last modification timestamp */
  lastUpdated?: string;
  /** Optional streak and productivity metadata */
  streakMetadata?: DashboardStreakMetadata;
}

// ----------------------------------------------------------------------------
// 7. Productivity Metrics Types
// ----------------------------------------------------------------------------

export interface ProductivityMetrics {
  totalTasks: number;
  completedTodayCount: number;
  completedTodayPercent: number;
  completedWeekCount: number;
  completedWeekPercent: number;
  overdueCount: number;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  horizonDistribution: {
    monthly: number;
    weekly: number;
    daily: number;
  };
}

// ----------------------------------------------------------------------------
// 8. State Reducer Action & Payload Types
// ----------------------------------------------------------------------------

export interface MoveTaskPayload {
  taskId: string;
  sourceColumnId?: string;
  destinationColumnId?: string;
  targetColumnId?: string;
  sourceIndex?: number;
  destinationIndex?: number;
  newOrder?: number;
}

export type TaskAction =
  | { type: 'ADD_TASK'; payload: Partial<Task> & { title: string; columnId: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Omit<Task, 'id' | 'createdAt'>> } }
  | { type: 'DELETE_TASK'; payload: { id: string } | string }
  | { type: 'DUPLICATE_TASK'; payload: { id: string; newId?: string } }
  | { type: 'MOVE_TASK'; payload: MoveTaskPayload }
  | { type: 'REORDER_COLUMN_TASKS'; payload: { columnId: string; taskIds: string[] } }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { taskId: string; title: string; id?: string } }
  | { type: 'DELETE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'SET_HORIZON_FILTER'; payload: { horizon: Horizon | 'all' } | (Horizon | 'all') }
  | { type: 'SET_SEARCH'; payload: { query: string } | string }
  | { type: 'SET_SEARCH_QUERY'; payload: { query: string } | string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'ADD_COLUMN'; payload: KanbanColumn | { id: string; title: string; wipLimit?: number | null } }
  | { type: 'UPDATE_COLUMN'; payload: { id: string; updates: Partial<KanbanColumn> } }
  | { type: 'DELETE_COLUMN'; payload: { id?: string; columnId?: string; targetColumnId?: string; fallbackColumnId?: string } }
  | { type: 'REORDER_COLUMNS'; payload: { startIndex: number; endIndex: number } }
  | { type: 'LOAD_STATE'; payload: { state: DashboardAppState } | DashboardAppState }
  | { type: 'RESET_STATE'; payload?: { seedState?: DashboardAppState } | DashboardAppState }
  | { type: 'RESET_TO_SEED'; payload?: { seedState?: DashboardAppState } };

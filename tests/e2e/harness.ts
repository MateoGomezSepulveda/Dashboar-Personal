/**
 * Opaque-Box Test Harness & Domain Contract Oracle
 * tests/e2e/harness.ts
 *
 * Implements authoritative interface contracts and domain behavior
 * specified in ORIGINAL_REQUEST.md and PROJECT.md.
 */

// ============================================================================
// 1. DOMAIN TYPE DEFINITIONS (PROJECT.md § Interface Contracts)
// ============================================================================

export type Horizon = 'monthly' | 'weekly' | 'daily';
export type Priority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  horizon: Horizon;
  columnId: string;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  subtasks: Subtask[];
  parentTaskId?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  wipLimit?: number | null;
  isCompletedColumn?: boolean;
}

export interface DashboardAppState {
  version: number;
  tasks: Task[];
  columns: KanbanColumn[];
  tags: Tag[];
  selectedHorizon: Horizon | 'all';
  searchQuery: string;
  theme: 'light' | 'dark';
}

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

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'personal_dashboard_state_v1';

// ============================================================================
// 2. SEED DATA GENERATOR
// ============================================================================

export function getInitialSeedData(): DashboardAppState {
  const columns: KanbanColumn[] = [
    { id: 'todo', title: 'Por hacer', order: 0, wipLimit: null, isCompletedColumn: false },
    { id: 'in-progress', title: 'En progreso', order: 1, wipLimit: 5, isCompletedColumn: false },
    { id: 'done', title: 'Completado', order: 2, wipLimit: null, isCompletedColumn: true },
  ];

  const tags: Tag[] = [
    { id: 'tag-frontend', name: 'Frontend', color: '#2563EB' },
    { id: 'tag-architecture', name: 'Arquitectura', color: '#7C3AED' },
    { id: 'tag-learning', name: 'Aprendizaje', color: '#D97706' },
  ];

  const tasks: Task[] = [
    {
      id: 'task-m1',
      title: 'Lanzar MVP del Dashboard Personal',
      description: '## Macro Objetivo\nDesplegar la primera versión funcional con los tres horizontes y Kanban.',
      horizon: 'monthly',
      columnId: 'in-progress',
      priority: 'high',
      dueDate: '2026-10-31',
      tags: ['tag-frontend', 'tag-architecture'],
      subtasks: [
        { id: 'st-m1', title: 'Definir contratos de interfaces', completed: true },
        { id: 'st-m2', title: 'Crear suite de pruebas E2E', completed: true },
      ],
      parentTaskId: null,
      order: 0,
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-12T10:00:00.000Z',
      completedAt: null,
    },
    {
      id: 'task-w1',
      title: 'Construir Tablero Kanban con DnD Fluido',
      description: 'Implementar columnas interactivas y reordenamiento de tarjetas a 60 FPS.',
      horizon: 'weekly',
      columnId: 'in-progress',
      priority: 'high',
      dueDate: '2026-10-18',
      tags: ['tag-frontend'],
      subtasks: [
        { id: 'st-w1', title: 'Configurar columnas por defecto', completed: true },
        { id: 'st-w2', title: 'Probar animaciones FLIP', completed: false },
      ],
      parentTaskId: 'task-m1',
      order: 0,
      createdAt: '2026-10-12T08:00:00.000Z',
      updatedAt: '2026-10-12T12:00:00.000Z',
      completedAt: null,
    },
    {
      id: 'task-d1',
      title: 'Crear Modal de Creación y Edición de Tareas',
      description: 'Campos accesibles para título, markdown, selector de horizonte y subtareas.',
      horizon: 'daily',
      columnId: 'done',
      priority: 'high',
      dueDate: '2026-10-12',
      tags: ['tag-frontend'],
      subtasks: [
        { id: 'st-d1', title: 'Validar títulos no vacíos', completed: true },
        { id: 'st-d2', title: 'Integrar preview de Markdown', completed: true },
      ],
      parentTaskId: 'task-w1',
      order: 0,
      createdAt: '2026-10-12T09:00:00.000Z',
      updatedAt: '2026-10-12T15:00:00.000Z',
      completedAt: '2026-10-12T15:00:00.000Z',
    },
    {
      id: 'task-d2',
      title: 'Escribir Pruebas del Motor de Métricas',
      description: 'Verificar cálculo de porcentajes, tareas vencidas y distribuciones.',
      horizon: 'daily',
      columnId: 'todo',
      priority: 'medium',
      dueDate: '2026-10-13',
      tags: ['tag-architecture'],
      subtasks: [],
      parentTaskId: 'task-w1',
      order: 1,
      createdAt: '2026-10-12T10:00:00.000Z',
      updatedAt: '2026-10-12T10:00:00.000Z',
      completedAt: null,
    },
  ];

  return {
    version: CURRENT_SCHEMA_VERSION,
    tasks,
    columns,
    tags,
    selectedHorizon: 'all',
    searchQuery: '',
    theme: 'light',
  };
}

// ============================================================================
// 3. PURE DOMAIN ACTIONS & REDUCER
// ============================================================================

export type TaskAction =
  | { type: 'ADD_TASK'; payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> & { id?: string; order?: number } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Omit<Task, 'id' | 'createdAt'>> } }
  | { type: 'DELETE_TASK'; payload: { id: string } }
  | { type: 'DUPLICATE_TASK'; payload: { id: string; newId?: string } }
  | { type: 'MOVE_TASK'; payload: { taskId: string; targetColumnId: string; newOrder?: number } }
  | { type: 'REORDER_COLUMN_TASKS'; payload: { columnId: string; taskIds: string[] } }
  | { type: 'ADD_COLUMN'; payload: { id: string; title: string; wipLimit?: number | null } }
  | { type: 'DELETE_COLUMN'; payload: { columnId: string; fallbackColumnId: string } }
  | { type: 'SET_HORIZON_FILTER'; payload: Horizon | 'all' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'LOAD_STATE'; payload: DashboardAppState }
  | { type: 'RESET_TO_SEED' };

export function taskReducer(state: DashboardAppState, action: TaskAction): DashboardAppState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'ADD_TASK': {
      const { payload } = action;
      if (!payload.title || payload.title.trim().length === 0) {
        throw new Error('Task title cannot be empty');
      }
      if (payload.title.length > 250) {
        throw new Error('Task title exceeds maximum length of 250 characters');
      }

      // Hierarchy validation
      if (payload.horizon === 'monthly' && payload.parentTaskId) {
        throw new Error('Monthly tasks cannot have a parent task');
      }
      if (payload.parentTaskId) {
        const parent = state.tasks.find(t => t.id === payload.parentTaskId);
        if (parent) {
          if (payload.horizon === 'weekly' && parent.horizon !== 'monthly') {
            throw new Error('Weekly tasks can only link to monthly parent tasks');
          }
          if (payload.horizon === 'daily' && parent.horizon !== 'weekly' && parent.horizon !== 'monthly') {
            throw new Error('Daily tasks can only link to weekly or monthly parent tasks');
          }
        }
      }

      const columnTasks = state.tasks.filter(t => t.columnId === payload.columnId);
      const order = typeof payload.order === 'number' ? payload.order : columnTasks.length;
      const targetColumn = state.columns.find(c => c.id === payload.columnId);
      const isCompleted = targetColumn?.isCompletedColumn ?? false;

      const newTask: Task = {
        id: payload.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: payload.title.trim(),
        description: payload.description || '',
        horizon: payload.horizon,
        columnId: payload.columnId,
        priority: payload.priority,
        dueDate: payload.dueDate || null,
        tags: payload.tags || [],
        subtasks: payload.subtasks || [],
        parentTaskId: payload.parentTaskId || null,
        order,
        createdAt: now,
        updatedAt: now,
        completedAt: isCompleted ? now : null,
      };

      return {
        ...state,
        tasks: [...state.tasks, newTask],
      };
    }

    case 'UPDATE_TASK': {
      const { id, updates } = action.payload;
      const taskIndex = state.tasks.findIndex(t => t.id === id);
      if (taskIndex === -1) return state;

      const current = state.tasks[taskIndex];

      // Circular link guard
      if (updates.parentTaskId && updates.parentTaskId === id) {
        throw new Error('A task cannot be its own parent');
      }

      if (updates.title !== undefined) {
        if (!updates.title || updates.title.trim().length === 0) {
          throw new Error('Task title cannot be empty');
        }
        if (updates.title.length > 250) {
          throw new Error('Task title exceeds maximum length of 250 characters');
        }
      }

      const updatedTask: Task = {
        ...current,
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : current.title,
        updatedAt: now,
      };

      const newTasks = [...state.tasks];
      newTasks[taskIndex] = updatedTask;

      return {
        ...state,
        tasks: newTasks,
      };
    }

    case 'DELETE_TASK': {
      const { id } = action.payload;
      // Orphan safety: child tasks of this deleted task have their parentTaskId set to null
      const updatedTasks = state.tasks
        .filter(t => t.id !== id)
        .map(t => (t.parentTaskId === id ? { ...t, parentTaskId: null, updatedAt: now } : t));

      return {
        ...state,
        tasks: updatedTasks,
      };
    }

    case 'DUPLICATE_TASK': {
      const source = state.tasks.find(t => t.id === action.payload.id);
      if (!source) return state;

      const columnTasks = state.tasks.filter(t => t.columnId === source.columnId);
      const clonedTask: Task = {
        ...source,
        id: action.payload.newId || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: `${source.title} (Copia)`,
        order: columnTasks.length,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        subtasks: source.subtasks.map((st, i) => ({
          ...st,
          id: `subtask-${Date.now()}-${i}`,
          completed: false,
        })),
      };

      return {
        ...state,
        tasks: [...state.tasks, clonedTask],
      };
    }

    case 'MOVE_TASK': {
      const { taskId, targetColumnId, newOrder } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;

      const targetCol = state.columns.find(c => c.id === targetColumnId);
      if (!targetCol) return state;

      const isCompleted = targetCol.isCompletedColumn ?? false;
      const oldColumnId = task.columnId;

      // Extract remaining tasks in old column and re-index contiguous orders
      const oldColTasks = state.tasks
        .filter(t => t.columnId === oldColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order)
        .map((t, idx) => ({ ...t, order: idx }));

      // Tasks in target column
      const targetColTasks = state.tasks
        .filter(t => t.columnId === targetColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      const insertIndex = typeof newOrder === 'number'
        ? Math.max(0, Math.min(newOrder, targetColTasks.length))
        : targetColTasks.length;

      const movedTask: Task = {
        ...task,
        columnId: targetColumnId,
        order: insertIndex,
        updatedAt: now,
        completedAt: isCompleted ? (task.completedAt || now) : null,
      };

      targetColTasks.splice(insertIndex, 0, movedTask);
      const reindexedTarget = targetColTasks.map((t, idx) => ({ ...t, order: idx }));

      // Combine unaffected tasks
      const unaffectedTasks = state.tasks.filter(
        t => t.columnId !== oldColumnId && t.columnId !== targetColumnId
      );

      const allUpdatedTasks = [
        ...unaffectedTasks,
        ...(oldColumnId === targetColumnId ? [] : oldColTasks),
        ...reindexedTarget,
      ];

      return {
        ...state,
        tasks: allUpdatedTasks,
      };
    }

    case 'REORDER_COLUMN_TASKS': {
      const { columnId, taskIds } = action.payload;
      const orderMap = new Map<string, number>();
      taskIds.forEach((id, idx) => orderMap.set(id, idx));

      const updatedTasks = state.tasks.map(t => {
        if (t.columnId === columnId && orderMap.has(t.id)) {
          return { ...t, order: orderMap.get(t.id)!, updatedAt: now };
        }
        return t;
      });

      return {
        ...state,
        tasks: updatedTasks,
      };
    }

    case 'ADD_COLUMN': {
      const { id, title, wipLimit } = action.payload;
      if (!title || title.trim().length === 0) {
        throw new Error('Column title cannot be empty');
      }
      if (state.columns.some(c => c.id === id)) {
        throw new Error(`Column with ID "${id}" already exists`);
      }

      const newColumn: KanbanColumn = {
        id,
        title: title.trim(),
        order: state.columns.length,
        wipLimit: wipLimit ?? null,
        isCompletedColumn: false,
      };

      return {
        ...state,
        columns: [...state.columns, newColumn],
      };
    }

    case 'DELETE_COLUMN': {
      const { columnId, fallbackColumnId } = action.payload;
      const defaultColIds = ['todo', 'in-progress', 'done'];
      if (defaultColIds.includes(columnId)) {
        throw new Error('Default columns cannot be deleted');
      }
      if (columnId === fallbackColumnId) {
        throw new Error('Fallback column must be different from deleted column');
      }

      const remainingColumns = state.columns
        .filter(c => c.id !== columnId)
        .map((c, idx) => ({ ...c, order: idx }));

      const migratedTasks = state.tasks.map(t => {
        if (t.columnId === columnId) {
          return { ...t, columnId: fallbackColumnId, updatedAt: now };
        }
        return t;
      });

      return {
        ...state,
        columns: remainingColumns,
        tasks: migratedTasks,
      };
    }

    case 'SET_HORIZON_FILTER': {
      return {
        ...state,
        selectedHorizon: action.payload,
      };
    }

    case 'SET_SEARCH_QUERY': {
      return {
        ...state,
        searchQuery: action.payload,
      };
    }

    case 'SET_THEME': {
      return {
        ...state,
        theme: action.payload,
      };
    }

    case 'TOGGLE_SUBTASK': {
      const { taskId, subtaskId } = action.payload;
      const updatedTasks = state.tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: t.subtasks.map(st =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st
            ),
            updatedAt: now,
          };
        }
        return t;
      });

      return {
        ...state,
        tasks: updatedTasks,
      };
    }

    case 'LOAD_STATE': {
      return {
        ...action.payload,
      };
    }

    case 'RESET_TO_SEED': {
      return getInitialSeedData();
    }

    default:
      return state;
  }
}

// ============================================================================
// 4. METRICS & HIERARCHY CALCULATOR
// ============================================================================

export function calculateMetrics(
  tasks: Task[],
  columns: KanbanColumn[],
  referenceDateString = '2026-10-12'
): ProductivityMetrics {
  const completedColumnIds = new Set(
    columns.filter(c => c.isCompletedColumn).map(c => c.id)
  );

  const totalTasks = tasks.length;
  const refDate = new Date(referenceDateString);

  // Daily
  const dailyTasks = tasks.filter(t => t.horizon === 'daily');
  const completedDaily = dailyTasks.filter(t => completedColumnIds.has(t.columnId));
  const dailyPercent = dailyTasks.length === 0 ? 0 : Math.round((completedDaily.length / dailyTasks.length) * 100);

  // Weekly
  const weeklyTasks = tasks.filter(t => t.horizon === 'weekly');
  const completedWeekly = weeklyTasks.filter(t => completedColumnIds.has(t.columnId));
  const weeklyPercent = weeklyTasks.length === 0 ? 0 : Math.round((completedWeekly.length / weeklyTasks.length) * 100);

  // Overdue count (non-completed tasks where dueDate < referenceDate)
  let overdueCount = 0;
  tasks.forEach(t => {
    if (!completedColumnIds.has(t.columnId) && t.dueDate) {
      const taskDate = new Date(t.dueDate);
      if (taskDate < refDate) {
        overdueCount++;
      }
    }
  });

  // Priority distribution
  const priorityDistribution = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  // Horizon distribution
  const horizonDistribution = {
    monthly: tasks.filter(t => t.horizon === 'monthly').length,
    weekly: weeklyTasks.length,
    daily: dailyTasks.length,
  };

  return {
    totalTasks,
    completedTodayCount: completedDaily.length,
    completedTodayPercent: dailyPercent,
    completedWeekCount: completedWeekly.length,
    completedWeekPercent: weeklyPercent,
    overdueCount,
    priorityDistribution,
    horizonDistribution,
  };
}

export function calculateChildProgress(parentId: string, tasks: Task[]): { total: number; completed: number; percent: number } {
  const children = tasks.filter(t => t.parentTaskId === parentId);
  if (children.length === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }
  const completed = children.filter(c => c.completedAt !== null || c.columnId === 'done').length;
  const percent = Math.round((completed / children.length) * 100);
  return {
    total: children.length,
    completed,
    percent,
  };
}

// ============================================================================
// 5. STORAGE SERVICE SIMULATION & SCHEMA VALIDATOR
// ============================================================================

export class StorageServiceMock {
  private store: Map<string, string> = new Map();
  public simulateQuotaError = false;

  public getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  public setItem(key: string, value: string): void {
    if (this.simulateQuotaError) {
      const error = new Error('The quota has been exceeded.') as any;
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public saveState(state: DashboardAppState): boolean {
    try {
      this.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  public loadState(): DashboardAppState {
    const raw = this.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedData();
      this.saveState(seed);
      return seed;
    }

    try {
      const parsed = JSON.parse(raw);
      if (this.validateSchema(parsed).valid) {
        return parsed as DashboardAppState;
      }
      // Schema corruption fallback
      this.setItem(`${STORAGE_KEY}_corrupt_backup`, raw);
      const seed = getInitialSeedData();
      this.saveState(seed);
      return seed;
    } catch {
      // JSON syntax error fallback
      this.setItem(`${STORAGE_KEY}_corrupt_backup`, raw);
      const seed = getInitialSeedData();
      this.saveState(seed);
      return seed;
    }
  }

  public exportJSON(state: DashboardAppState): string {
    const payload = {
      app: 'PersonalDashboard',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: state,
    };
    return JSON.stringify(payload, null, 2);
  }

  public importJSON(jsonString: string): { success: boolean; state?: DashboardAppState; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'JSON payload must be an object' };
      }

      // Handle direct state or wrapped payload
      const candidate: DashboardAppState = parsed.data || parsed;

      const validation = this.validateSchema(candidate);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      return { success: true, state: candidate };
    } catch (e: any) {
      return { success: false, error: `Invalid JSON syntax: ${e.message}` };
    }
  }

  public validateSchema(candidate: any): { valid: boolean; error?: string } {
    if (!candidate || typeof candidate !== 'object') {
      return { valid: false, error: 'State must be an object' };
    }
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
}

// ============================================================================
// 6. UNIVERSAL TEST EXECUTION HARNESS
// ============================================================================

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface TestSuiteResult {
  name: string;
  tier: number;
  results: TestCaseResult[];
}

export class SuiteRegistry {
  private static instance: SuiteRegistry;
  public suites: { name: string; tier: number; fn: () => void }[] = [];
  public currentSuiteName = '';
  public currentSuiteTier = 1;
  public currentTests: { name: string; fn: () => void | Promise<void> }[] = [];
  public suiteResults: TestSuiteResult[] = [];

  public static get(): SuiteRegistry {
    if (!SuiteRegistry.instance) {
      SuiteRegistry.instance = new SuiteRegistry();
    }
    return SuiteRegistry.instance;
  }
}

// Expect assertion helpers
export function expect<T>(actual: T) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      const act = JSON.stringify(actual);
      const exp = JSON.stringify(expected);
      if (act !== exp) {
        throw new Error(`Expected ${act} to equal ${exp}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${actual} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${actual} to be falsy`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected ${actual} to be null`);
      }
    },
    toContain(expected: any) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected string to contain "${expected}"`);
        }
      } else {
        throw new Error(`toContain unsupported for type ${typeof actual}`);
      }
    },
    toThrow(expectedMessageFragment?: string) {
      if (typeof actual !== 'function') {
        throw new Error('toThrow requires a function');
      }
      let threw = false;
      let caughtError: any = null;
      try {
        (actual as any)();
      } catch (err) {
        threw = true;
        caughtError = err;
      }
      if (!threw) {
        throw new Error('Expected function to throw, but it did not throw');
      }
      if (expectedMessageFragment && caughtError) {
        const msg = caughtError.message || String(caughtError);
        if (!msg.includes(expectedMessageFragment)) {
          throw new Error(`Expected error message "${msg}" to contain "${expectedMessageFragment}"`);
        }
      }
    },
  };
}

export function describe(name: string, fn: () => void, tier?: number): void {
  // If running in Vitest/Jest environment, delegate to native describe
  if (typeof (globalThis as any).describe === 'function') {
    (globalThis as any).describe(name, fn);
    return;
  }
  let resolvedTier = tier;
  if (!resolvedTier) {
    if (name.includes('Tier 1') || name.startsWith('T1')) resolvedTier = 1;
    else if (name.includes('Tier 2') || name.startsWith('T2')) resolvedTier = 2;
    else if (name.includes('Tier 3') || name.startsWith('T3')) resolvedTier = 3;
    else if (name.includes('Tier 4') || name.startsWith('T4')) resolvedTier = 4;
    else if (name.includes('Tier 5') || name.startsWith('T5')) resolvedTier = 5;
    else resolvedTier = SuiteRegistry.get().currentSuiteTier || 1;
  }
  SuiteRegistry.get().currentSuiteTier = resolvedTier;
  SuiteRegistry.get().suites.push({ name, tier: resolvedTier, fn });
}

export function it(name: string, fn: () => void | Promise<void>): void {
  // If running in Vitest/Jest environment, delegate to native it/test
  if (typeof (globalThis as any).it === 'function') {
    (globalThis as any).it(name, fn);
    return;
  }
  SuiteRegistry.get().currentTests.push({ name, fn });
}

export function beforeEach(fn: () => void): void {
  if (typeof (globalThis as any).beforeEach === 'function') {
    (globalThis as any).beforeEach(fn);
  }
}

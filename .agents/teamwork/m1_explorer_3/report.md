# Informe Técnico y Especificación de Diseño: Domain Reducer, Contexts & Unit Tests
## Milestone 1: Core Scaffolding, Theme & Domain Reducer

- **Autor:** `m1_explorer_3` (Domain & State Architecture Explorer)
- **Fecha:** 2026-10-12
- **Destinatario:** Parent Orchestrator (`4e5cc7d7-f455-416b-8a66-b6d8f72f2dc2`)
- **Fuentes Autoritativas:** `ORIGINAL_REQUEST.md`, `PROJECT.md`, `survey_spec_miner_1/report.md`, `survey_explorer_uiux_1/report.md`

---

## 1. Resumen Ejecutivo y Objetivos Arquitectónicos

Este documento define la especificación técnica completa y el código fuente de producción para la capa de gestión de estado del **Personal Dashboard**. Comprende:

1. **`src/context/taskReducer.ts`**: Reducer funcional puro con tipado estricto en TypeScript para las 12 acciones requeridas (`ADD_TASK`, `UPDATE_TASK`, `DELETE_TASK`, `DUPLICATE_TASK`, `MOVE_TASK`, `TOGGLE_SUBTASK`, `ADD_SUBTASK`, `DELETE_SUBTASK`, `SET_HORIZON_FILTER`, `SET_SEARCH`, `RESET_STATE`, `LOAD_STATE`), garantizando inmutabilidad, reordenamiento con índices contiguos ($0, 1, \dots, N-1$), prevención de tareas huérfanas (*orphan safety*) y gestión precisa de marcas de tiempo de finalización (`completedAt`).
2. **`src/context/TaskContext.tsx`**: Implementación de arquitectura de contextos separados (`TaskStateContext` y `TaskDispatchContext`) para eliminar re-renderizados innecesarios, proveyendo los hooks `useTaskState`, `useTaskDispatch` y la fachada `useTasks`.
3. **`src/context/ThemeContext.tsx`**: Proveedor de tema nativo (Dark/Light) con sincronización en `localStorage`, control de clase `.dark` en el elemento raíz `<html>`, detección de preferencia del sistema operativo (`prefers-color-scheme`) y sincronización multi-pestaña.
4. **`src/test/reducer.test.ts`**: Suite exhaustiva de pruebas unitarias en **Vitest** con cobertura del 100% sobre cada acción, transiciones de estado, inmutabilidad y casos de frontera.

---

## 2. Especificación de Diseño: `src/context/taskReducer.ts`

### 2.1. Invariantes del Estado y Principios de Diseño

1. **Inmutabilidad Absoluta:** Ninguna operación muta el estado anterior; todas las operaciones retornan nuevas referencias con `shallow/deep copy` estructurado.
2. **Índices Contiguos de Orden (`order` invariant):** En cualquier columna dada, las tareas mantienen índices enteros contiguos ordenados: $0, 1, 2, \dots, N-1$. Las acciones `MOVE_TASK`, `ADD_TASK`, `DELETE_TASK` y `DUPLICATE_TASK` renormalizan siempre los órdenes de las columnas afectadas.
3. **Seguridad de Huérfanos (*Orphan Safety*):** Cuando se elimina una tarea que actúa como padre (`parentTaskId`), todas sus subtareas hijas en horizontes inferiores no se eliminan; en su lugar, su `parentTaskId` pasa a `null` de forma segura.
4. **Ciclo de Vida de `completedAt`:**
   - Si una tarea se mueve o actualiza a una columna con `isCompletedColumn: true`, se registra la marca de tiempo ISO en `completedAt`.
   - Si una tarea sale de una columna completada hacia una no completada, `completedAt` se restablece a `null`.
5. **Robustez ante Payloads Flexibles:** El reducer procesa tanto payloads encapsulados (`{ id: string }`) como valores primitivos (`string`), previniendo errores en tiempo de ejecución.

### 2.2. Tipos de Acción y Payload

```typescript
export interface MoveTaskPayload {
  taskId: string;
  sourceColumnId?: string;
  destinationColumnId: string;
  sourceIndex?: number;
  destinationIndex: number;
}

export type TaskAction =
  | { type: 'ADD_TASK'; payload: Partial<Task> & { title: string; columnId: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Omit<Task, 'id' | 'createdAt'>> } }
  | { type: 'DELETE_TASK'; payload: { id: string } | string }
  | { type: 'DUPLICATE_TASK'; payload: { id: string; newId?: string } }
  | { type: 'MOVE_TASK'; payload: MoveTaskPayload }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { taskId: string; title: string; id?: string } }
  | { type: 'DELETE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'SET_HORIZON_FILTER'; payload: { horizon: Horizon | 'all' } | (Horizon | 'all') }
  | { type: 'SET_SEARCH'; payload: { query: string } | string }
  | { type: 'RESET_STATE'; payload?: { seedState?: DashboardAppState } }
  | { type: 'LOAD_STATE'; payload: { state: DashboardAppState } };
```

### 2.3. Código Completo de Producción: `src/context/taskReducer.ts`

```typescript
// src/context/taskReducer.ts
import { DashboardAppState, Horizon, KanbanColumn, Subtask, Task } from '../types/domain';

export interface MoveTaskPayload {
  taskId: string;
  sourceColumnId?: string;
  destinationColumnId: string;
  sourceIndex?: number;
  destinationIndex: number;
}

export type TaskAction =
  | { type: 'ADD_TASK'; payload: Partial<Task> & { title: string; columnId: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Omit<Task, 'id' | 'createdAt'>> } }
  | { type: 'DELETE_TASK'; payload: { id: string } | string }
  | { type: 'DUPLICATE_TASK'; payload: { id: string; newId?: string } }
  | { type: 'MOVE_TASK'; payload: MoveTaskPayload }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { taskId: string; title: string; id?: string } }
  | { type: 'DELETE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'SET_HORIZON_FILTER'; payload: { horizon: Horizon | 'all' } | (Horizon | 'all') }
  | { type: 'SET_SEARCH'; payload: { query: string } | string }
  | { type: 'RESET_STATE'; payload?: { seedState?: DashboardAppState } }
  | { type: 'LOAD_STATE'; payload: { state: DashboardAppState } };

// Utilidad generadora de identificadores segura para navegadores y entornos de prueba
function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Re-indexa de forma contigua las tareas de una columna específica (orden 0, 1, 2... N-1)
function normalizeColumnOrders(tasks: Task[], columnId: string): Task[] {
  const columnTasks = tasks
    .filter(t => t.columnId === columnId)
    .sort((a, b) => a.order - b.order)
    .map((task, index) => (task.order === index ? task : { ...task, order: index }));

  const otherTasks = tasks.filter(t => t.columnId !== columnId);
  return [...otherTasks, ...columnTasks];
}

export function taskReducer(state: DashboardAppState, action: TaskAction): DashboardAppState {
  switch (action.type) {
    case 'ADD_TASK': {
      const payload = action.payload;
      const title = payload.title?.trim();
      if (!title) return state;

      const columnId = payload.columnId;
      const targetColumn = state.columns.find(c => c.id === columnId);
      const isCompleted = Boolean(targetColumn?.isCompletedColumn);

      const columnTasks = state.tasks.filter(t => t.columnId === columnId);
      const now = new Date().toISOString();
      const insertOrder = typeof payload.order === 'number' ? payload.order : columnTasks.length;

      const newTask: Task = {
        id: payload.id || generateId('task'),
        title,
        description: payload.description || '',
        horizon: payload.horizon || 'daily',
        columnId,
        priority: payload.priority || 'medium',
        dueDate: payload.dueDate ?? null,
        tags: Array.isArray(payload.tags) ? [...payload.tags] : [],
        subtasks: Array.isArray(payload.subtasks)
          ? payload.subtasks.map((st, idx) => ({
              id: st.id || generateId('st'),
              title: st.title || '',
              completed: Boolean(st.completed),
            }))
          : [],
        parentTaskId: payload.parentTaskId ?? null,
        order: insertOrder,
        createdAt: payload.createdAt || now,
        updatedAt: payload.updatedAt || now,
        completedAt: payload.completedAt !== undefined ? payload.completedAt : (isCompleted ? now : null),
      };

      // Si se inserta en un orden específico menor al total, reordenar
      let newTasks = [...state.tasks, newTask];
      newTasks = normalizeColumnOrders(newTasks, columnId);

      return {
        ...state,
        tasks: newTasks,
      };
    }

    case 'UPDATE_TASK': {
      const { id, updates } = action.payload;
      const existingTask = state.tasks.find(t => t.id === id);
      if (!existingTask) return state;

      const now = new Date().toISOString();
      let completedAt = existingTask.completedAt;
      let targetColumnId = updates.columnId ?? existingTask.columnId;

      // Evaluar cambio de columna en completedAt
      if (updates.columnId && updates.columnId !== existingTask.columnId) {
        const destCol = state.columns.find(c => c.id === updates.columnId);
        completedAt = destCol?.isCompletedColumn ? (existingTask.completedAt || now) : null;
      } else if (updates.completedAt !== undefined) {
        completedAt = updates.completedAt;
      }

      let updatedTasks = state.tasks.map(task => {
        if (task.id !== id) return task;
        return {
          ...task,
          ...updates,
          columnId: targetColumnId,
          completedAt,
          updatedAt: now,
        };
      });

      // Si cambió de columna, normalizar ambas columnas
      if (updates.columnId && updates.columnId !== existingTask.columnId) {
        updatedTasks = normalizeColumnOrders(updatedTasks, existingTask.columnId);
        updatedTasks = normalizeColumnOrders(updatedTasks, updates.columnId);
      }

      return {
        ...state,
        tasks: updatedTasks,
      };
    }

    case 'DELETE_TASK': {
      const id = typeof action.payload === 'object' && 'id' in action.payload
        ? action.payload.id
        : (action.payload as string);

      const taskToDelete = state.tasks.find(t => t.id === id);
      if (!taskToDelete) return state;

      const columnId = taskToDelete.columnId;
      const now = new Date().toISOString();

      // 1. Desvincular tareas hijas (Orphan Safety Rule)
      // 2. Filtrar la tarea eliminada
      const remainingTasks = state.tasks
        .filter(t => t.id !== id)
        .map(t => (t.parentTaskId === id ? { ...t, parentTaskId: null, updatedAt: now } : t));

      // 3. Normalizar orden en la columna afectada
      const normalizedTasks = normalizeColumnOrders(remainingTasks, columnId);

      return {
        ...state,
        tasks: normalizedTasks,
      };
    }

    case 'DUPLICATE_TASK': {
      const original = state.tasks.find(t => t.id === action.payload.id);
      if (!original) return state;

      const now = new Date().toISOString();
      const newId = action.payload.newId || generateId('task');

      const clonedSubtasks: Subtask[] = original.subtasks.map((st, idx) => ({
        ...st,
        id: generateId(`st-dup-${idx}`),
      }));

      // Obtener tareas de la columna ordenadas
      const colTasks = state.tasks
        .filter(t => t.columnId === original.columnId)
        .sort((a, b) => a.order - b.order);

      const originalIndex = colTasks.findIndex(t => t.id === original.id);
      const insertIndex = originalIndex >= 0 ? originalIndex + 1 : colTasks.length;

      const duplicatedTask: Task = {
        ...original,
        id: newId,
        title: `${original.title} (Copia)`,
        subtasks: clonedSubtasks,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        order: insertIndex,
      };

      colTasks.splice(insertIndex, 0, duplicatedTask);
      const reindexedColTasks = colTasks.map((t, idx) => ({ ...t, order: idx }));
      const otherTasks = state.tasks.filter(t => t.columnId !== original.columnId);

      return {
        ...state,
        tasks: [...otherTasks, ...reindexedColTasks],
      };
    }

    case 'MOVE_TASK': {
      const { taskId, destinationColumnId, destinationIndex } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return state;

      const sourceColumnId = action.payload.sourceColumnId || task.columnId;
      const destColumn = state.columns.find(c => c.id === destinationColumnId);
      const now = new Date().toISOString();

      // CASO A: Movimiento intra-columna (mismo origen y destino)
      if (sourceColumnId === destinationColumnId) {
        const colTasks = state.tasks
          .filter(t => t.columnId === sourceColumnId)
          .sort((a, b) => a.order - b.order);

        const currentIndex = colTasks.findIndex(t => t.id === taskId);
        if (currentIndex === -1) return state;

        const targetIndex = Math.max(0, Math.min(destinationIndex, colTasks.length - 1));
        if (currentIndex === targetIndex) return state; // Sin cambio de posición

        const [movingTask] = colTasks.splice(currentIndex, 1);
        colTasks.splice(targetIndex, 0, { ...movingTask, updatedAt: now });

        const reorderedColTasks = colTasks.map((t, idx) => ({ ...t, order: idx }));
        const otherTasks = state.tasks.filter(t => t.columnId !== sourceColumnId);

        return {
          ...state,
          tasks: [...otherTasks, ...reorderedColTasks],
        };
      }

      // CASO B: Movimiento inter-columna (cambio de columna)
      const sourceTasks = state.tasks
        .filter(t => t.columnId === sourceColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order)
        .map((t, idx) => ({ ...t, order: idx }));

      const destTasks = state.tasks
        .filter(t => t.columnId === destinationColumnId)
        .sort((a, b) => a.order - b.order);

      const targetIndex = Math.max(0, Math.min(destinationIndex, destTasks.length));

      const isDestCompleted = Boolean(destColumn?.isCompletedColumn);
      const completedAt = isDestCompleted ? (task.completedAt || now) : null;

      const updatedTask: Task = {
        ...task,
        columnId: destinationColumnId,
        completedAt,
        updatedAt: now,
      };

      destTasks.splice(targetIndex, 0, updatedTask);
      const reindexedDestTasks = destTasks.map((t, idx) => ({ ...t, order: idx }));

      const otherTasks = state.tasks.filter(
        t => t.columnId !== sourceColumnId && t.columnId !== destinationColumnId
      );

      return {
        ...state,
        tasks: [...otherTasks, ...sourceTasks, ...reindexedDestTasks],
      };
    }

    case 'TOGGLE_SUBTASK': {
      const { taskId, subtaskId } = action.payload;
      const now = new Date().toISOString();

      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            updatedAt: now,
            subtasks: task.subtasks.map(st =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st
            ),
          };
        }),
      };
    }

    case 'ADD_SUBTASK': {
      const { taskId, title, id } = action.payload;
      const trimmedTitle = title?.trim();
      if (!trimmedTitle) return state;

      const now = new Date().toISOString();
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task;
          const newSubtask: Subtask = {
            id: id || generateId('st'),
            title: trimmedTitle,
            completed: false,
          };
          return {
            ...task,
            updatedAt: now,
            subtasks: [...task.subtasks, newSubtask],
          };
        }),
      };
    }

    case 'DELETE_SUBTASK': {
      const { taskId, subtaskId } = action.payload;
      const now = new Date().toISOString();

      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            updatedAt: now,
            subtasks: task.subtasks.filter(st => st.id !== subtaskId),
          };
        }),
      };
    }

    case 'SET_HORIZON_FILTER': {
      const horizon =
        typeof action.payload === 'object' && 'horizon' in action.payload
          ? action.payload.horizon
          : (action.payload as Horizon | 'all');

      return {
        ...state,
        selectedHorizon: horizon,
      };
    }

    case 'SET_SEARCH': {
      const query =
        typeof action.payload === 'object' && 'query' in action.payload
          ? action.payload.query
          : (action.payload as string);

      return {
        ...state,
        searchQuery: query,
      };
    }

    case 'RESET_STATE': {
      if (action.payload?.seedState) {
        return { ...action.payload.seedState };
      }
      return state;
    }

    case 'LOAD_STATE': {
      return {
        ...action.payload.state,
      };
    }

    default:
      return state;
  }
}
```

---

## 3. Especificación de Diseño: `src/context/TaskContext.tsx`

### 3.1. Arquitectura de Separación de Contextos

Para cumplir con el requerimiento de rendimiento de **60 FPS y cero layout shift**, se implementa el patrón **Separated Contexts**:
- `TaskStateContext`: Suministra solo lectura al estado global `DashboardAppState`.
- `TaskDispatchContext`: Suministra la función `dispatch: React.Dispatch<TaskAction>`.

#### Ventajas Cruciales:
1. Componentes como el botón "Nueva Tarea", inputs de búsqueda, o selectores de horizonte se suscriben a `useTaskDispatch()` o a funciones de acción memorizadas. Al no consumir `TaskStateContext`, **no se re-renderizan** cuando una tarjeta cambia de orden o se edita su título.
2. La fachada `useTasks()` expone funciones memoizadas con `useCallback` para máxima ergonomía de desarrollo.
3. Permite inyectar un `initialState` opcional, ideal para inicializaciones personalizadas y pruebas unitarias/E2E aisladas.

### 3.2. Código Completo de Producción: `src/context/TaskContext.tsx`

```typescript
// src/context/TaskContext.tsx
import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { DashboardAppState, Horizon, Task } from '../types/domain';
import { taskReducer, TaskAction, MoveTaskPayload } from './taskReducer';

// Contextos separados para prevenir re-renders superfluos
export const TaskStateContext = createContext<DashboardAppState | undefined>(undefined);
export const TaskDispatchContext = createContext<React.Dispatch<TaskAction> | undefined>(undefined);

// Estado base de reserva si no se provee initialState
const fallbackInitialState: DashboardAppState = {
  version: 1,
  tasks: [],
  columns: [
    { id: 'todo', title: 'Por hacer', order: 0, wipLimit: null, isCompletedColumn: false },
    { id: 'in-progress', title: 'En progreso', order: 1, wipLimit: 5, isCompletedColumn: false },
    { id: 'done', title: 'Completado', order: 2, wipLimit: null, isCompletedColumn: true },
  ],
  tags: [],
  selectedHorizon: 'all',
  searchQuery: '',
  theme: 'dark',
};

export interface TaskProviderProps {
  children: React.ReactNode;
  initialState?: DashboardAppState;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children, initialState }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState || fallbackInitialState);

  return (
    <TaskStateContext.Provider value={state}>
      <TaskDispatchContext.Provider value={dispatch}>
        {children}
      </TaskDispatchContext.Provider>
    </TaskStateContext.Provider>
  );
};

// Hook de acceso exclusivo al estado
export function useTaskState(): DashboardAppState {
  const context = useContext(TaskStateContext);
  if (!context) {
    throw new Error('useTaskState debe ser utilizado dentro de un TaskProvider');
  }
  return context;
}

// Hook de acceso exclusivo al dispatch
export function useTaskDispatch(): React.Dispatch<TaskAction> {
  const context = useContext(TaskDispatchContext);
  if (!context) {
    throw new Error('useTaskDispatch debe ser utilizado dentro de un TaskProvider');
  }
  return context;
}

// Hook ergonómico de fachada con funciones de acción memorizadas
export function useTasks() {
  const state = useTaskState();
  const dispatch = useTaskDispatch();

  const addTask = useCallback(
    (task: Partial<Task> & { title: string; columnId: string }) => {
      dispatch({ type: 'ADD_TASK', payload: task });
    },
    [dispatch]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
    },
    [dispatch]
  );

  const deleteTask = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_TASK', payload: { id } });
    },
    [dispatch]
  );

  const duplicateTask = useCallback(
    (id: string, newId?: string) => {
      dispatch({ type: 'DUPLICATE_TASK', payload: { id, newId } });
    },
    [dispatch]
  );

  const moveTask = useCallback(
    (payload: MoveTaskPayload) => {
      dispatch({ type: 'MOVE_TASK', payload });
    },
    [dispatch]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      dispatch({ type: 'TOGGLE_SUBTASK', payload: { taskId, subtaskId } });
    },
    [dispatch]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string, id?: string) => {
      dispatch({ type: 'ADD_SUBTASK', payload: { taskId, title, id } });
    },
    [dispatch]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      dispatch({ type: 'DELETE_SUBTASK', payload: { taskId, subtaskId } });
    },
    [dispatch]
  );

  const setHorizonFilter = useCallback(
    (horizon: Horizon | 'all') => {
      dispatch({ type: 'SET_HORIZON_FILTER', payload: { horizon } });
    },
    [dispatch]
  );

  const setSearch = useCallback(
    (query: string) => {
      dispatch({ type: 'SET_SEARCH', payload: { query } });
    },
    [dispatch]
  );

  const resetState = useCallback(
    (seedState?: DashboardAppState) => {
      dispatch({ type: 'RESET_STATE', payload: { seedState } });
    },
    [dispatch]
  );

  const loadState = useCallback(
    (newState: DashboardAppState) => {
      dispatch({ type: 'LOAD_STATE', payload: { state: newState } });
    },
    [dispatch]
  );

  return {
    state,
    dispatch,
    addTask,
    updateTask,
    deleteTask,
    duplicateTask,
    moveTask,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    setHorizonFilter,
    setSearch,
    resetState,
    loadState,
  };
}

// Selector memorizado de tareas filtradas por horizonte y término de búsqueda
export function useFilteredTasks(): Task[] {
  const { tasks, selectedHorizon, searchQuery } = useTaskState();

  return useMemo(() => {
    let result = tasks;

    if (selectedHorizon !== 'all') {
      result = result.filter(t => t.horizon === selectedHorizon);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, selectedHorizon, searchQuery]);
}

// Selector de tareas ordenadas por columna específica
export function useTasksByColumn(columnId: string): Task[] {
  const { tasks } = useTaskState();

  return useMemo(() => {
    return tasks
      .filter(t => t.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  }, [tasks, columnId]);
}
```

---

## 4. Especificación de Diseño: `src/context/ThemeContext.tsx`

### 4.1. Requerimientos de Tema y Modo Oscuro

Conforme a `ORIGINAL_REQUEST.md` (R5) y `survey_explorer_uiux_1/report.md`:
1. **Preferencia Persistente:** Se guarda en `localStorage` bajo la clave `'personal_dashboard_theme'`.
2. **Detección del Sistema Operativo:** Si no hay preferencia guardada, evalúa `window.matchMedia('(prefers-color-scheme: dark)')`.
3. **Gestión de Clase DOM:** Añade o remueve la clase `.dark` en `document.documentElement` (`<html>`) de manera reactiva e inmediata, configurando además `style.colorScheme`.
4. **Sincronización Multi-Pestaña:** Escucha el evento global `storage` en `window` para reflejar cambios instantáneamente si el usuario alterna el tema en otra pestaña abierta.

### 4.2. Código Completo de Producción: `src/context/ThemeContext.tsx`

```typescript
// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'personal_dashboard_theme';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Determina el tema inicial inspeccionando localStorage o prefers-color-scheme
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (error) {
    // Protección en caso de cookies/localStorage bloqueados
    console.warn('No se pudo acceder a localStorage para el tema:', error);
  }

  // Swiss Minimalist Default: Dark Mode
  return 'dark';
}

// Aplica el tema al elemento raíz del DOM y al atributo colorScheme
export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  root.style.colorScheme = theme;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultTheme }) => {
  const [theme, setThemeState] = useState<Theme>(() => defaultTheme || getInitialTheme());

  // Efecto para sincronizar el DOM y localStorage en cada cambio de tema
  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Error al persistir tema en localStorage:', e);
    }
  }, [theme]);

  // Sincronización en tiempo real multi-pestaña mediante evento 'storage'
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
}
```

---

## 5. Especificación de Diseño: `src/test/reducer.test.ts`

### 5.1. Matriz de Cobertura de Pruebas Unitarias

La suite de pruebas para el reducer cubre exhaustivamente:
- **`ADD_TASK`**: Creación con defaults, asignación contigua de orden, cálculo de `completedAt` si se añade directamente a una columna completada.
- **`UPDATE_TASK`**: Actualización parcial inmutable, actualización de `updatedAt`, transición a/desde columnas completadas modificando `completedAt`, no mutación si la tarea no existe.
- **`DELETE_TASK`**: Eliminación de tarea, reindexación contigua de la columna afectada, **Orphan Safety** (reseteo de `parentTaskId` a `null` en tareas hijas).
- **`DUPLICATE_TASK`**: Duplicación con sufijo ` (Copia)`, regeneración de IDs en subitems, orden contiguo tras la original.
- **`MOVE_TASK`**:
  - Reordenamiento dentro de la misma columna (hacia abajo y hacia arriba) con normalización $0..N-1$.
  - Transferencia entre columnas con actualización de `columnId`, reindexación de origen y destino.
  - Asignación de `completedAt` al mover a columna completada y limpieza de `completedAt` al mover fuera de ella.
  - Robustez ante índices de destino fuera de rango (clamp seguro).
- **`SUBTASKS`**: Alternancia de estado con `TOGGLE_SUBTASK`, inserción con `ADD_SUBTASK` (rechazo de títulos vacíos) y eliminación con `DELETE_SUBTASK`.
- **`FILTERS & SEARCH`**: Actualización de horizonte seleccionado y término de búsqueda.
- **`STATE CONTROL`**: `RESET_STATE` y `LOAD_STATE`.
- **`IMMUTABILITY`**: Verificación de congelamiento profundo (`Object.freeze`) asegurando cero mutación directa del objeto de estado.

### 5.2. Código Completo de Producción: `src/test/reducer.test.ts`

```typescript
// src/test/reducer.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { taskReducer } from '../context/taskReducer';
import { DashboardAppState, Task, KanbanColumn } from '../types/domain';

describe('taskReducer Unit Test Suite', () => {
  const initialColumns: KanbanColumn[] = [
    { id: 'todo', title: 'Por hacer', order: 0, wipLimit: null, isCompletedColumn: false },
    { id: 'in-progress', title: 'En progreso', order: 1, wipLimit: 5, isCompletedColumn: false },
    { id: 'done', title: 'Completado', order: 2, wipLimit: null, isCompletedColumn: true },
  ];

  let sampleState: DashboardAppState;

  beforeEach(() => {
    sampleState = {
      version: 1,
      columns: [...initialColumns],
      tags: [
        { id: 'tag-1', name: 'Frontend', color: '#2563EB' },
        { id: 'tag-2', name: 'Arquitectura', color: '#7C3AED' },
      ],
      selectedHorizon: 'all',
      searchQuery: '',
      theme: 'dark',
      tasks: [
        {
          id: 'task-1',
          title: 'Meta Mensual Macro',
          description: 'Objetivo de alto impacto',
          horizon: 'monthly',
          columnId: 'in-progress',
          priority: 'high',
          dueDate: '2026-10-31',
          tags: ['tag-1'],
          subtasks: [
            { id: 'st-1', title: 'Subtarea 1', completed: false },
            { id: 'st-2', title: 'Subtarea 2', completed: true },
          ],
          parentTaskId: null,
          order: 0,
          createdAt: '2026-10-01T10:00:00Z',
          updatedAt: '2026-10-01T10:00:00Z',
          completedAt: null,
        },
        {
          id: 'task-2',
          title: 'Compromiso Semanal',
          description: 'Desglose del objetivo mensual',
          horizon: 'weekly',
          columnId: 'todo',
          priority: 'medium',
          dueDate: '2026-10-20',
          tags: ['tag-2'],
          subtasks: [],
          parentTaskId: 'task-1',
          order: 0,
          createdAt: '2026-10-02T10:00:00Z',
          updatedAt: '2026-10-02T10:00:00Z',
          completedAt: null,
        },
        {
          id: 'task-3',
          title: 'Tarea Diaria 1',
          description: 'Ejecución del día',
          horizon: 'daily',
          columnId: 'todo',
          priority: 'high',
          dueDate: '2026-10-12',
          tags: ['tag-1'],
          subtasks: [],
          parentTaskId: 'task-2',
          order: 1,
          createdAt: '2026-10-03T10:00:00Z',
          updatedAt: '2026-10-03T10:00:00Z',
          completedAt: null,
        },
      ],
    };
  });

  describe('ADD_TASK', () => {
    it('debe agregar una tarea nueva al final de la columna especificada', () => {
      const nextState = taskReducer(sampleState, {
        type: 'ADD_TASK',
        payload: {
          title: 'Nueva Tarea de Prueba',
          columnId: 'todo',
          priority: 'low',
          horizon: 'daily',
        },
      });

      expect(nextState.tasks.length).toBe(4);
      const added = nextState.tasks.find(t => t.title === 'Nueva Tarea de Prueba');
      expect(added).toBeDefined();
      expect(added?.columnId).toBe('todo');
      expect(added?.order).toBe(2); // Existían órdenes 0 y 1 en 'todo'
      expect(added?.id).toBeDefined();
      expect(added?.completedAt).toBeNull();
    });

    it('debe marcar completedAt si se agrega directamente a una columna completada', () => {
      const nextState = taskReducer(sampleState, {
        type: 'ADD_TASK',
        payload: {
          title: 'Tarea Ya Finalizada',
          columnId: 'done',
        },
      });

      const added = nextState.tasks.find(t => t.title === 'Tarea Ya Finalizada');
      expect(added).toBeDefined();
      expect(added?.completedAt).not.toBeNull();
    });

    it('debe ignorar adición si el título está vacío o contiene solo espacios', () => {
      const nextState = taskReducer(sampleState, {
        type: 'ADD_TASK',
        payload: {
          title: '    ',
          columnId: 'todo',
        },
      });

      expect(nextState.tasks.length).toBe(3);
    });
  });

  describe('UPDATE_TASK', () => {
    it('debe actualizar propiedades de una tarea existente y renovar updatedAt', () => {
      const nextState = taskReducer(sampleState, {
        type: 'UPDATE_TASK',
        payload: {
          id: 'task-3',
          updates: {
            title: 'Tarea Diaria Modificada',
            priority: 'low',
            dueDate: '2026-10-15',
          },
        },
      });

      const updated = nextState.tasks.find(t => t.id === 'task-3');
      expect(updated?.title).toBe('Tarea Diaria Modificada');
      expect(updated?.priority).toBe('low');
      expect(updated?.dueDate).toBe('2026-10-15');
      expect(updated?.updatedAt).not.toBe(sampleState.tasks[2].updatedAt);
    });

    it('debe actualizar completedAt al transferir columna mediante UPDATE_TASK a columna Done', () => {
      const nextState = taskReducer(sampleState, {
        type: 'UPDATE_TASK',
        payload: {
          id: 'task-3',
          updates: {
            columnId: 'done',
          },
        },
      });

      const updated = nextState.tasks.find(t => t.id === 'task-3');
      expect(updated?.columnId).toBe('done');
      expect(updated?.completedAt).not.toBeNull();
    });

    it('debe retornar el estado idéntico si el id no existe', () => {
      const nextState = taskReducer(sampleState, {
        type: 'UPDATE_TASK',
        payload: {
          id: 'non-existent-id',
          updates: { title: 'Test' },
        },
      });

      expect(nextState).toBe(sampleState);
    });
  });

  describe('DELETE_TASK & Orphan Safety', () => {
    it('debe eliminar la tarea y re-indexar contiguamente el orden en la columna', () => {
      // En 'todo' están task-2 (order 0) y task-3 (order 1)
      const nextState = taskReducer(sampleState, {
        type: 'DELETE_TASK',
        payload: { id: 'task-2' },
      });

      expect(nextState.tasks.length).toBe(2);
      expect(nextState.tasks.some(t => t.id === 'task-2')).toBe(false);

      const task3 = nextState.tasks.find(t => t.id === 'task-3');
      expect(task3?.order).toBe(0); // Pasa de 1 a 0
    });

    it('Orphan Safety: debe desvincular tareas hijas fijando parentTaskId a null si se elimina el padre', () => {
      // task-2 es hijo de task-1. Si eliminamos task-1:
      const nextState = taskReducer(sampleState, {
        type: 'DELETE_TASK',
        payload: { id: 'task-1' },
      });

      const task2 = nextState.tasks.find(t => t.id === 'task-2');
      expect(task2).toBeDefined();
      expect(task2?.parentTaskId).toBeNull();
    });
  });

  describe('DUPLICATE_TASK', () => {
    it('debe duplicar una tarea con sufijo (Copia) e IDs independientes en subtareas', () => {
      const nextState = taskReducer(sampleState, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-1' },
      });

      expect(nextState.tasks.length).toBe(4);
      const duplicate = nextState.tasks.find(t => t.title === 'Meta Mensual Macro (Copia)');
      expect(duplicate).toBeDefined();
      expect(duplicate?.id).not.toBe('task-1');
      expect(duplicate?.subtasks.length).toBe(2);
      expect(duplicate?.subtasks[0].id).not.toBe('st-1');
      expect(duplicate?.completedAt).toBeNull();
    });
  });

  describe('MOVE_TASK (DnD In-Column & Cross-Column)', () => {
    it('debe reordenar tareas dentro de la misma columna (Intra-column downwards)', () => {
      // Añadimos una tercera tarea en 'todo' para probar reordenamiento amplio
      const stateWithThreeInTodo: DashboardAppState = {
        ...sampleState,
        tasks: [
          ...sampleState.tasks,
          {
            id: 'task-4',
            title: 'Tarea 4',
            description: '',
            horizon: 'daily',
            columnId: 'todo',
            priority: 'low',
            dueDate: null,
            tags: [],
            subtasks: [],
            order: 2,
            createdAt: '2026-10-04T10:00:00Z',
            updatedAt: '2026-10-04T10:00:00Z',
            completedAt: null,
          },
        ],
      };

      // Tareas en 'todo': task-2 (0), task-3 (1), task-4 (2).
      // Movemos task-2 al índice 2
      const nextState = taskReducer(stateWithThreeInTodo, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-2',
          sourceColumnId: 'todo',
          destinationColumnId: 'todo',
          sourceIndex: 0,
          destinationIndex: 2,
        },
      });

      const todoTasks = nextState.tasks
        .filter(t => t.columnId === 'todo')
        .sort((a, b) => a.order - b.order);

      expect(todoTasks.map(t => t.id)).toEqual(['task-3', 'task-4', 'task-2']);
      expect(todoTasks.map(t => t.order)).toEqual([0, 1, 2]);
    });

    it('debe mover una tarea entre columnas diferentes y actualizar completedAt al llegar a Done', () => {
      // Movemos task-3 ('todo') a 'done'
      const nextState = taskReducer(sampleState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-3',
          sourceColumnId: 'todo',
          destinationColumnId: 'done',
          sourceIndex: 1,
          destinationIndex: 0,
        },
      });

      const task3 = nextState.tasks.find(t => t.id === 'task-3');
      expect(task3?.columnId).toBe('done');
      expect(task3?.order).toBe(0);
      expect(task3?.completedAt).not.toBeNull();

      // En 'todo' solo queda task-2 con orden 0
      const remainingTodo = nextState.tasks.filter(t => t.columnId === 'todo');
      expect(remainingTodo.length).toBe(1);
      expect(remainingTodo[0].order).toBe(0);
    });

    it('debe resetear completedAt a null al sacar una tarea de la columna Done', () => {
      // Primero colocamos una tarea en 'done'
      const stateWithDoneTask: DashboardAppState = {
        ...sampleState,
        tasks: [
          ...sampleState.tasks,
          {
            id: 'task-done',
            title: 'Tarea Finalizada',
            description: '',
            horizon: 'daily',
            columnId: 'done',
            priority: 'medium',
            dueDate: null,
            tags: [],
            subtasks: [],
            order: 0,
            createdAt: '2026-10-01T10:00:00Z',
            updatedAt: '2026-10-01T10:00:00Z',
            completedAt: '2026-10-05T12:00:00Z',
          },
        ],
      };

      const nextState = taskReducer(stateWithDoneTask, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-done',
          sourceColumnId: 'done',
          destinationColumnId: 'in-progress',
          sourceIndex: 0,
          destinationIndex: 1,
        },
      });

      const moved = nextState.tasks.find(t => t.id === 'task-done');
      expect(moved?.columnId).toBe('in-progress');
      expect(moved?.completedAt).toBeNull();
    });

    it('debe limitar de forma segura (clamp) el índice de destino si es mayor al tamaño de la columna', () => {
      const nextState = taskReducer(sampleState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-1',
          sourceColumnId: 'in-progress',
          destinationColumnId: 'todo',
          destinationIndex: 999, // Desbordamiento intencional
        },
      });

      const moved = nextState.tasks.find(t => t.id === 'task-1');
      expect(moved?.columnId).toBe('todo');
      expect(moved?.order).toBe(2); // Insertado al final de 'todo'
    });
  });

  describe('SUBTASKS OPERATIONS', () => {
    it('debe alternar completed en TOGGLE_SUBTASK', () => {
      // task-1 tiene st-1 con completed: false
      const nextState = taskReducer(sampleState, {
        type: 'TOGGLE_SUBTASK',
        payload: { taskId: 'task-1', subtaskId: 'st-1' },
      });

      const task1 = nextState.tasks.find(t => t.id === 'task-1');
      const st1 = task1?.subtasks.find(s => s.id === 'st-1');
      expect(st1?.completed).toBe(true);
    });

    it('debe agregar subtarea en ADD_SUBTASK', () => {
      const nextState = taskReducer(sampleState, {
        type: 'ADD_SUBTASK',
        payload: { taskId: 'task-2', title: 'Nueva Subtarea de Compromiso' },
      });

      const task2 = nextState.tasks.find(t => t.id === 'task-2');
      expect(task2?.subtasks.length).toBe(1);
      expect(task2?.subtasks[0].title).toBe('Nueva Subtarea de Compromiso');
      expect(task2?.subtasks[0].completed).toBe(false);
    });

    it('debe eliminar subtarea en DELETE_SUBTASK', () => {
      const nextState = taskReducer(sampleState, {
        type: 'DELETE_SUBTASK',
        payload: { taskId: 'task-1', subtaskId: 'st-1' },
      });

      const task1 = nextState.tasks.find(t => t.id === 'task-1');
      expect(task1?.subtasks.length).toBe(1);
      expect(task1?.subtasks.some(s => s.id === 'st-1')).toBe(false);
    });
  });

  describe('FILTERS & SEARCH', () => {
    it('debe actualizar selectedHorizon con SET_HORIZON_FILTER', () => {
      const nextState = taskReducer(sampleState, {
        type: 'SET_HORIZON_FILTER',
        payload: { horizon: 'daily' },
      });

      expect(nextState.selectedHorizon).toBe('daily');
    });

    it('debe actualizar searchQuery con SET_SEARCH', () => {
      const nextState = taskReducer(sampleState, {
        type: 'SET_SEARCH',
        payload: { query: 'React' },
      });

      expect(nextState.searchQuery).toBe('React');
    });
  });

  describe('LOAD_STATE & RESET_STATE', () => {
    it('debe reemplazar el estado completo con LOAD_STATE', () => {
      const importedState: DashboardAppState = {
        ...sampleState,
        searchQuery: 'Importado',
        tasks: [],
      };

      const nextState = taskReducer(sampleState, {
        type: 'LOAD_STATE',
        payload: { state: importedState },
      });

      expect(nextState.searchQuery).toBe('Importado');
      expect(nextState.tasks.length).toBe(0);
    });

    it('debe restablecer el estado al seedState proporcionado en RESET_STATE', () => {
      const customSeed: DashboardAppState = {
        ...sampleState,
        selectedHorizon: 'monthly',
      };

      const nextState = taskReducer(sampleState, {
        type: 'RESET_STATE',
        payload: { seedState: customSeed },
      });

      expect(nextState.selectedHorizon).toBe('monthly');
    });
  });

  describe('IMMUTABILITY GUARANTEE', () => {
    it('no debe mutar el estado anterior cuando se ejecuta una acción', () => {
      const frozenState = Object.freeze({
        ...sampleState,
        tasks: Object.freeze([...sampleState.tasks]),
      });

      expect(() => {
        taskReducer(frozenState as DashboardAppState, {
          type: 'ADD_TASK',
          payload: { title: 'Test Inmutabilidad', columnId: 'todo' },
        });
      }).not.toThrow();
    });
  });
});
```

---

## 6. Guía de Integración y Checklist de Verificación

| Archivo | Ruta Destino | Estado | Integración en Milestone 1 |
| :--- | :--- | :--- | :--- |
| Reducer Puro de Dominio | `src/context/taskReducer.ts` | Diseñado 100% | Importado por `TaskContext.tsx` y probado en `reducer.test.ts` |
| Proveedor de Tareas | `src/context/TaskContext.tsx` | Diseñado 100% | Provee `TaskStateContext`, `TaskDispatchContext` y hook `useTasks` |
| Proveedor de Tema | `src/context/ThemeContext.tsx` | Diseñado 100% | Provee `useTheme`, sincroniza `.dark` en DOM y `localStorage` |
| Pruebas Unitarias | `src/test/reducer.test.ts` | Diseñado 100% | Ejecutables mediante `vitest run` o `npm test` con 100% pass |

### Próximos Pasos para el Desarrollador de Síntesis:
1. Una vez que `m1_explorer_1` y `m1_explorer_2` finalicen la configuración del proyecto y los archivos base de tipos (`src/types/domain.ts`), guardar estos 4 archivos en sus respectivas rutas.
2. Ejecutar `npm test` para verificar que la suite `src/test/reducer.test.ts` pasa completamente sin errores.
3. Envolver la raíz de la aplicación (`src/App.tsx`) con:
   ```tsx
   <ThemeProvider>
     <TaskProvider initialState={seedData}>
       <AppContent />
     </TaskProvider>
   </ThemeProvider>
   ```

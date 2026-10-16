import { DashboardAppState, Horizon, KanbanColumn, Subtask, Task, TaskAction, MoveTaskPayload } from '../types/domain';
import { INITIAL_APP_STATE } from '../constants/initialData';

export type { MoveTaskPayload, TaskAction };

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
        dueTime: payload.dueTime ?? null,
        tags: Array.isArray(payload.tags) ? [...payload.tags] : [],
        subtasks: Array.isArray(payload.subtasks)
          ? payload.subtasks.map((st, idx) => ({
              id: st.id || generateId(`st-${idx}`),
              title: st.title || '',
              completed: Boolean(st.completed),
              order: typeof st.order === 'number' ? st.order : idx,
              createdAt: st.createdAt || now,
            }))
          : [],
        parentTaskId: payload.parentTaskId ?? null,
        order: insertOrder,
        createdAt: payload.createdAt || now,
        updatedAt: payload.updatedAt || now,
        completedAt: payload.completedAt !== undefined ? payload.completedAt : (isCompleted ? now : null),
        googleCalendarEventId: payload.googleCalendarEventId ?? null,
      };

      // Si se inserta en un orden específico, reordenar la columna contiguamente
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
      const targetColumnId = updates.columnId ?? existingTask.columnId;

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

      const targetCol = state.columns.find(c => c.id === original.columnId);
      const completedAt = targetCol?.isCompletedColumn ? now : null;

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
        tags: Array.isArray(original.tags) ? [...original.tags] : [],
        subtasks: clonedSubtasks,
        createdAt: now,
        updatedAt: now,
        completedAt,
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
      const { taskId } = action.payload;
      const destinationColumnId = action.payload.destinationColumnId || action.payload.targetColumnId || '';
      const destIndex = typeof action.payload.destinationIndex === 'number'
        ? action.payload.destinationIndex
        : (typeof action.payload.newOrder === 'number' ? action.payload.newOrder : 0);
      const destinationIndex = destIndex;
      const task = state.tasks.find(t => t.id === taskId);
      if (!task || !destinationColumnId) return state;

      const destColumn = state.columns.find(c => c.id === destinationColumnId);
      if (!destColumn) return state;

      const sourceColumnId = task.columnId;
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
        const otherTasks = state.tasks.filter(t => t.id !== taskId && t.columnId !== sourceColumnId);

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
        .filter(t => t.columnId === destinationColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      const targetIndex = Math.max(0, Math.min(destinationIndex, destTasks.length));

      const isDestCompleted = Boolean(destColumn.isCompletedColumn);
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
        t => t.id !== taskId && t.columnId !== sourceColumnId && t.columnId !== destinationColumnId
      );

      return {
        ...state,
        tasks: [...otherTasks, ...sourceTasks, ...reindexedDestTasks],
      };
    }

    case 'REORDER_COLUMN_TASKS': {
      const { columnId, taskIds } = action.payload;
      const colTasks = state.tasks.filter(t => t.columnId === columnId);
      const otherTasks = state.tasks.filter(t => t.columnId !== columnId);

      const reorderedIdSet = new Set(taskIds);
      const reorderedColTasks = taskIds
        .map(id => colTasks.find(ct => ct.id === id))
        .filter((t): t is Task => Boolean(t));

      const unmentionedTasks = colTasks
        .filter(t => !reorderedIdSet.has(t.id))
        .sort((a, b) => a.order - b.order);

      const combinedColTasks = [...reorderedColTasks, ...unmentionedTasks].map((t, idx) => ({
        ...t,
        order: idx,
      }));

      return {
        ...state,
        tasks: [...otherTasks, ...combinedColTasks],
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
            order: task.subtasks.length,
            createdAt: now,
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

    case 'SET_SEARCH':
    case 'SET_SEARCH_QUERY': {
      const query =
        typeof action.payload === 'object' && 'query' in action.payload
          ? action.payload.query
          : (action.payload as string);

      return {
        ...state,
        searchQuery: query,
      };
    }

    case 'SET_THEME': {
      return {
        ...state,
        theme: action.payload,
      };
    }

    case 'ADD_COLUMN': {
      const payload = action.payload;
      const exists = state.columns.some(c => c.id === payload.id);
      if (exists) return state;
      const newCol: KanbanColumn = {
        id: payload.id,
        title: payload.title,
        order: typeof (payload as KanbanColumn).order === 'number' ? (payload as KanbanColumn).order : state.columns.length,
        wipLimit: payload.wipLimit ?? null,
        isCompletedColumn: (payload as KanbanColumn).isCompletedColumn ?? false,
        colorAccent: (payload as KanbanColumn).colorAccent ?? '#64748B',
      };
      return {
        ...state,
        columns: [...state.columns, newCol],
      };
    }

    case 'UPDATE_COLUMN': {
      const { id, updates } = action.payload;
      return {
        ...state,
        columns: state.columns.map(c => (c.id === id ? { ...c, ...updates } : c)),
      };
    }

    case 'DELETE_COLUMN': {
      const id = action.payload.id || action.payload.columnId;
      if (!id) return state;

      const availableFallback = state.columns.find(c => c.id !== id)?.id || 'todo';
      const candidateTarget = action.payload.targetColumnId || action.payload.fallbackColumnId;
      const targetCol = candidateTarget && candidateTarget !== id ? candidateTarget : availableFallback;

      const updatedTasks = state.tasks.map(t => (t.columnId === id ? { ...t, columnId: targetCol } : t));
      return {
        ...state,
        columns: state.columns.filter(c => c.id !== id),
        tasks: normalizeColumnOrders(updatedTasks, targetCol),
      };
    }

    case 'REORDER_COLUMNS': {
      const { startIndex, endIndex } = action.payload;
      if (
        startIndex < 0 ||
        startIndex >= state.columns.length ||
        endIndex < 0 ||
        endIndex >= state.columns.length
      ) {
        return state;
      }
      const reordered = [...state.columns];
      const [removed] = reordered.splice(startIndex, 1);
      reordered.splice(endIndex, 0, removed);
      return {
        ...state,
        columns: reordered.map((col, idx) => ({ ...col, order: idx })),
      };
    }

    case 'RESET_TO_SEED':
    case 'RESET_STATE': {
      if (action.payload) {
        if ('seedState' in action.payload && action.payload.seedState) {
          return { ...action.payload.seedState };
        }
        if ('tasks' in action.payload) {
          return { ...(action.payload as unknown as DashboardAppState) };
        }
      }
      return { ...INITIAL_APP_STATE };
    }

    case 'LOAD_STATE': {
      if ('state' in action.payload && action.payload.state) {
        return { ...action.payload.state };
      }
      if ('tasks' in action.payload) {
        return { ...(action.payload as unknown as DashboardAppState) };
      }
      return state;
    }

    default:
      return state;
  }
}

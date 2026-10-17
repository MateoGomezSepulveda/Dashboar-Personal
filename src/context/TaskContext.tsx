// src/context/TaskContext.tsx
import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useRef } from 'react';
import { DashboardAppState, Horizon, Task } from '../types/domain';
import { INITIAL_APP_STATE } from '../constants/initialData';
import { taskReducer, TaskAction, MoveTaskPayload } from './taskReducer';
import { loadState as loadPersistedState, saveState, STORAGE_KEY } from '../services/storageService';
import { isValidAppState } from '../services/migrationService';
import { useAuth } from './AuthContext';
import {
  saveDashboardToCloud,
  loadDashboardFromCloud,
  subscribeToCloudDashboard,
} from '../services/firebase';

// Contextos separados para prevenir re-renders superfluos
export const TaskStateContext = createContext<DashboardAppState | undefined>(undefined);
export const TaskDispatchContext = createContext<React.Dispatch<TaskAction> | undefined>(undefined);

export interface TaskProviderProps {
  children: React.ReactNode;
  initialState?: DashboardAppState;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children, initialState }) => {
  const { user, loading, isConfigured, setSyncStatus } = useAuth();

  const [state, dispatch] = useReducer(
    taskReducer,
    initialState || (typeof window !== 'undefined' && !isConfigured ? loadPersistedState() : INITIAL_APP_STATE)
  );

  const isInitialMount = useRef(true);
  const isRemoteUpdate = useRef(false);
  const isCloudHydrated = useRef(false);
  const lastSyncedJson = useRef<string>('');
  const wasAuthenticated = useRef(false);

  // Sincronización en tiempo real con Firestore cuando el usuario está autenticado
  // y limpieza a datos de ejemplo al abrir sin sesión o al cerrar sesión
  useEffect(() => {
    if (!user) {
      isCloudHydrated.current = false;
      lastSyncedJson.current = '';

      // Si estaba autenticado y cerró sesión (o al iniciar sin sesión activa),
      // eliminar los datos de la cuenta y restaurar los datos de ejemplo iniciales
      if (!initialState && (wasAuthenticated.current || (!loading && isConfigured))) {
        wasAuthenticated.current = false;
        isRemoteUpdate.current = true;
        saveState(INITIAL_APP_STATE);
        dispatch({ type: 'RESET_STATE', payload: { seedState: INITIAL_APP_STATE } });
      }
      return;
    }

    wasAuthenticated.current = true;
    setSyncStatus('syncing');
    let isSubscribed = true;
    isCloudHydrated.current = false;

    // 1. Primero descargar el último estado guardado de la cuenta en la nube
    loadDashboardFromCloud(user.uid).then((cloudState) => {
      if (!isSubscribed) return;
      if (cloudState && isValidAppState(cloudState)) {
        const currentSignature = `${JSON.stringify(cloudState.tasks)}|${JSON.stringify(cloudState.columns)}`;
        lastSyncedJson.current = currentSignature;
        isRemoteUpdate.current = true;
        dispatch({ type: 'LOAD_STATE', payload: { state: cloudState } });
        isCloudHydrated.current = true;
        setSyncStatus('synced');
      } else {
        // Si es una cuenta nueva sin datos previos en la nube, guardar el estado base
        isCloudHydrated.current = true;
        saveDashboardToCloud(user.uid, state).then((ok) => {
          if (isSubscribed) setSyncStatus(ok ? 'synced' : 'error');
        });
      }
    });

    // 2. Suscripción en tiempo real a cambios hechos desde otros dispositivos (PC <-> Celular)
    const unsubscribe = subscribeToCloudDashboard(user.uid, (cloudState) => {
      if (!isSubscribed) return;
      if (cloudState && isValidAppState(cloudState)) {
        const incomingTasksJson = JSON.stringify(cloudState.tasks);
        const incomingColsJson = JSON.stringify(cloudState.columns);
        const currentSignature = `${incomingTasksJson}|${incomingColsJson}`;

        if (currentSignature !== lastSyncedJson.current) {
          lastSyncedJson.current = currentSignature;
          isRemoteUpdate.current = true;
          dispatch({ type: 'LOAD_STATE', payload: { state: cloudState } });
        }
        isCloudHydrated.current = true;
        setSyncStatus('synced');
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [user, loading, isConfigured, initialState]);

  // Guardado persistente con debounce (localStorage + Firestore solo tras hidratar desde la nube)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Guardar en localStorage si no requiere sesión o si el usuario está autenticado
    if (!isConfigured || user) {
      saveState(state);
    }

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    // No sobrescribir la nube si aún no se ha descargado el estado inicial del usuario
    if (!user || !isCloudHydrated.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (!user || !isCloudHydrated.current) return;
      const currentSignature = `${JSON.stringify(state.tasks)}|${JSON.stringify(state.columns)}`;
      lastSyncedJson.current = currentSignature;
      setSyncStatus('syncing');
      saveDashboardToCloud(user.uid, state).then((success) => {
        setSyncStatus(success ? 'synced' : 'error');
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [state]);

  // Sincronización multi-pestaña mediante el evento 'storage' del navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (isValidAppState(parsed)) {
            dispatch({ type: 'LOAD_STATE', payload: { state: parsed } });
          }
        } catch {
          // Ignorar eventos corruptos de otras pestañas
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch]);

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
      dispatch({ type: 'RESET_STATE', payload: { seedState: seedState || INITIAL_APP_STATE } });
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

// Selector memorizado de tareas filtradas por horizonte y término de búsqueda (excluyendo historial archivado)
export function useFilteredTasks(): Task[] {
  const { tasks, selectedHorizon, searchQuery } = useTaskState();

  return useMemo(() => {
    let result = tasks.filter(t => !t.isArchivedHistory);

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
      .filter(t => !t.isArchivedHistory && t.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  }, [tasks, columnId]);
}

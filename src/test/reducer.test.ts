// src/test/reducer.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { taskReducer } from '../context/taskReducer';
import { DashboardAppState, KanbanColumn } from '../types/domain';
import { INITIAL_APP_STATE } from '../constants/initialData';

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

    it('debe clonar el arreglo de tags sin compartir referencia de memoria con la tarea original', () => {
      const nextState = taskReducer(sampleState, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-1' },
      });

      const original = nextState.tasks.find(t => t.id === 'task-1');
      const duplicate = nextState.tasks.find(t => t.title === 'Meta Mensual Macro (Copia)');

      expect(original).toBeDefined();
      expect(duplicate).toBeDefined();
      expect(duplicate?.tags).toEqual(original?.tags);
      expect(duplicate?.tags).not.toBe(original?.tags);
    });

    it('debe asignar completedAt si la tarea duplicada reside en una columna completada', () => {
      const stateWithDone = taskReducer(sampleState, {
        type: 'MOVE_TASK',
        payload: { taskId: 'task-1', destinationColumnId: 'done', destinationIndex: 0 },
      });

      const nextState = taskReducer(stateWithDone, {
        type: 'DUPLICATE_TASK',
        payload: { id: 'task-1' },
      });

      const duplicate = nextState.tasks.find(t => t.title === 'Meta Mensual Macro (Copia)');
      expect(duplicate).toBeDefined();
      expect(duplicate?.columnId).toBe('done');
      expect(duplicate?.completedAt).not.toBeNull();
      expect(typeof duplicate?.completedAt).toBe('string');
    });
  });

  describe('MOVE_TASK (DnD In-Column & Cross-Column)', () => {
    it('debe reordenar tareas dentro de la misma columna (Intra-column downwards)', () => {
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

    it('debe prevenir duplicación de tareas si se envía un sourceColumnId desincronizado (stale)', () => {
      // task-1 está realmente en 'in-progress'. Simulamos un payload con sourceColumnId = 'todo' (desincronizado).
      const nextState = taskReducer(sampleState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-1',
          sourceColumnId: 'todo', // Stale!
          destinationColumnId: 'done',
          destinationIndex: 0,
        },
      });

      const task1Occurrences = nextState.tasks.filter(t => t.id === 'task-1');
      expect(task1Occurrences.length).toBe(1);
      expect(task1Occurrences[0].columnId).toBe('done');
    });

    it('debe retornar el estado inalterado si la columna de destino no existe', () => {
      const nextState = taskReducer(sampleState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-1',
          destinationColumnId: 'non-existent-column',
          destinationIndex: 0,
        },
      });

      expect(nextState).toBe(sampleState);
    });
  });

  describe('SUBTASKS OPERATIONS', () => {
    it('debe alternar completed en TOGGLE_SUBTASK', () => {
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

    it('debe restablecer el estado a INITIAL_APP_STATE cuando RESET_STATE se llama sin payload', () => {
      const modifiedState = taskReducer(sampleState, {
        type: 'ADD_TASK',
        payload: { title: 'Tarea Temporal', columnId: 'todo' },
      });
      expect(modifiedState.tasks.length).toBe(4);

      const nextState = taskReducer(modifiedState, {
        type: 'RESET_STATE',
      });

      expect(nextState.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(nextState.columns.length).toBe(INITIAL_APP_STATE.columns.length);
    });

    it('debe restablecer el estado a INITIAL_APP_STATE cuando RESET_TO_SEED se despacha sin payload', () => {
      const modifiedState: DashboardAppState = {
        ...sampleState,
        searchQuery: 'Filtro a borrar',
        tasks: [],
      };

      const nextState = taskReducer(modifiedState, {
        type: 'RESET_TO_SEED',
      });

      expect(nextState.searchQuery).toBe('');
      expect(nextState.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
    });
  });

  describe('COLUMN MANAGEMENT (REORDER & DELETE & REORDER_TASKS)', () => {
    it('debe manejar de forma segura índices fuera de límites en REORDER_COLUMNS sin corromper el arreglo', () => {
      const nextNegative = taskReducer(sampleState, {
        type: 'REORDER_COLUMNS',
        payload: { startIndex: -1, endIndex: 1 },
      });
      expect(nextNegative).toBe(sampleState);

      const nextOver = taskReducer(sampleState, {
        type: 'REORDER_COLUMNS',
        payload: { startIndex: 99, endIndex: 0 },
      });
      expect(nextOver).toBe(sampleState);

      expect(nextOver.columns.length).toBe(sampleState.columns.length);
      nextOver.columns.forEach(col => {
        expect(col).toBeDefined();
        expect(typeof col.id).toBe('string');
      });
    });

    it('debe preservar tareas no mencionadas en REORDER_COLUMN_TASKS para evitar pérdida de datos', () => {
      const nextState = taskReducer(sampleState, {
        type: 'REORDER_COLUMN_TASKS',
        payload: {
          columnId: 'todo',
          taskIds: ['task-3'], // Omitimos task-2 intencionalmente
        },
      });

      const todoTasks = nextState.tasks
        .filter(t => t.columnId === 'todo')
        .sort((a, b) => a.order - b.order);

      expect(todoTasks.length).toBe(2);
      expect(todoTasks[0].id).toBe('task-3');
      expect(todoTasks[0].order).toBe(0);
      expect(todoTasks[1].id).toBe('task-2');
      expect(todoTasks[1].order).toBe(1);
    });

    it('debe transferir a una columna alternativa en DELETE_COLUMN si fallbackColumnId coincide con el id a eliminar', () => {
      const nextState = taskReducer(sampleState, {
        type: 'DELETE_COLUMN',
        payload: {
          id: 'todo',
          fallbackColumnId: 'todo',
        },
      });

      expect(nextState.columns.some(c => c.id === 'todo')).toBe(false);

      const reassignedTask2 = nextState.tasks.find(t => t.id === 'task-2');
      const reassignedTask3 = nextState.tasks.find(t => t.id === 'task-3');
      expect(reassignedTask2?.columnId).not.toBe('todo');
      expect(nextState.columns.some(c => c.id === reassignedTask2?.columnId)).toBe(true);
      expect(reassignedTask3?.columnId).not.toBe('todo');
      expect(nextState.columns.some(c => c.id === reassignedTask3?.columnId)).toBe(true);
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

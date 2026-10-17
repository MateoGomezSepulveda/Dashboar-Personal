import React, { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, KanbanSquare, Archive } from 'lucide-react';
import { useTasks, useFilteredTasks } from '../../context/TaskContext';
import { KanbanColumn } from './KanbanColumn';
import { TaskDrawer } from '../task/TaskDrawer';
import { Task } from '../../types/domain';
import { EmptyState } from '../common/EmptyState';
import { getTodayString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

export interface KanbanBoardProps {
  className?: string;
  onOpenDrawerWithTask?: (task: Task) => void;
  onOpenDrawerForNew?: (columnId?: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  className,
  onOpenDrawerWithTask,
  onOpenDrawerForNew,
}) => {
  const { state, moveTask, addTask, updateTask, dispatch } = useTasks();
  const { columns, selectedHorizon } = state;
  const filteredTasks = useFilteredTasks();

  // Internal TaskDrawer state if not controlled externally
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerColumnId, setDrawerColumnId] = useState<string | undefined>(undefined);

  const completedColIds = new Set(
    columns.filter((c) => c.isCompletedColumn || c.id === 'done').map((c) => c.id)
  );
  const completedInView = filteredTasks.filter((t) => completedColIds.has(t.columnId));

  // Archiva las tareas completadas en el historial (para métricas del Panel Principal)
  // y reinicia las tareas repetitivas (ej. Gym) a "Por hacer"
  const handleArchiveCompletedAndResetRoutines = () => {
    const todayStr = getTodayString();
    const todayDayKey = String(new Date().getDay());
    const todoColId = columns.find((c) => !c.isCompletedColumn)?.id || 'todo';

    completedInView.forEach((task) => {
      if (task.recurrence && task.recurrence !== 'none') {
        // 1. Guardar copia del logro completado en el historial para las métricas del Panel Principal
        addTask({
          title: task.title,
          description: task.description,
          horizon: task.horizon,
          columnId: task.columnId,
          priority: task.priority,
          dueDate: task.dueDate || todayStr,
          dueTime: task.dueTime,
          tags: task.tags,
          subtasks: task.subtasks,
          parentTaskId: task.parentTaskId,
          completedAt: task.completedAt || new Date().toISOString(),
          recurrence: 'none',
          isArchivedHistory: true,
        });

        // 2. Reiniciar la tarea repetitiva a "Por hacer" con la rutina del día
        const routineForDay = task.routineSchedule?.[todayDayKey]?.trim();
        updateTask(task.id, {
          columnId: todoColId,
          completedAt: null,
          dueDate: todayStr,
          lastResetDate: todayStr,
          description: routineForDay || task.description,
          subtasks: task.subtasks.map((st) => ({ ...st, completed: false })),
        });
      } else {
        // Tarea normal completada: se archiva del tablero diario pero queda guardada para las métricas
        updateTask(task.id, {
          isArchivedHistory: true,
          completedAt: task.completedAt || new Date().toISOString(),
        });
      }
    });
  };

  // Drag and Drop End Handler
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveTask({
      taskId: draggableId,
      sourceColumnId: source.droppableId,
      destinationColumnId: destination.droppableId,
      targetColumnId: destination.droppableId,
      sourceIndex: source.index,
      destinationIndex: destination.index,
      newOrder: destination.index,
    });
  };

  const handleEditTask = (task: Task) => {
    if (onOpenDrawerWithTask) {
      onOpenDrawerWithTask(task);
    } else {
      setSelectedTask(task);
      setDrawerColumnId(task.columnId);
      setIsDrawerOpen(true);
    }
  };

  const handleQuickAdd = (columnId: string) => {
    if (onOpenDrawerForNew) {
      onOpenDrawerForNew(columnId);
    } else {
      setSelectedTask(null);
      setDrawerColumnId(columnId);
      setIsDrawerOpen(true);
    }
  };

  const handleRenameColumn = (columnId: string, newTitle: string) => {
    dispatch({
      type: 'UPDATE_COLUMN',
      payload: { id: columnId, updates: { title: newTitle } },
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    const fallback = columns.find((c) => c.id !== columnId)?.id || 'todo';
    dispatch({
      type: 'DELETE_COLUMN',
      payload: { columnId, fallbackColumnId: fallback },
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top Board Action Bar (Quick Add Button & Board Indicator) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Tablero de Flujo ({filteredTasks.length} {filteredTasks.length === 1 ? 'tarea' : 'tareas'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedHorizon === 'daily' && completedInView.length > 0 && (
            <button
              type="button"
              onClick={handleArchiveCompletedAndResetRoutines}
              title="Quita las completadas del tablero diario (guardándolas en las métricas del Panel Principal) y reinicia tus rutinas repetitivas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/70 transition-all cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Cerrar día / Limpiar completadas ({completedInView.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleQuickAdd(columns[0]?.id || 'todo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {columns.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No hay columnas en el tablero"
          description="Crea columnas para organizar tu flujo de trabajo Kanban."
          actionLabel="Restablecer Columnas"
          onAction={() => dispatch({ type: 'RESET_TO_SEED' })}
        />
      ) : (
        /* DragDropContext wrapping the board */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
            {columns.map((column) => {
              const columnTasks = filteredTasks
                .filter((t) => t.columnId === column.id)
                .sort((a, b) => a.order - b.order);

              return (
                <div
                  key={column.id}
                  className="w-full min-w-0"
                >
                  <KanbanColumn
                    column={column}
                    tasks={columnTasks}
                    onEditTask={handleEditTask}
                    onQuickAddTask={handleQuickAdd}
                    onRenameColumn={handleRenameColumn}
                    onDeleteColumn={handleDeleteColumn}
                  />
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Integrated TaskDrawer for task editing and creation */}
      <TaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        task={selectedTask}
        initialColumnId={drawerColumnId}
      />
    </div>
  );
};

export default KanbanBoard;

import React, { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, KanbanSquare, Sparkles } from 'lucide-react';
import { useTasks, useFilteredTasks } from '../../context/TaskContext';
import { KanbanColumn } from './KanbanColumn';
import { TaskDrawer } from '../task/TaskDrawer';
import { Task } from '../../types/domain';
import { EmptyState } from '../common/EmptyState';
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
  const { state, moveTask, dispatch } = useTasks();
  const { columns } = state;
  const filteredTasks = useFilteredTasks();

  // Internal TaskDrawer state if not controlled externally
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerColumnId, setDrawerColumnId] = useState<string | undefined>(undefined);

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
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Tablero de Flujo ({filteredTasks.length} {filteredTasks.length === 1 ? 'tarea' : 'tareas'})
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleQuickAdd(columns[0]?.id || 'todo')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Tarea</span>
        </button>
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

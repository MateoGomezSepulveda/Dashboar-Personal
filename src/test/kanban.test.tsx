import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskProvider } from '../context/TaskContext';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { TaskCard } from '../components/kanban/TaskCard';
import { TaskDrawer } from '../components/task/TaskDrawer';
import { SubtaskList } from '../components/task/SubtaskList';
import { TagSelector } from '../components/task/TagSelector';
import { EmptyState } from '../components/common/EmptyState';
import { DashboardAppState, Task, KanbanColumn as IKanbanColumn, Tag } from '../types/domain';
import { taskReducer } from '../context/taskReducer';

// Mock @hello-pangea/dnd for predictable jsdom unit testing
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => (
    <div data-testid="drag-drop-context" onClick={() => onDragEnd?.({
      draggableId: 'test-task-1',
      source: { droppableId: 'todo', index: 0 },
      destination: { droppableId: 'in-progress', index: 0 },
    })}>
      {children}
    </div>
  ),
  Droppable: ({ children, droppableId }: any) =>
    children(
      {
        draggableProps: {},
        innerRef: vi.fn(),
        droppableProps: { 'data-testid': `droppable-${droppableId}` },
        placeholder: <div data-testid={`placeholder-${droppableId}`} />,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({ children, draggableId, index }: any) =>
    children(
      {
        draggableProps: { 'data-testid': `draggable-${draggableId}` },
        dragHandleProps: { 'data-testid': `drag-handle-${draggableId}` },
        innerRef: vi.fn(),
      },
      { isDragging: false }
    ),
}));

const mockColumns: IKanbanColumn[] = [
  { id: 'todo', title: 'Por hacer', order: 0, wipLimit: null, isCompletedColumn: false },
  { id: 'in-progress', title: 'En progreso', order: 1, wipLimit: 2, isCompletedColumn: false },
  { id: 'done', title: 'Completado', order: 2, wipLimit: null, isCompletedColumn: true },
];

const mockTags: Tag[] = [
  { id: 'tag-1', name: 'Frontend', color: '#2563EB' },
  { id: 'tag-2', name: 'Arquitectura', color: '#7C3AED' },
];

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Meta Mensual Macro',
    description: '## Objetivo del mes\nDetalles del proyecto en **markdown**.',
    horizon: 'monthly',
    columnId: 'todo',
    priority: 'high',
    dueDate: '2026-10-31',
    tags: ['tag-1'],
    subtasks: [
      { id: 'st-1', title: 'Subtarea 1', completed: true },
      { id: 'st-2', title: 'Subtarea 2', completed: false },
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
    description: 'Desglose del objetivo mensual.',
    horizon: 'weekly',
    columnId: 'in-progress',
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
    title: 'Tarea Diaria en Progreso',
    description: 'Trabajo activo hoy.',
    horizon: 'daily',
    columnId: 'in-progress',
    priority: 'low',
    dueDate: '2026-10-12',
    tags: [],
    subtasks: [],
    parentTaskId: 'task-2',
    order: 1,
    createdAt: '2026-10-12T08:00:00Z',
    updatedAt: '2026-10-12T08:00:00Z',
    completedAt: null,
  },
  {
    id: 'task-4',
    title: 'Tarea Completada',
    description: 'Finalizada con éxito.',
    horizon: 'daily',
    columnId: 'done',
    priority: 'medium',
    dueDate: null,
    tags: ['tag-1'],
    subtasks: [],
    parentTaskId: null,
    order: 0,
    createdAt: '2026-10-12T07:00:00Z',
    updatedAt: '2026-10-12T09:00:00Z',
    completedAt: '2026-10-12T09:00:00Z',
  },
];

const mockState: DashboardAppState = {
  version: 1,
  tasks: mockTasks,
  columns: mockColumns,
  tags: mockTags,
  selectedHorizon: 'all',
  searchQuery: '',
  theme: 'light',
};

describe('Milestone 4: Kanban Board, DnD & Task Drawer Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Kanban Board & Column Rendering
  // ==========================================================================
  describe('KanbanBoard and Columns Rendering', () => {
    it('renders all Kanban columns with correct titles and task counts', () => {
      render(
        <TaskProvider initialState={mockState}>
          <KanbanBoard />
        </TaskProvider>
      );

      expect(screen.getByText('Por hacer')).toBeInTheDocument();
      expect(screen.getByText('En progreso')).toBeInTheDocument();
      expect(screen.getByText('Completado')).toBeInTheDocument();

      // Check column counts
      // 'todo' has 1 task, 'in-progress' has 2 tasks, 'done' has 1 task
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders tasks inside their corresponding columns sorted by order', () => {
      render(
        <TaskProvider initialState={mockState}>
          <KanbanBoard />
        </TaskProvider>
      );

      expect(screen.getByText('Meta Mensual Macro')).toBeInTheDocument();
      expect(screen.getByText('Compromiso Semanal')).toBeInTheDocument();
      expect(screen.getByText('Tarea Diaria en Progreso')).toBeInTheDocument();
      expect(screen.getByText('Tarea Completada')).toBeInTheDocument();
    });

    it('displays WIP Limit badge when a column exceeds its configured limit', () => {
      const stateWithExceededWip: DashboardAppState = {
        ...mockState,
        columns: [
          { id: 'todo', title: 'Por hacer', order: 0, wipLimit: 1, isCompletedColumn: false },
        ],
        tasks: [
          { ...mockTasks[0], columnId: 'todo', order: 0 },
          { ...mockTasks[1], id: 'task-extra', columnId: 'todo', order: 1 },
        ],
      };

      render(
        <TaskProvider initialState={stateWithExceededWip}>
          <KanbanBoard />
        </TaskProvider>
      );

      // 2 tasks in 'todo' with wipLimit: 1
      expect(screen.getByText(/WIP \(2\/1\)/i)).toBeInTheDocument();
    });

    it('renders EmptyState when a column has zero tasks', () => {
      const emptyColumnState: DashboardAppState = {
        ...mockState,
        tasks: [],
      };

      render(
        <TaskProvider initialState={emptyColumnState}>
          <KanbanBoard />
        </TaskProvider>
      );

      const emptyStates = screen.getAllByText('Sin tareas');
      expect(emptyStates.length).toBe(3); // All 3 columns empty
    });
  });

  // ==========================================================================
  // 2. TaskCard Component
  // ==========================================================================
  describe('TaskCard Attributes & Formatting', () => {
    it('renders priority badges with accurate labels and semantic classes', () => {
      const onEdit = vi.fn();
      render(
        <TaskProvider initialState={mockState}>
          <TaskCard task={mockTasks[0]} index={0} onEdit={onEdit} />
        </TaskProvider>
      );

      expect(screen.getByText('Alta')).toBeInTheDocument();
      expect(screen.getByText('Mensual')).toBeInTheDocument();
    });

    it('renders subtask progress indicator and completed fraction pill', () => {
      const onEdit = vi.fn();
      render(
        <TaskProvider initialState={mockState}>
          <TaskCard task={mockTasks[0]} index={0} onEdit={onEdit} />
        </TaskProvider>
      );

      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('renders child tasks progress rollup when task has children', () => {
      const onEdit = vi.fn();
      // task-1 has task-2 as child
      render(
        <TaskProvider initialState={mockState}>
          <TaskCard task={mockTasks[0]} index={0} onEdit={onEdit} />
        </TaskProvider>
      );

      expect(screen.getByText(/hijas/i)).toBeInTheDocument();
    });

    it('renders category tag chips', () => {
      const onEdit = vi.fn();
      render(
        <TaskProvider initialState={mockState}>
          <TaskCard task={mockTasks[0]} index={0} onEdit={onEdit} />
        </TaskProvider>
      );

      expect(screen.getByText('Frontend')).toBeInTheDocument();
    });

    it('calls onEdit when the card body is clicked', async () => {
      const onEdit = vi.fn();
      render(
        <TaskProvider initialState={mockState}>
          <TaskCard task={mockTasks[0]} index={0} onEdit={onEdit} />
        </TaskProvider>
      );

      const card = screen.getByTestId('task-card-task-1');
      fireEvent.click(card);
      expect(onEdit).toHaveBeenCalledWith(mockTasks[0]);
    });
  });

  // ==========================================================================
  // 3. SubtaskList Checklist Component
  // ==========================================================================
  describe('SubtaskList Interactive Checklist', () => {
    it('renders subtask items, progress percentage and handles toggling', () => {
      const onChange = vi.fn();
      const initialSubtasks = [
        { id: 'st-1', title: 'Diseñar interfaz', completed: true },
        { id: 'st-2', title: 'Implementar lógica', completed: false },
      ];

      render(<SubtaskList subtasks={initialSubtasks} onChange={onChange} />);

      expect(screen.getByText('1/2 (50%)')).toBeInTheDocument();
      expect(screen.getByText('Diseñar interfaz')).toBeInTheDocument();
      expect(screen.getByText('Implementar lógica')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      expect(onChange).toHaveBeenCalledWith([
        { id: 'st-1', title: 'Diseñar interfaz', completed: true },
        { id: 'st-2', title: 'Implementar lógica', completed: true },
      ]);
    });

    it('allows adding a new subtask via input form', () => {
      const onChange = vi.fn();
      render(<SubtaskList subtasks={[]} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Agregar subtarea...');
      fireEvent.change(input, { target: { value: 'Nueva subtarea de prueba' } });

      const addButton = screen.getByLabelText('Agregar subtarea');
      fireEvent.click(addButton);

      expect(onChange).toHaveBeenCalled();
      const added = onChange.mock.calls[0][0];
      expect(added).toHaveLength(1);
      expect(added[0].title).toBe('Nueva subtarea de prueba');
    });

    it('allows deleting a subtask', () => {
      const onChange = vi.fn();
      const initialSubtasks = [
        { id: 'st-1', title: 'Elemento a borrar', completed: false },
      ];

      render(<SubtaskList subtasks={initialSubtasks} onChange={onChange} />);

      const deleteButton = screen.getByLabelText('Eliminar subtarea Elemento a borrar');
      fireEvent.click(deleteButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  // ==========================================================================
  // 4. TagSelector Component
  // ==========================================================================
  describe('TagSelector Chips & Creation', () => {
    it('renders available tags and toggles selection', () => {
      const onChange = vi.fn();
      render(
        <TagSelector
          selectedTagIds={['tag-1']}
          onChange={onChange}
          availableTags={mockTags}
        />
      );

      expect(screen.getByText('Frontend')).toBeInTheDocument();
      expect(screen.getByText('Arquitectura')).toBeInTheDocument();

      // Click to toggle second tag
      fireEvent.click(screen.getByText('Arquitectura'));
      expect(onChange).toHaveBeenCalledWith(['tag-1', 'tag-2']);

      // Click to untoggle first tag
      fireEvent.click(screen.getByText('Frontend'));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('allows creating a new tag with custom name and color', () => {
      const onChange = vi.fn();
      const onAddTag = vi.fn();

      render(
        <TagSelector
          selectedTagIds={[]}
          onChange={onChange}
          availableTags={mockTags}
          onAddTag={onAddTag}
        />
      );

      fireEvent.click(screen.getByText('Nueva etiqueta'));

      const input = screen.getByPlaceholderText('Nombre de la etiqueta...');
      fireEvent.change(input, { target: { value: 'Testing' } });

      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

      expect(onAddTag).toHaveBeenCalled();
      expect(onAddTag.mock.calls[0][0].name).toBe('Testing');
      expect(onChange).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 5. TaskDrawer Component & Markdown Toggle
  // ==========================================================================
  describe('TaskDrawer Editor & Validation', () => {
    it('populates fields correctly when editing an existing task', () => {
      const onClose = vi.fn();
      render(
        <TaskProvider initialState={mockState}>
          <TaskDrawer isOpen={true} onClose={onClose} task={mockTasks[0]} />
        </TaskProvider>
      );

      const titleInput = screen.getByDisplayValue('Meta Mensual Macro');
      expect(titleInput).toBeInTheDocument();
      expect(screen.getByText('Editar Tarea')).toBeInTheDocument();
    });

    it('toggles between Markdown edit and preview mode', () => {
      const onClose = vi.fn();
      render(
        <TaskProvider initialState={mockState}>
          <TaskDrawer isOpen={true} onClose={onClose} task={mockTasks[0]} />
        </TaskProvider>
      );

      expect(screen.getByText('Vista previa')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Vista previa'));

      // Check rendered markdown header and bold
      expect(screen.getByText('Objetivo del mes')).toBeInTheDocument();
      expect(screen.getByText('markdown')).toBeInTheDocument();

      // Toggle back to edit
      fireEvent.click(screen.getByText('Editar'));
      expect(screen.getByDisplayValue(/## Objetivo del mes/)).toBeInTheDocument();
    });

    it('validates non-empty title and prevents submission with error message', () => {
      const onClose = vi.fn();
      const onSave = vi.fn();

      render(
        <TaskProvider initialState={mockState}>
          <TaskDrawer isOpen={true} onClose={onClose} task={null} onSave={onSave} />
        </TaskProvider>
      );

      const submitButton = screen.getByRole('button', { name: /Crear Tarea/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('El título de la tarea no puede estar vacío.')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('enforces hierarchy rules in parent task selector', () => {
      const onClose = vi.fn();
      // Render weekly task drawer: eligible parents can only be monthly
      render(
        <TaskProvider initialState={mockState}>
          <TaskDrawer isOpen={true} onClose={onClose} task={mockTasks[1]} />
        </TaskProvider>
      );

      // Monthly tasks are eligible parents for weekly task
      expect(screen.getByText(/\[Mensual\] Meta Mensual Macro/i)).toBeInTheDocument();
    });

    it('submits valid task updates successfully', () => {
      const onClose = vi.fn();
      const onSave = vi.fn();

      render(
        <TaskProvider initialState={mockState}>
          <TaskDrawer isOpen={true} onClose={onClose} task={mockTasks[0]} onSave={onSave} />
        </TaskProvider>
      );

      const titleInput = screen.getByDisplayValue('Meta Mensual Macro');
      fireEvent.change(titleInput, { target: { value: 'Título Actualizado' } });

      const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0][0].title).toBe('Título Actualizado');
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 6. State Reducer MOVE_TASK Integration
  // ==========================================================================
  describe('Kanban Drag and Drop Reducer Operations', () => {
    it('handles intra-column reordering and normalizes contiguous orders', () => {
      const updated = taskReducer(mockState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-3',
          sourceColumnId: 'in-progress',
          destinationColumnId: 'in-progress',
          sourceIndex: 1,
          destinationIndex: 0,
        },
      });

      const colTasks = updated.tasks
        .filter((t) => t.columnId === 'in-progress')
        .sort((a, b) => a.order - b.order);

      expect(colTasks[0].id).toBe('task-3');
      expect(colTasks[0].order).toBe(0);
      expect(colTasks[1].id).toBe('task-2');
      expect(colTasks[1].order).toBe(1);
    });

    it('handles cross-column moving and sets completedAt when moved to done', () => {
      const updated = taskReducer(mockState, {
        type: 'MOVE_TASK',
        payload: {
          taskId: 'task-1',
          sourceColumnId: 'todo',
          destinationColumnId: 'done',
          sourceIndex: 0,
          destinationIndex: 0,
        },
      });

      const moved = updated.tasks.find((t) => t.id === 'task-1');
      expect(moved?.columnId).toBe('done');
      expect(moved?.completedAt).toBeTruthy();
    });
  });

  // ==========================================================================
  // 7. EmptyState Component
  // ==========================================================================
  describe('EmptyState Component', () => {
    it('renders title, description and triggers action button', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="Espacio vacío"
          description="Crea tu primer elemento para comenzar."
          actionLabel="Comenzar ahora"
          onAction={onAction}
        />
      );

      expect(screen.getByText('Espacio vacío')).toBeInTheDocument();
      expect(screen.getByText('Crea tu primer elemento para comenzar.')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: 'Comenzar ahora' });
      fireEvent.click(button);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * ============================================================================
 * SEED DATA & CONSTANTS — PERSONAL DASHBOARD
 * ============================================================================
 * Initial curated dataset for first-run bootstrap and state reset.
 * Provides realistic, motivating tasks across Monthly, Weekly, and Daily
 * horizons, fully mapped into the 3 default Kanban columns.
 */

import { KanbanColumn, Tag, Task, DashboardAppState } from '../types/domain';

// ----------------------------------------------------------------------------
// 1. Default Kanban Columns
// ----------------------------------------------------------------------------

export const INITIAL_COLUMNS: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'Por hacer',
    order: 0,
    colorAccent: '#64748B', // Slate neutral
    wipLimit: null,
    isCompletedColumn: false,
    isDefault: true,
  },
  {
    id: 'in-progress',
    title: 'En progreso',
    order: 1,
    colorAccent: '#2563EB', // Royal Blue accent
    wipLimit: 5,
    isCompletedColumn: false,
    isDefault: true,
  },
  {
    id: 'done',
    title: 'Completado',
    order: 2,
    colorAccent: '#10B981', // Emerald Success
    wipLimit: null,
    isCompletedColumn: true,
    isDefault: true,
  },
];

// ----------------------------------------------------------------------------
// 2. Default Color-Coded Tags (UI/UX Pro Max Tokens)
// ----------------------------------------------------------------------------

export const INITIAL_TAGS: Tag[] = [
  {
    id: 'tag-frontend',
    name: 'Frontend',
    color: '#2563EB', // Royal Blue
  },
  {
    id: 'tag-arquitectura',
    name: 'Arquitectura',
    color: '#7C3AED', // Vivid Purple
  },
  {
    id: 'tag-productividad',
    name: 'Productividad',
    color: '#059669', // Emerald Green
  },
  {
    id: 'tag-aprendizaje',
    name: 'Aprendizaje',
    color: '#D97706', // Solar Amber
  },
  {
    id: 'tag-diseno',
    name: 'Diseño UI',
    color: '#EC4899', // Pink / Rose
  },
];

// ----------------------------------------------------------------------------
// 3. Realistic Seed Tasks (Multi-Horizon & Connected)
// ----------------------------------------------------------------------------

export const INITIAL_TASKS: Task[] = [
  // ==========================================================================
  // HORIZONTE MENSUAL (Datos de Ejemplo: Cómo usar el Horizonte Mensual)
  // ==========================================================================
  {
    id: 'task-monthly-1',
    title: '👋 Bienvenido a tu Dashboard Personal: Guía Rápida de Uso',
    description: `## ¿Cómo funciona esta aplicación?
Este tablero está diseñado con **datos de ejemplo** para enseñarte cómo organizar tu productividad en 4 vistas principales:

1. **Panel Principal**: Tu centro de mando con métricas en tiempo real (*Progreso Diario*, *Compromisos Semanales*, *Tareas Vencidas* y *Distribución de Prioridades*).
2. **Mensual (30 días)**: Donde defines tus grandes metas u objetivos estratégicos del mes.
3. **Semanal (7 días)**: Donde divides tus metas del mes en compromisos concretos para la semana.
4. **Diario (Hoy)**: Tu tablero de enfoque para ejecutar las tareas del día.

> 💡 *Inicia sesión con el botón **"Conectar"** arriba a la derecha para cargar tus tareas guardadas en la nube. Al cerrar sesión (o tras 2 minutos de inactividad), tus datos privados se limpian de la pantalla y vuelven estos ejemplos.*`,
    horizon: 'monthly',
    columnId: 'in-progress',
    priority: 'high',
    dueDate: '2026-10-31',
    dueTime: null,
    tags: ['tag-productividad', 'tag-aprendizaje'],
    subtasks: [
      {
        id: 'st-m1-1',
        title: 'Revisar el Panel Principal para ver las 4 tarjetas de resumen',
        completed: true,
        order: 0,
        createdAt: '2026-10-10T10:00:00.000Z',
      },
      {
        id: 'st-m1-2',
        title: 'Explorar las pestañas Mensual, Semanal y Diario en la barra superior',
        completed: true,
        order: 1,
        createdAt: '2026-10-10T10:00:00.000Z',
      },
      {
        id: 'st-m1-3',
        title: 'Conectar tu cuenta de Google para sincronizar tus propias tareas',
        completed: false,
        order: 2,
        createdAt: '2026-10-10T10:00:00.000Z',
      },
    ],
    parentTaskId: null,
    order: 0,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-12T16:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'task-monthly-2',
    title: '🎯 Ejemplo de Meta Mensual: Define tus objetivos a 30 días',
    description: `## ¿Para qué sirve el Horizonte Mensual?
Aquí colocas los proyectos o metas grandes que quieres lograr durante el mes.

### Consejos de uso:
1. Usa el botón **"Tablero Kanban"** arriba a la derecha si prefieres ver tus metas en columnas.
2. Usa el botón **"Jerarquía y Rollup"** para ver cómo avanzan las tareas semanales conectadas a tu meta.`,
    horizon: 'monthly',
    columnId: 'todo',
    priority: 'medium',
    dueDate: '2026-10-30',
    dueTime: null,
    tags: ['tag-productividad'],
    subtasks: [
      {
        id: 'st-m2-1',
        title: 'Hacer clic en una tarjeta para abrir el panel de detalles',
        completed: false,
        order: 0,
        createdAt: '2026-10-05T09:00:00.000Z',
      },
      {
        id: 'st-m2-2',
        title: 'Agregar subtareas y etiquetas personalizadas de colores',
        completed: false,
        order: 1,
        createdAt: '2026-10-05T09:00:00.000Z',
      },
    ],
    parentTaskId: null,
    order: 0,
    createdAt: '2026-10-02T09:00:00.000Z',
    updatedAt: '2026-10-08T11:00:00.000Z',
    completedAt: null,
  },

  // ==========================================================================
  // HORIZONTE SEMANAL (Datos de Ejemplo: Cómo usar el Horizonte Semanal)
  // ==========================================================================
  {
    id: 'task-weekly-1',
    title: '📅 Ejemplo Semanal: Divide tus metas en entregables de 7 días',
    description: `### ¿Cómo usar el Horizonte Semanal?
En esta pestaña organizas los compromisos que vas a cumplir durante la semana actual.

- Cada compromiso semanal suma al porcentaje de **Compromisos Semanales** en tu **Panel Principal**.
- Puedes moverlos entre *Por hacer*, *En progreso* y *Completado*.`,
    horizon: 'weekly',
    columnId: 'in-progress',
    priority: 'high',
    dueDate: '2026-10-18',
    dueTime: null,
    tags: ['tag-productividad', 'tag-diseno'],
    subtasks: [
      {
        id: 'st-w1-1',
        title: 'Definir qué entregables vas a completar esta semana',
        completed: true,
        order: 0,
        createdAt: '2026-10-12T08:00:00.000Z',
      },
      {
        id: 'st-w1-2',
        title: 'Asignar prioridad Alta, Media o Baja a cada compromiso',
        completed: false,
        order: 1,
        createdAt: '2026-10-12T08:00:00.000Z',
      },
      {
        id: 'st-w1-3',
        title: 'Mover a "Completado" al terminar para subir tu progreso semanal',
        completed: false,
        order: 2,
        createdAt: '2026-10-12T08:00:00.000Z',
      },
    ],
    parentTaskId: 'task-monthly-1',
    order: 1,
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-10-12T15:30:00.000Z',
    completedAt: null,
  },
  {
    id: 'task-weekly-2',
    title: '🔒 Seguridad y Cierre Automático por Inactividad (2 min)',
    description: `### Protección de tu Cuenta
Cuando inicias sesión con Google:
- Se cargan automáticamente tus tareas guardadas en la nube (PC y celular).
- Si pasas **2 minutos sin mover el mouse ni tocar la pantalla**, la sesión se cierra sola por seguridad.
- Al cerrar sesión, tus tareas privadas se borran de este dispositivo y regresan estos datos de ejemplo.`,
    horizon: 'weekly',
    columnId: 'todo',
    priority: 'medium',
    dueDate: '2026-10-19',
    dueTime: null,
    tags: ['tag-arquitectura', 'tag-productividad'],
    subtasks: [
      {
        id: 'st-w2-1',
        title: 'Iniciar sesión con el botón "Conectar" para cargar tus datos reales',
        completed: false,
        order: 0,
        createdAt: '2026-10-12T08:30:00.000Z',
      },
      {
        id: 'st-w2-2',
        title: 'Cerrar sesión para comprobar que vuelven los datos de ejemplo',
        completed: false,
        order: 1,
        createdAt: '2026-10-12T08:30:00.000Z',
      },
    ],
    parentTaskId: 'task-monthly-1',
    order: 1,
    createdAt: '2026-10-12T08:30:00.000Z',
    updatedAt: '2026-10-12T08:30:00.000Z',
    completedAt: null,
  },

  // ==========================================================================
  // HORIZONTE DIARIO (Datos de Ejemplo: Cómo usar el Tablero Diario)
  // ==========================================================================
  {
    id: 'task-daily-1',
    title: '✋ ¡Pruébalo! Mantén presionada esta tarjeta y arrástrala',
    description: `### Cómo usar el Tablero Kanban
Puedes arrastrar cualquier tarjeta tomándola desde **cualquier parte** y soltarla en otra columna (*Por hacer*, *En progreso* o *Completado*).

- Si haces un **clic rápido** sobre la tarjeta, se abre este panel lateral para editar su título, fecha límite, descripción en Markdown, subtareas y etiquetas.`,
    horizon: 'daily',
    columnId: 'in-progress',
    priority: 'high',
    dueDate: '2026-10-12',
    dueTime: '18:00',
    tags: ['tag-frontend', 'tag-diseno'],
    subtasks: [
      {
        id: 'st-d1-1',
        title: 'Arrastrar esta tarjeta a la columna "Completado"',
        completed: true,
        order: 0,
        createdAt: '2026-10-12T12:00:00.000Z',
      },
      {
        id: 'st-d1-2',
        title: 'Hacer clic en la tarjeta para ver sus detalles y checklist',
        completed: false,
        order: 1,
        createdAt: '2026-10-12T12:00:00.000Z',
      },
      {
        id: 'st-d1-3',
        title: 'Mirar cómo cambia el porcentaje en el Panel Principal',
        completed: false,
        order: 2,
        createdAt: '2026-10-12T12:00:00.000Z',
      },
    ],
    parentTaskId: 'task-weekly-1',
    order: 2,
    createdAt: '2026-10-12T09:00:00.000Z',
    updatedAt: '2026-10-12T14:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'task-daily-2',
    title: '✅ Ejemplo de Tarea Completada: Suma a tu Progreso Diario',
    description: `### Tareas Finalizadas
Todas las tareas que coloques en la columna **Completado** se marcan como terminadas y actualizan automáticamente la barra de **Progreso Diario** en tu Panel Principal.`,
    horizon: 'daily',
    columnId: 'done',
    priority: 'medium',
    dueDate: '2026-10-12',
    dueTime: null,
    tags: ['tag-productividad'],
    subtasks: [
      {
        id: 'st-d2-1',
        title: 'Crear la tarea en la columna Por hacer',
        completed: true,
        order: 0,
        createdAt: '2026-10-12T09:30:00.000Z',
      },
      {
        id: 'st-d2-2',
        title: 'Moverla a Completado al finalizar',
        completed: true,
        order: 1,
        createdAt: '2026-10-12T09:30:00.000Z',
      },
    ],
    parentTaskId: 'task-weekly-1',
    order: 0,
    createdAt: '2026-10-12T09:15:00.000Z',
    updatedAt: '2026-10-12T13:00:00.000Z',
    completedAt: '2026-10-12T13:00:00.000Z',
  },
  {
    id: 'task-daily-3',
    title: '➕ Crea una tarea nueva con el botón "+ Nueva Tarea"',
    description: `### Creación Rápida
Usa el botón azul **"+ Nueva"** en la barra superior (o el botón centrado en la parte inferior si estás en celular) para crear tareas en segundos.`,
    horizon: 'daily',
    columnId: 'todo',
    priority: 'low',
    dueDate: '2026-10-13',
    dueTime: null,
    tags: ['tag-aprendizaje'],
    subtasks: [
      {
        id: 'st-d3-1',
        title: 'Elegir el horizonte (Mensual, Semanal o Diario)',
        completed: false,
        order: 0,
        createdAt: '2026-10-12T10:00:00.000Z',
      },
      {
        id: 'st-d3-2',
        title: 'Seleccionar prioridad y fecha de vencimiento',
        completed: false,
        order: 1,
        createdAt: '2026-10-12T10:00:00.000Z',
      },
    ],
    parentTaskId: 'task-weekly-1',
    order: 2,
    createdAt: '2026-10-12T10:00:00.000Z',
    updatedAt: '2026-10-12T10:00:00.000Z',
    completedAt: null,
  },
  {
    id: 'task-daily-4',
    title: '🌙 Alterna entre Modo Oscuro y Modo Claro arriba a la derecha',
    description: `### Personalización Visual
Haz clic en el ícono del Sol/Luna en la esquina superior derecha para cambiar el tema visual en cualquier momento, o usa el ícono de Base de Datos para exportar/importar copias de seguridad en formato JSON.`,
    horizon: 'daily',
    columnId: 'todo',
    priority: 'low',
    dueDate: '2026-10-14',
    dueTime: null,
    tags: ['tag-diseno'],
    subtasks: [],
    parentTaskId: 'task-weekly-1',
    order: 3,
    createdAt: '2026-10-12T11:00:00.000Z',
    updatedAt: '2026-10-12T11:00:00.000Z',
    completedAt: null,
  },
];

// ----------------------------------------------------------------------------
// 4. Complete Initial Application State
// ----------------------------------------------------------------------------

export const INITIAL_APP_STATE: DashboardAppState = {
  version: 1,
  tasks: INITIAL_TASKS,
  columns: INITIAL_COLUMNS,
  tags: INITIAL_TAGS,
  selectedHorizon: 'all',
  searchQuery: '',
  theme: 'dark', // Native dark-first experience with crisp slate aesthetic
  lastUpdated: '2026-10-12T17:00:00.000Z',
  streakMetadata: {
    currentStreak: 1,
    longestStreak: 4,
    lastActiveDate: '2026-10-12',
  },
};

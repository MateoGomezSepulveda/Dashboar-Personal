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
  // HORIZONTE MENSUAL (Macro Metas Estratégicas)
  // ==========================================================================
  {
    id: 'task-monthly-1',
    title: 'Lanzar Dashboard Personal con Productividad Tri-Horizonte',
    description: `## Objetivo Macro del Mes
Desplegar una solución integral de gestión personal que conecte la visión de largo plazo con la ejecución diaria.

### Criterios de Éxito Clave:
- [x] Arquitectura React 18 + TypeScript limpia y desacoplada.
- [ ] Tablero Kanban con drag-and-drop interactivo a 60 FPS.
- [ ] Persistencia 100% local en el navegador con respaldos JSON.
- [ ] Cobertura de pruebas unitarias superior al 85%.

> *"La productividad no es hacer más cosas, sino hacer las cosas correctas en el horizonte temporal adecuado."*`,
    horizon: 'monthly',
    columnId: 'in-progress',
    priority: 'high',
    dueDate: '2026-10-31',
    dueTime: null,
    tags: ['tag-arquitectura', 'tag-frontend'],
    subtasks: [
      {
        id: 'st-m1-1',
        title: 'Diseñar arquitectura de datos e interfaces de dominio',
        completed: true,
        order: 0,
        createdAt: '2026-10-10T10:00:00.000Z',
      },
      {
        id: 'st-m1-2',
        title: 'Implementar tablero Kanban con soporte fluido de arrastre',
        completed: true,
        order: 1,
        createdAt: '2026-10-10T10:00:00.000Z',
      },
      {
        id: 'st-m1-3',
        title: 'Verificar suite completa de pruebas unitarias y empaquetado',
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
    title: 'Dominar Patrones Avanzados de TypeScript y Rendimiento Frontend',
    description: `## Plan de Crecimiento Técnico
Profundizar en técnicas modernas de desarrollo con React y TypeScript estricto.

### Temas de Estudio:
1. Tipos condicionales y uniones discriminadas en reducers.
2. Optimización de renderizado con React Context desacoplado.
3. Principios de accesibilidad WCAG AAA y navegación por teclado.`,
    horizon: 'monthly',
    columnId: 'todo',
    priority: 'medium',
    dueDate: '2026-10-30',
    dueTime: null,
    tags: ['tag-aprendizaje'],
    subtasks: [
      {
        id: 'st-m2-1',
        title: 'Completar lecturas sobre máquinas de estado y patrones inmutables',
        completed: false,
        order: 0,
        createdAt: '2026-10-05T09:00:00.000Z',
      },
      {
        id: 'st-m2-2',
        title: 'Implementar pruebas automatizadas con Vitest y Testing Library',
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
  // HORIZONTE SEMANAL (Compromisos y Entregables de la Semana)
  // ==========================================================================
  {
    id: 'task-weekly-1',
    title: 'Construir Tablero Kanban con Drag-and-Drop Fluido',
    description: `### Compromiso de la Semana
Construir la experiencia interactiva del Kanban con feedback visual optimizado, transiciones suaves y soporte de accesibilidad.

#### Tareas Incluidas:
- Columnas con límite WIP configurable.
- Reordenamiento vertical dentro de la columna.
- Transferencia entre columnas con actualización automática de timestamps.`,
    horizon: 'weekly',
    columnId: 'in-progress',
    priority: 'high',
    dueDate: '2026-10-18',
    dueTime: null,
    tags: ['tag-frontend', 'tag-diseno'],
    subtasks: [
      {
        id: 'st-w1-1',
        title: 'Configurar contenedores Droppable y tarjetas Draggable',
        completed: true,
        order: 0,
        createdAt: '2026-10-12T08:00:00.000Z',
      },
      {
        id: 'st-w1-2',
        title: 'Aplicar estilos visuales al arrastrar (elevación y sombra)',
        completed: false,
        order: 1,
        createdAt: '2026-10-12T08:00:00.000Z',
      },
      {
        id: 'st-w1-3',
        title: 'Verificar soporte táctil en dispositivos móviles',
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
    title: 'Implementar Persistencia Local y Copias de Seguridad JSON',
    description: `### Compromiso de la Semana
Asegurar persistencia transparente y resiliente en el almacenamiento local del navegador.

- Guardado automático con protección contra errores de cuota.
- Descarga de archivo \`personal-dashboard-backup-YYYY-MM-DD.json\`.
- Validación preventiva al importar copias de seguridad.`,
    horizon: 'weekly',
    columnId: 'todo',
    priority: 'medium',
    dueDate: '2026-10-19',
    dueTime: null,
    tags: ['tag-arquitectura', 'tag-productividad'],
    subtasks: [
      {
        id: 'st-w2-1',
        title: 'Crear servicio de serialización con validación de versión',
        completed: false,
        order: 0,
        createdAt: '2026-10-12T08:30:00.000Z',
      },
      {
        id: 'st-w2-2',
        title: 'Diseñar diálogo accesible para importar y exportar datos',
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
  // HORIZONTE DIARIO (Foco Táctico de Hoy)
  // ==========================================================================
  {
    id: 'task-daily-1',
    title: 'Diseñar Panel Lateral de Edición de Tareas con Markdown',
    description: `### Foco Crítico de Hoy
Desarrollar el panel lateral deslizante (Drawer) para edición detallada de tareas.

#### Especificaciones:
- Edición rápida de título y selector de prioridad.
- Pestañas de edición y vista previa de Markdown sanitizado.
- Lista dinámica para agregar y marcar subtareas con cálculo de progreso.`,
    horizon: 'daily',
    columnId: 'in-progress',
    priority: 'high',
    dueDate: '2026-10-12',
    dueTime: '18:00',
    tags: ['tag-frontend', 'tag-diseno'],
    subtasks: [
      {
        id: 'st-d1-1',
        title: 'Maquetar campos accesibles con Tailwind y Lucide icons',
        completed: true,
        order: 0,
        createdAt: '2026-10-12T12:00:00.000Z',
      },
      {
        id: 'st-d1-2',
        title: 'Integrar editor de subtareas con teclado (Enter)',
        completed: false,
        order: 1,
        createdAt: '2026-10-12T12:00:00.000Z',
      },
      {
        id: 'st-d1-3',
        title: 'Conectar selector de horizonte superior (parentTaskId)',
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
    title: 'Configurar Paleta Slate y Modo Oscuro con Contraste AAA',
    description: `### Logro Completado
Se configuraron las clases de Tailwind y el tema dual nativo para garantizar contraste verificado WCAG AAA y ergonomía visual sin fatiga.`,
    horizon: 'daily',
    columnId: 'done',
    priority: 'medium',
    dueDate: '2026-10-12',
    dueTime: null,
    tags: ['tag-frontend', 'tag-diseno'],
    subtasks: [
      {
        id: 'st-d2-1',
        title: 'Definir tokens de colores Slate/Zinc y acento Royal Blue #2563EB',
        completed: true,
        order: 0,
        createdAt: '2026-10-12T09:30:00.000Z',
      },
      {
        id: 'st-d2-2',
        title: 'Implementar interruptor de tema con clase .dark en <html>',
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
    title: 'Escribir Pruebas Unitarias para el Motor de Métricas y Reducer',
    description: `### Tarea Pendiente de Hoy
Validar que las operaciones del reducer y las métricas calculen con precisión matemática:
- Porcentaje de finalización del día y de la semana.
- Detección precisa de tareas vencidas.
- Preservación de orden contiguo en movimientos entre columnas.`,
    horizon: 'daily',
    columnId: 'todo',
    priority: 'low',
    dueDate: '2026-10-13',
    dueTime: null,
    tags: ['tag-arquitectura', 'tag-productividad'],
    subtasks: [
      {
        id: 'st-d3-1',
        title: 'Prueba para cálculo de tasa de completado evitando NaN',
        completed: false,
        order: 0,
        createdAt: '2026-10-12T10:00:00.000Z',
      },
      {
        id: 'st-d3-2',
        title: 'Prueba para reordenamiento intra-columna y cambio de columna',
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
    title: 'Revisar Ergonomía y Navegación Táctil en Móvil',
    description: `### Tarea de Usabilidad Rápida
Verificar que los elementos interactivos cumplan con el área táctil mínima de 44x44px y que el carrusel horizontal Kanban funcione con snap suave en pantallas de 375px.`,
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

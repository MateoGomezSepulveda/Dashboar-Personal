# Informe de Recomendación de Modelado de Dominio y Datos Semilla
## Milestone 1: Core Scaffolding, Theme & Domain Reducer

**Autor:** `m1_explorer_2` (Domain Modeling & Data Explorer)  
**Fecha:** 2026-10-12  
**Destinatario:** Orquestador (`parent`), Implementadores, y Exploradores de M1 (`m1_explorer_1`, `m1_explorer_3`)  
**Fuentes de Verdad:**
- `ORIGINAL_REQUEST.md` (Requerimientos R1, R2, R3, R4, R5)
- `PROJECT.md` (Contratos de interfaz §Domain Types, §Storage Contract, §Metrics Engine Contract)
- `survey_spec_miner_1/report.md` (Especificación detallada de modelos y casos límite)
- `survey_explorer_uiux_1/report.md` (Tokens de diseño, semántica de colores y accesibilidad WCAG AAA)

---

## 1. Resumen Ejecutivo

El propósito de este informe es establecer el **modelo de dominio definitivo en TypeScript** y el **conjunto de datos semilla (seed data)** para el Dashboard Personal. La arquitectura requiere una unificación estricta entre la **planificación temporal en 3 horizontes (Mensual, Semanal, Diario)** y la **gestión visual en un Tablero Kanban interactivo (Por hacer, En progreso, Completado)**.

### Objetivos Clave Alcanzados:
1. **Tipado Estricto y Modular en `src/types/domain.ts`**:
   - Modelado de `Task`, `KanbanColumn` (alias `Column`), `Horizon`, `Tag`, `Subtask` y `DashboardAppState`.
   - Extensión con tipos analíticos (`ProductivityMetrics`) y unión discriminada de acciones puras (`TaskAction`) para asegurar sinergia inmediata con el reducer de `m1_explorer_3`.
   - Garantía de tipado estricto (`strict: true` en `tsconfig.json`) con cero usos de `any`.
2. **Datos Semilla Motivadores y Ricos en `src/constants/initialData.ts`**:
   - 8 tareas realistas que representan el flujo de desarrollo de un software engineer/diseñador construyendo su propio SaaS de productividad.
   - Distribución equitativa y balanceada: tareas en los 3 horizontes y en las 3 columnas Kanban.
   - Jerarquía relacional multi-horizonte completa (`parentTaskId` vinculando tareas diarias a compromisos semanales, y compromisos semanales a metas mensuales).
   - Descripciones en Markdown enriquecido (encabezados, listas de verificación, criterios de aceptación, enlaces).
   - Checklists de subtareas con diversos grados de avance (0%, 33%, 66%, 100%) para validar las barras de progreso dinámicas.
   - Sistema de etiquetas con códigos de color de alto contraste bajo el estándar **UI/UX Pro Max** y WCAG AAA.

---

## 2. Especificación Completa de Tipos de Dominio (`src/types/domain.ts`)

A continuación se presenta el código completo y optimizado para `src/types/domain.ts`, diseñado para exportar todas las interfaces requeridas por la aplicación, el reducer y los módulos de persistencia:

```typescript
/**
 * ============================================================================
 * DOMAIN TYPES & INTERFACES — PERSONAL DASHBOARD
 * ============================================================================
 * Defines the core entities, temporal horizons, Kanban columns, tags, metrics,
 * and state structures for the Personal Dashboard application.
 */

// ----------------------------------------------------------------------------
// 1. Temporal Horizons & Priorities
// ----------------------------------------------------------------------------

/**
 * Three temporal planning horizons representing planning granularity:
 * - 'monthly': High-level macro milestones, strategic goals (30-day scope).
 * - 'weekly': Sprint deliverables, operational commitments (7-day scope).
 * - 'daily': Tactical focus items for execution today ("Hoy") (24-hour scope).
 */
export type Horizon = 'monthly' | 'weekly' | 'daily';
export type HorizonType = Horizon; // Convenience alias

/**
 * Task priority levels with semantic visual hierarchy.
 */
export type Priority = 'low' | 'medium' | 'high';
export type TaskPriority = Priority; // Convenience alias

// ----------------------------------------------------------------------------
// 2. Subtasks & Checklist Entities
// ----------------------------------------------------------------------------

export interface Subtask {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Title or description of the checklist item (1-200 characters) */
  title: string;
  /** Completion status */
  completed: boolean;
  /** Contiguous 0-indexed display order */
  order?: number;
  /** ISO 8601 creation timestamp */
  createdAt?: string;
}

// ----------------------------------------------------------------------------
// 3. Category Tags System
// ----------------------------------------------------------------------------

export interface Tag {
  /** Unique slug or identifier (e.g. 'tag-frontend') */
  id: string;
  /** Display label (e.g. 'Frontend', 'Arquitectura') */
  name: string;
  /** Hex color or Tailwind color token (e.g. '#2563EB') */
  color: string;
}
export type TaskTag = Tag; // Convenience alias

// ----------------------------------------------------------------------------
// 4. Task Entity Model
// ----------------------------------------------------------------------------

export interface Task {
  /** Unique task identifier (UUID v4) */
  id: string;
  /** Mandatory task title (1-250 characters, trimmed) */
  title: string;
  /** Rich-text description supporting GitHub Flavored Markdown (GFM) */
  description: string;
  /** Temporal horizon */
  horizon: Horizon;
  /** Current Kanban column ID (references KanbanColumn.id) */
  columnId: string;
  /** Urgency / priority level */
  priority: Priority;
  /** Due date formatted as 'YYYY-MM-DD' or null if unscheduled */
  dueDate: string | null;
  /** Optional time component 'HH:mm' or null */
  dueTime?: string | null;
  /** Array of assigned Tag IDs */
  tags: string[];
  /** Ordered list of subtask checklist items */
  subtasks: Subtask[];
  /** ID of parent task in higher horizon, establishing cross-horizon links */
  parentTaskId?: string | null;
  /** Contiguous 0-indexed position within its Kanban column */
  order: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
  /** ISO 8601 completion timestamp when moved to a completed column, or null */
  completedAt?: string | null;
}

// ----------------------------------------------------------------------------
// 5. Kanban Column Model
// ----------------------------------------------------------------------------

export interface KanbanColumn {
  /** Unique column identifier (e.g. 'todo', 'in-progress', 'done') */
  id: string;
  /** Display title (e.g. 'Por hacer', 'En progreso', 'Completado') */
  title: string;
  /** Contiguous 0-indexed horizontal column order */
  order: number;
  /** Hex color accent for column indicator and drag highlights */
  colorAccent?: string;
  /** Maximum recommended tasks (WIP limit), null = unlimited */
  wipLimit?: number | null;
  /** Flag identifying terminal 'Done' status for velocity & completion rates */
  isCompletedColumn?: boolean;
  /** Built-in default columns cannot be deleted by the user */
  isDefault?: boolean;
}

/** Convenience alias matching the prompt specification */
export type Column = KanbanColumn;

// ----------------------------------------------------------------------------
// 6. User Preferences & Global State
// ----------------------------------------------------------------------------

export interface UserPreferences {
  theme: 'light' | 'dark';
  activeHorizonFilter?: Horizon | 'all';
  soundEnabled?: boolean;
  collapseCompletedColumns?: boolean;
}

export interface DashboardStreakMetadata {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // 'YYYY-MM-DD'
}

export interface DashboardAppState {
  /** Schema version for migration validation (default: 1) */
  version: number;
  /** All user tasks */
  tasks: Task[];
  /** Defined Kanban columns */
  columns: KanbanColumn[];
  /** Defined tags */
  tags: Tag[];
  /** Active temporal filter in navigation bar */
  selectedHorizon: Horizon | 'all';
  /** Global search filter query */
  searchQuery: string;
  /** Current active theme */
  theme: 'light' | 'dark';
  /** Last modification timestamp */
  lastUpdated?: string;
  /** Optional streak and productivity metadata */
  streakMetadata?: DashboardStreakMetadata;
}

// ----------------------------------------------------------------------------
// 7. Productivity Metrics Types
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// 8. State Reducer Action Types (Shorthand for Reducer Synergy)
// ----------------------------------------------------------------------------

export type TaskAction =
  | { type: 'ADD_TASK'; payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> & { id?: string; order?: number } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { id: string } }
  | { type: 'DUPLICATE_TASK'; payload: { id: string } }
  | {
      type: 'MOVE_TASK';
      payload: {
        taskId: string;
        destinationColumnId: string;
        destinationIndex: number;
        sourceColumnId?: string;
        sourceIndex?: number;
      };
    }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { taskId: string; title: string } }
  | { type: 'DELETE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'SET_HORIZON_FILTER'; payload: Horizon | 'all' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'ADD_COLUMN'; payload: KanbanColumn }
  | { type: 'UPDATE_COLUMN'; payload: { id: string; updates: Partial<KanbanColumn> } }
  | { type: 'DELETE_COLUMN'; payload: { id: string; targetColumnId?: string } }
  | { type: 'REORDER_COLUMNS'; payload: { startIndex: number; endIndex: number } }
  | { type: 'LOAD_STATE'; payload: DashboardAppState }
  | { type: 'RESET_STATE'; payload?: DashboardAppState };
```

---

## 3. Especificación de Datos Semilla Iniciales (`src/constants/initialData.ts`)

Los datos semilla están meticulosamente diseñados para ofrecer un inicio inmediatamente funcional, profesional y enriquecedor. Demuestran la jerarquía entre horizontes, completan las tres columnas del tablero y presentan descripciones en Markdown reales.

```typescript
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
```

---

## 4. Reglas de Negocio Jerárquicas y Acumulación de Progreso (Roll-up)

Para asegurar que los componentes de vistas y el reductor operen con integridad matemática, se formalizan las siguientes reglas:

### 4.1. Matriz de Vinculación Jerárquica (`parentTaskId`)

| Nivel de Horizonte de la Tarea | Horizontes Permitidos para `parentTaskId` | Regla de Validación |
| :--- | :--- | :--- |
| **`daily`** | `'weekly'` o `'monthly'` | Una tarea diaria puede vincularse a un compromiso semanal o directamente a una meta mensual. |
| **`weekly`** | `'monthly'` | Un compromiso semanal solo puede vincularse a un objetivo mensual de nivel superior. |
| **`monthly`** | `null` (Ninguno) | Las metas mensuales son el nivel macro más alto; no admiten tareas padre. |

*Regla Anti-Circular:* La interfaz y el reducer deben impedir que una tarea se asigne a sí misma como padre o a cualquiera de sus tareas descendientes.

### 4.2. Fórmula de Acumulación Dinámica (Roll-up)

Cuando se visualiza una tarea padre (mensual o semanal), el porcentaje de contribución de sus tareas hijas se calcula dinámicamente sin duplicar estado:

$$\text{Progreso}_{\text{hijas}} = \begin{cases} 0 & \text{si } N_{\text{hijas}} = 0 \\ \operatorname{round}\left(\frac{\sum_{\text{hija} \in \text{Hijas}} (\text{esCompletada}(\text{hija}) ? 1 : 0)}{N_{\text{hijas}}} \times 100\right) & \text{si } N_{\text{hijas}} > 0 \end{cases}$$

Donde `esCompletada(t)` evalúa si la columna de `t` tiene `isCompletedColumn === true`.

### 4.3. Regla de Huérfanos Seguros (Orphan Safety)

Al eliminar una tarea que actúa como padre de otras tareas:
- Las tareas hijas **no se eliminan** en cascada.
- Sus campos `parentTaskId` se restablecen de forma segura a `null`.
- Mantienen intacta su columna, horizonte y lista de subtareas.

---

## 5. Sinergia con el Reductor de Estado (`m1_explorer_3`)

El diseño de tipos y datos semilla proporciona compatibilidad total e inmediata con los requerimientos asignados a `m1_explorer_3`:

1. **Invariante de Orden Contiguo**:
   Cada columna mantiene tareas con `order: 0, 1, 2, ..., N-1`. Las acciones `MOVE_TASK` y `DELETE_TASK` recalculan estos índices para que nunca existan saltos ni duplicaciones.
2. **Actualización Automática de `completedAt`**:
   Al mover una tarjeta a una columna con `isCompletedColumn: true`, el reducer establece `task.completedAt = new Date().toISOString()`. Al sacarla de dicha columna, establece `task.completedAt = null`.
3. **Copia Profunda en Duplicación (`DUPLICATE_TASK`)**:
   Genera un nuevo `id` (UUID v4), añade `(Copia)` al título, duplica las subtareas con nuevos IDs y restablece `createdAt` al instante actual.
4. **Acción `RESET_STATE`**:
   Permite restaurar directamente `INITIAL_APP_STATE` en una sola operación inmutable.

---

## 6. Recomendación de Pruebas Unitarias para la Capa de Dominio (`src/test/domain.test.ts`)

Para verificar la robustez de los tipos y datos semilla, se recomienda que el implementador incluya las siguientes pruebas unitarias:

```typescript
import { describe, it, expect } from 'vitest';
import { INITIAL_APP_STATE, INITIAL_COLUMNS, INITIAL_TASKS, INITIAL_TAGS } from '../constants/initialData';
import { Task, KanbanColumn, Horizon } from '../types/domain';

describe('Domain Models & Seed Data Integrity', () => {
  it('contains the three default Kanban columns in contiguous order', () => {
    expect(INITIAL_COLUMNS).toHaveLength(3);
    const ids = INITIAL_COLUMNS.map((c) => c.id);
    expect(ids).toEqual(['todo', 'in-progress', 'done']);
    expect(INITIAL_COLUMNS.find((c) => c.id === 'done')?.isCompletedColumn).toBe(true);
  });

  it('contains seed tasks covering all three temporal horizons', () => {
    const horizons: Horizon[] = ['monthly', 'weekly', 'daily'];
    horizons.forEach((h) => {
      const tasksInHorizon = INITIAL_TASKS.filter((t) => t.horizon === h);
      expect(tasksInHorizon.length).toBeGreaterThan(0);
    });
  });

  it('contains tasks distributed across all default columns', () => {
    const todoTasks = INITIAL_TASKS.filter((t) => t.columnId === 'todo');
    const inProgressTasks = INITIAL_TASKS.filter((t) => t.columnId === 'in-progress');
    const doneTasks = INITIAL_TASKS.filter((t) => t.columnId === 'done');

    expect(todoTasks.length).toBeGreaterThan(0);
    expect(inProgressTasks.length).toBeGreaterThan(0);
    expect(doneTasks.length).toBeGreaterThan(0);
  });

  it('validates parent-child relationships and prevents circularity in seed data', () => {
    INITIAL_TASKS.forEach((task) => {
      if (task.parentTaskId) {
        const parent = INITIAL_TASKS.find((p) => p.id === task.parentTaskId);
        expect(parent).toBeDefined();
        // A daily task parent must be weekly or monthly
        if (task.horizon === 'daily') {
          expect(['weekly', 'monthly']).toContain(parent?.horizon);
        }
        // A weekly task parent must be monthly
        if (task.horizon === 'weekly') {
          expect(parent?.horizon).toBe('monthly');
        }
      }
    });
  });

  it('verifies that done tasks have completedAt timestamp set', () => {
    const doneTasks = INITIAL_TASKS.filter((t) => t.columnId === 'done');
    doneTasks.forEach((t) => {
      expect(t.completedAt).toBeTruthy();
    });
  });

  it('verifies subtask progress calculations on sample tasks', () => {
    const taskWithSubtasks = INITIAL_TASKS.find((t) => t.id === 'task-monthly-1');
    expect(taskWithSubtasks).toBeDefined();
    const total = taskWithSubtasks!.subtasks.length;
    const completed = taskWithSubtasks!.subtasks.filter((s) => s.completed).length;
    expect(total).toBe(3);
    expect(completed).toBe(2);
    expect(Math.round((completed / total) * 100)).toBe(67);
  });
});
```

---

## 7. Plan de Acción para Implementación en Fase de Código

1. **Crear archivo de tipos**: Escribir `src/types/domain.ts` con el contenido de la Sección 2.
2. **Crear archivo de datos iniciales**: Escribir `src/constants/initialData.ts` con el contenido de la Sección 3.
3. **Validación de Tipos**: Ejecutar `npx tsc --noEmit` para certificar cero errores de compilación TypeScript.
4. **Pruebas de Dominio**: Ejecutar `npx vitest run src/test/domain.test.ts` para verificar la coherencia estructural.

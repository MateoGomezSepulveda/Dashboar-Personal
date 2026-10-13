# Personal Dashboard — Comprehensive Specification Mining Report

**Document Version:** 1.0.0  
**Author:** survey_spec_miner_1 (Specification Miner)  
**Date:** 2026-10-12  
**Status:** Approved Specification  
**Authoritative Source:** `ORIGINAL_REQUEST.md` (2026-10-12T16:55:51Z)

---

## 1. Executive Summary & Application Scope

The **Personal Dashboard** is a high-performance, responsive single-page web application designed for personal productivity, deliberate focus, and multi-scale temporal execution. The application solves the fragmentation between high-level long-term vision and daily execution by unifying **three temporal planning horizons** (Monthly, Weekly, Daily) with a visual, interactive **Kanban workflow board** featuring fluid drag-and-drop, rich Markdown task authoring, checklist subtasks, real-time productivity metrics, and local browser persistence with versioned schema migrations and JSON backup/restore.

The application operates entirely client-side (zero external backend dependency) using modern web standards (React 18+, Vite, Tailwind CSS, Lucide React icons) and guarantees WCAG AAA accessibility, strict light/dark theme fidelity, and zero layout shift.

---

## 2. Authoritative Domain Models Specification

### 2.1 Temporal Horizons Model (`Horizon`)

```typescript
/**
 * Three distinct planning horizons representing temporal scale and granularity.
 * - 'monthly': Broad monthly objectives, macro-milestones, key results (30-day scope).
 * - 'weekly': Weekly commitments, sprint priorities, milestone deliverables (7-day scope).
 * - 'daily': Tactical execution, critical "Today" focus items, high-impact tasks (24-hour scope).
 */
export type HorizonType = 'monthly' | 'weekly' | 'daily';

export interface HorizonConfig {
  id: HorizonType;
  title: string;
  subtitle: string;
  icon: string; // Lucide icon name, e.g., 'CalendarDays', 'CalendarRange', 'Sun'
  badgeColor: {
    bgLight: string;
    textLight: string;
    bgDark: string;
    textDark: string;
    border: string;
  };
  allowedParentHorizons: HorizonType[]; // 'daily' -> ['weekly', 'monthly']; 'weekly' -> ['monthly']; 'monthly' -> []
}
```

#### Cross-Horizon Linking Specification
1. **Vertical Alignment Rule**: A `daily` task MAY be linked to a `weekly` priority or directly to a `monthly` goal via `parentTaskId`.
2. **Weekly Roll-Up Rule**: A `weekly` task MAY be linked to a `monthly` goal via `parentTaskId`.
3. **Monthly Macro Rule**: A `monthly` task has `parentTaskId: null` (top-level macro milestone).
4. **Calculated Child Progress**: Any task with child tasks in finer horizons calculates a dynamic completion percentage:
   $$\text{Progress}_{\text{parent}} = \frac{\sum_{\text{child} \in \text{Children}} (\text{isCompleted}(\text{child}) ? 1 : 0)}{\text{Total Children}} \times 100$$
5. **Orphan Safety Rule**: If a parent task is deleted, child tasks retain their horizon and column status, and their `parentTaskId` is safely set to `null` (soft detachment).

---

### 2.2 Task Entity Model (`Task`)

```typescript
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;             // UUID v4 or cuid
  title: string;          // Non-empty string (trimmed, 1-200 chars)
  completed: boolean;     // Boolean state
  order: number;          // 0-indexed position within parent task
  createdAt: string;      // ISO 8601 UTC timestamp
}

export interface TaskTag {
  id: string;             // Slug or UUID
  name: string;           // Display text (1-30 chars)
  color: string;          // Hex color code (e.g., '#3B82F6') or Tailwind palette token
}

export interface Task {
  id: string;                         // UUID v4
  title: string;                      // Mandatory title (1-250 characters, trimmed)
  description: string;                // Markdown-formatted rich text (supports GFMD: headers, lists, code, links)
  horizon: HorizonType;               // 'monthly' | 'weekly' | 'daily'
  parentTaskId: string | null;        // ID of parent task in higher horizon, or null
  columnId: string;                   // References KanbanColumn.id (e.g., 'todo', 'in-progress', 'done')
  priority: TaskPriority;             // 'high' | 'medium' | 'low'
  dueDate: string | null;             // ISO 8601 date string 'YYYY-MM-DD' or null if unscheduled
  dueTime: string | null;             // Optional 24-hr time 'HH:mm' or null
  tags: string[];                     // Array of tag names or tag IDs
  subtasks: Subtask[];                // Ordered checklist of subtasks
  order: number;                      // 0-indexed position for ordering cards within a column
  createdAt: string;                  // ISO 8601 timestamp (e.g., '2026-10-12T17:00:00Z')
  updatedAt: string;                  // ISO 8601 timestamp
  completedAt: string | null;         // ISO 8601 timestamp when moved to 'done' or null
}
```

---

### 2.3 Kanban Board & Column Model (`KanbanColumn`)

```typescript
export interface KanbanColumn {
  id: string;               // Unique column identifier ('todo', 'in-progress', 'done', or custom slug)
  name: string;             // Display name (e.g., 'Por hacer', 'En progreso', 'Completado')
  order: number;            // 0-indexed horizontal column order
  colorAccent: string;      // Hex color code or Tailwind accent token for header highlight
  wipLimit: number | null;  // Maximum allowed tasks in column (null = no limit)
  isCompletedColumn: boolean; // Flag identifying terminal 'Done' state (for metrics calculation)
  isDefault: boolean;       // True for built-in columns, preventing accidental structural breaks
}
```

#### Default Column Roster
1. **To Do / Por hacer** (`id: 'todo'`, `order: 0`, `colorAccent: '#64748B'`, `isCompletedColumn: false`)
2. **In Progress / En progreso** (`id: 'in-progress'`, `order: 1`, `colorAccent: '#2563EB'`, `isCompletedColumn: false`)
3. **Done / Completado** (`id: 'done'`, `order: 2`, `colorAccent: '#10B981'`, `isCompletedColumn: true`)

---

### 2.4 Productivity Metrics Model (`DashboardMetrics`)

```typescript
export interface DashboardMetrics {
  // Horizon Completion Percentages
  dailyCompletionRate: number;      // 0-100% of 'daily' tasks where column.isCompletedColumn === true
  weeklyCompletionRate: number;     // 0-100% of 'weekly' tasks where column.isCompletedColumn === true
  monthlyCompletionRate: number;    // 0-100% of 'monthly' tasks where column.isCompletedColumn === true

  // Raw Counts
  todayTotalTasks: number;
  todayCompletedTasks: number;
  weekTotalTasks: number;
  weekCompletedTasks: number;

  // Urgency & Health
  overdueCount: number;             // Count of active (non-completed) tasks where dueDate < today
  dueTodayCount: number;            // Count of active tasks where dueDate === today

  // Priority Distribution
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };

  // Streak & Velocity
  streakDays: number;               // Consecutive days with at least 1 task moved to completed
  lastCompletionDate: string | null;// 'YYYY-MM-DD' of last recorded task completion
  weeklyVelocity: number;           // Number of tasks completed in the trailing 7 days
}
```

---

### 2.5 Storage, Schema Versioning & Backup Model (`DashboardStorage`)

```typescript
export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_LOCAL_KEY = 'personal_dashboard_state_v1';
export const THEME_LOCAL_KEY = 'personal_dashboard_theme';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  activeHorizonFilter: HorizonType | 'all';
  soundEnabled: boolean;
  collapseCompletedColumns: boolean;
}

export interface DashboardAppState {
  schemaVersion: number;
  lastUpdated: string;        // ISO 8601 timestamp
  tasks: Task[];
  columns: KanbanColumn[];
  tags: TaskTag[];
  preferences: UserPreferences;
  streakMetadata: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null; // 'YYYY-MM-DD'
  };
}

export interface ExportPayload {
  app: 'PersonalDashboard';
  schemaVersion: number;
  exportedAt: string;         // ISO 8601 timestamp
  data: DashboardAppState;
  checksum?: string;          // Optional integrity hash or validation marker
}
```

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Horizon Planning | Horizon Filter & Navigation | Switch view between Monthly, Weekly, Daily, or All horizons with instant tab/toggle switching | User click on Horizon pill (`'monthly'` \| `'weekly'` \| `'daily'` \| `'all'`) | Re-rendered Kanban view showing only matching tasks | Fallback to `'all'` if invalid horizon string supplied | `ORIGINAL_REQUEST.md` R1 |
| 2 | Horizon Planning | Monthly Objectives & Milestones | High-level monthly goals view with list and milestone tracking | Monthly tasks array, creation modal | Cards rendered with monthly styling, contribution breakdown | Alert if title is empty or dueDate is outside current month | `ORIGINAL_REQUEST.md` R1 |
| 3 | Horizon Planning | Weekly Commitments View | Intermediate horizon view for sprint/weekly planning | Weekly tasks array | Cards rendered with weekly badges and parent-goal indicators | Validation error on empty title | `ORIGINAL_REQUEST.md` R1 |
| 4 | Horizon Planning | Daily "Today" Critical Focus | High-priority daily focus view highlighting today's essential tasks | Daily tasks array | Cards rendered with Today focus styling, urgency indicators | Empty state prompt if 0 tasks planned for today | `ORIGINAL_REQUEST.md` R1 |
| 5 | Horizon Planning | Cross-Horizon Hierarchy Linking | Associate a daily task to a weekly priority or monthly goal; associate a weekly task to a monthly goal | `parentTaskId` selection in task modal | Visual parent breadcrumb pill on task card; roll-up progress | Circular dependency prevented (cannot link to self or descendant) | `ORIGINAL_REQUEST.md` R1 |
| 6 | Kanban Board | Multi-Column Visual Workflow | Visual Kanban board displaying columns with headers, card counters, and task cards | `columns` array, `tasks` array | Multi-column responsive grid/flex layout | Fallback to default 3 columns if columns array is corrupted | `ORIGINAL_REQUEST.md` R2 |
| 7 | Kanban Board | Drag-and-Drop Cross-Column | Fluid Drag and drop cards across columns to update task status/column | Pointer drag event, target column drop zone | Task `columnId` updated, `order` assigned, re-render, audio/haptic feedback | If drop target invalid, card snaps back smoothly to origin | `ORIGINAL_REQUEST.md` R2 |
| 8 | Kanban Board | Drag-and-Drop In-Column Reorder | Reorder cards vertically within the same column | Drag card above/below neighbor cards in same column | Updated `order` attributes for all affected column tasks | No change if dropped in original slot | `ORIGINAL_REQUEST.md` R2 |
| 9 | Kanban Board | Column Customization (Add/Edit) | Add custom columns (e.g. 'En revisión', 'Bloqueado') and edit name/color accent | Column name, color picker, WIP limit | New column appended to board, state persisted | Reject blank name, reject duplicate column ID | `ORIGINAL_REQUEST.md` R2 |
| 10 | Kanban Board | Column Deletion with Task Migration | Delete custom column, safely moving contained tasks to a fallback column (e.g., 'To Do') | Delete action trigger, target fallback column selection | Column removed, tasks migrated without data loss | Disallow deletion of mandatory default columns (To Do, In Progress, Done) | `ORIGINAL_REQUEST.md` R2 |
| 11 | Kanban Board | Compact Card Display with Metadata | Rich task card displaying title, priority badge, due date badge, horizon badge, subtasks bar, tag pills | Task object | Rendered card component with micro-interaction hover/focus states | Truncate overflowing text with tooltip on hover | `ORIGINAL_REQUEST.md` R2 |
| 12 | Task Management | Quick Task Creation | Rapid inline task creation from column header or floating action button | Quick input (title, default horizon & column) | Task instantiated with defaults, placed at top/bottom of column | Trim input, disallow empty string | `ORIGINAL_REQUEST.md` R3 |
| 13 | Task Management | Full Task Editor (Modal/Drawer) | Comprehensive editor for title, markdown description, horizon, priority, due date, tags, subtasks | Form state values | Task updated in state and persisted | Form validation errors displayed next to invalid fields | `ORIGINAL_REQUEST.md` R3 |
| 14 | Task Management | Markdown Description & Preview | Support rich formatted text in task description (headers, lists, bold, code snippets) | Markdown text string, preview toggle | Rendered sanitized HTML (XSS safe) | Sanitize raw HTML inputs to prevent XSS attacks | `ORIGINAL_REQUEST.md` R3 |
| 15 | Task Management | Subtask Checklist Management | Interactive checklist inside tasks: add item, toggle complete, delete item, progress calculation | Subtask title, checkbox toggle, delete click | Subtask completed boolean updated, progress bar updated | Disallow empty subtask title | `ORIGINAL_REQUEST.md` R3 |
| 16 | Task Management | Task Duplication | Clone an existing task with identical attributes, appending '(Copia)' to title | Click 'Duplicate' action on card or modal | New task created with fresh UUID and current timestamp | Show success notification toast | `ORIGINAL_REQUEST.md` R3 |
| 17 | Task Management | Task Deletion with Confirmation | Remove task from board with optional confirmation and undo snackbar | Click 'Delete' button | Task removed from state, undo toast displayed for 5 seconds | Cancelling via 'Undo' restores task to exact previous position | `ORIGINAL_REQUEST.md` R3 |
| 18 | Task Management | Tags & Categories with Color Codes | Assign colored category tags to tasks (e.g., 'Trabajo', 'Salud', 'Estudio') | Tag selection or new tag creation (name, hex color) | Tag pills rendered on card and filter bar | Limit max tags per task to 5; trim tag name | `ORIGINAL_REQUEST.md` R3 |
| 19 | Task Management | Real-time Search & Filter | Filter board by keyword query, priority, tag, or due date status | Search string in search input, filter pills | Visible tasks dynamically filtered without altering persisted state | 'No tasks match your filter' empty state shown | `ORIGINAL_REQUEST.md` R3 |
| 20 | Metrics Engine | Real-Time Productivity Metrics | Compute completion % for Today and Week, overdue count, priority breakdown, and streak | Current `tasks` array, current system date | KPI summary cards rendered at top of dashboard | Division by zero avoided (displays 0% when total tasks = 0) | `ORIGINAL_REQUEST.md` R3 |
| 21 | Metrics Engine | Overdue Task Detection & Alert | Detect tasks with past due dates in non-completed columns and show visual warning | System clock vs `task.dueDate` | Overdue count badge, red highlight on overdue cards | Ignore completed tasks regardless of original due date | `ORIGINAL_REQUEST.md` R3 |
| 22 | Metrics Engine | Daily Streak & Velocity Tracker | Track consecutive days user completes at least 1 task | Completion events with timestamps | Streak counter badge with fire icon, weekly velocity tally | Streak resets to 1 if >1 day passes without completion | `ORIGINAL_REQUEST.md` R3 |
| 23 | Persistence | Browser Local Storage Sync | Auto-save full application state to `localStorage` whenever tasks or preferences change | State change action | Serialized JSON string saved to `localStorage` key | Catch `QuotaExceededError`, notify user with warning toast | `ORIGINAL_REQUEST.md` R4 |
| 24 | Persistence | Versioned Schema Migration | Check schema version on load and execute sequential migration transforms | Stored raw JSON data | Upgraded state matching current schema version | Corrupt or unparseable JSON falls back to safe recovery / seed reset | `ORIGINAL_REQUEST.md` R4 |
| 25 | Persistence | JSON Backup Export | Export complete dashboard state as a formatted `.json` downloadable file | Click 'Exportar Datos' button | Triggers browser download of `dashboard-backup-YYYY-MM-DD.json` | Disabled if state is empty; notify on browser download error | `ORIGINAL_REQUEST.md` R4 |
| 26 | Persistence | JSON Backup Import & Validation | Upload and validate `.json` backup file, restoring tasks, columns, and tags | File picker selection of `.json` file | State updated, board reloaded, success toast | Rejects invalid JSON structure, shows specific validation errors | `ORIGINAL_REQUEST.md` R4 |
| 27 | Persistence | First-Run Realistic Seed Data | Automatically inject high-value motivating starter data when app is first opened | First page load detection (`localStorage` empty) | Seed tasks, columns, and tags loaded into board | Never overwrites existing user data on subsequent visits | `ORIGINAL_REQUEST.md` R4 |
| 28 | UI/UX Pro Max | Dark Mode & Light Mode Theme Toggle | Seamless theme toggle between dark and light modes with immediate visual update | Click theme toggle button in header | HTML `dark` class toggled, theme saved to storage | Match system preference (`prefers-color-scheme`) if unset | `ORIGINAL_REQUEST.md` R5 |
| 29 | UI/UX Pro Max | Pure Lucide SVG Iconography | Consistent, modern vector iconography without emoji icons | Component render | Lucide SVG icons rendered with crisp scalable paths | Provide aria-hidden and descriptive text for screen readers | `ORIGINAL_REQUEST.md` R5 |
| 30 | UI/UX Pro Max | Micro-Interactions & Transitions | Smooth 150-250ms CSS transitions for hovers, card movement, modal openings | User interactions (hover, click, drag) | Fluid hardware-accelerated animations | Respect `prefers-reduced-motion` media query | `ORIGINAL_REQUEST.md` R5 |
| 31 | UI/UX Pro Max | Fully Responsive Mobile/Desktop | Adaptive layouts for mobile (375px), tablet (768px), and desktop (1024px+) | Viewport resize | Mobile bottom sheet / tabs; desktop multi-column board | Prevent horizontal page scroll; horizontal scroll for Kanban columns | `ORIGINAL_REQUEST.md` R5 |
| 32 | UI/UX Pro Max | Keyboard Accessibility & Navigation | Accessible keyboard navigation for cards, modals, and column movement | Tab, Escape, Enter, Arrow keys | Focus outlines (WCAG AAA compliant), modal trap focus | Escape closes modal without saving changes | `ORIGINAL_REQUEST.md` R5 |

---

## 4. Edge Cases & Boundary Conditions

| # | Feature | Input / Trigger | Observed / Expected Behavior |
|---|---------|-----------------|-----------------------------|
| 1 | Horizon Linking | Attempt to set a task's `parentTaskId` to itself | Validation rejects circular link; dropdown excludes self and existing descendants |
| 2 | Horizon Linking | Attempt to set a `monthly` task's `parentTaskId` to a `daily` task | Downward or inverted linking prohibited; UI only displays valid higher-horizon parents |
| 3 | Horizon Linking | Parent task is deleted while child tasks exist | Child tasks are preserved intact; their `parentTaskId` is safely set to `null` |
| 4 | Drag-and-Drop | Card is dragged and released outside of any valid column droppable area | Card smoothly snaps back to its original slot; state and order remain unchanged |
| 5 | Drag-and-Drop | Dragging cards in an empty column | Drop zone expands to accept drag events with clear visual placeholder highlight |
| 6 | Drag-and-Drop | Rapid multiple drags before state finishes updating | Optimistic state update with debounced persistence prevents race conditions |
| 7 | Column Management | User attempts to delete mandatory column ('To Do', 'In Progress', 'Done') | Delete button is disabled or action blocked with message "Las columnas por defecto no se pueden eliminar" |
| 8 | Column Management | User deletes a custom column containing 10 active tasks | Modal prompts user to select a destination column (e.g., 'To Do'); all tasks migrate before column deletion |
| 9 | Column WIP Limits | Dragging a card into a column that has reached its WIP limit | Card is accepted but column header displays amber/red warning badge indicator (soft limit) |
| 10 | Task Form | Task title consists solely of whitespace (e.g. `"   "`) | Form blocks submission with inline error "El título de la tarea no puede estar vacío" |
| 11 | Task Form | Task title exceeds 250 characters | Input clamped or validated with character counter alert "Máximo 250 caracteres" |
| 12 | Task Form | Markdown description contains malicious `<script>` or `<img>` onload tags | Markdown renderer sanitizes input (DOMPurify or secure AST parsing) preventing script execution |
| 13 | Subtask Checklist | All subtasks of a task are checked off in 'In Progress' column | Task subtask badge displays "3/3 (100%)"; optional prompt/toast asking if user wants to move task to 'Done' |
| 14 | Subtask Checklist | Subtask checklist has 0 items | Card hides subtask progress bar cleanly to maintain compact visual design |
| 15 | Subtask Checklist | Subtask title is empty string | Adding subtask requires non-empty string; empty submissions ignored |
| 16 | Due Dates | Task due date is set to yesterday (`dueDate < today`) in 'To Do' column | Card displays prominent red badge "Vencida", increments dashboard `overdueCount` metric |
| 17 | Due Dates | Task due date was yesterday, but card is moved to 'Done' column | Task loses overdue alert styling; does not increment `overdueCount` metric |
| 18 | Due Dates | Leap year date selected (`2028-02-29`) or year boundary (`2026-12-31`) | Date parsing safely handles UTC date boundaries without off-by-one day display shifts |
| 19 | Storage Persistence | Browser `localStorage` quota exceeded (`QuotaExceededError`) | App catches exception, alerts user with action to export JSON backup or clear old completed tasks |
| 20 | Storage Persistence | `localStorage` contains corrupted or unparseable JSON string | Parser catches syntax error, backs up corrupted string to recovery key, initializes clean state with seed data |
| 21 | Storage Persistence | Stored state has missing fields from an older schema version | Migration pipeline detects `schemaVersion < CURRENT_SCHEMA_VERSION`, applies default values without crashing |
| 22 | JSON Import | User uploads a file with `.txt` extension or invalid JSON syntax | File reader errors, shows toast "El archivo seleccionado no es un JSON válido" |
| 23 | JSON Import | Uploaded JSON is valid JSON but lacks required fields (`tasks`, `columns`) | Schema validator rejects payload with specific error "El archivo no contiene la estructura esperada de tareas" |
| 24 | JSON Import | Uploaded JSON contains 5,000 tasks (extreme size) | Parsing completes, UI handles task list efficiently without freezing main thread |
| 25 | Metrics Engine | User has 0 total tasks in 'Today' horizon | Completion percentage calculation checks `total === 0 ? 0 : (completed / total) * 100` avoiding `NaN%` |
| 26 | Metrics Engine | User completes 5 tasks today, then moves 1 task back to 'In Progress' | Real-time metric immediately re-evaluates down from 100% to 80% without page reload |
| 27 | Streak Engine | User completes tasks on Friday and Monday (skipping weekend) | Streak calculation detects gap > 1 calendar day, resets current streak to 1 |
| 28 | Dark Mode | User toggles dark mode with open modal or active drag operation | Colors update instantly across all active portal elements without unmounting or resetting drag state |
| 29 | Mobile Responsiveness | Screen width is 375px (iPhone SE); 3 Kanban columns exceed screen width | Columns arrange with smooth horizontal scroll snap or segmented tab switcher; no clipped buttons |
| 30 | Accessibility | User navigates board using only keyboard Tab and Enter keys | Focus indicator clearly visible on active card; Enter opens details modal; Escape closes it |

---

## 5. Detailed Functional Specifications & Business Rules

### 5.1 Temporal Horizon Planning Engine (R1)

#### Horizon Concept & Granularity
1. **Monthly Horizon (`monthly`)**:
   - Focus: Macro objectives, milestones, strategic outcomes.
   - Example: *"Lanzar MVP del Dashboard Personal"*, *"Aprender patrones avanzados de React & TypeScript"*.
   - Target Quantity: 3–7 macro items per month.
   - Display: Broad horizon card with milestone tag, progress bar summarizing connected weekly priorities.
2. **Weekly Horizon (`weekly`)**:
   - Focus: Mid-level commitments and deliverables for the current calendar week (Monday–Sunday).
   - Example: *"Diseñar tablero Kanban interactivo con Drag and Drop"*, *"Configurar persistencia y pruebas unitarias"*.
   - Target Quantity: 5–12 items per week.
   - Display: Sprint card with link to monthly parent goal and rollup progress of connected daily tasks.
3. **Daily Horizon (`daily`)**:
   - Focus: Tactical execution for "Hoy" (Today).
   - Example: *"Implementar modal de creación de tareas"*, *"Escribir pruebas para el motor de métricas"*.
   - Target Quantity: 3–8 high-impact items per day.
   - Display: Actionable card with checkoff toggle, due date pill, subtask checklist.

#### Cross-Horizon Association Rules
- A task can have zero or one `parentTaskId`.
- Validation matrix for `parentTaskId`:
  - `task.horizon === 'daily'` $\rightarrow$ `parent.horizon` must be `'weekly'` or `'monthly'`.
  - `task.horizon === 'weekly'` $\rightarrow$ `parent.horizon` must be `'monthly'`.
  - `task.horizon === 'monthly'` $\rightarrow$ `parentTaskId` must be `null`.
- When rendering a parent task, a badge displays: `"Contribución: X/Y tareas hijas completadas (Z%)"`.

---

### 5.2 Kanban Board & Interaction Engine (R2)

#### Drag-and-Drop Architecture
- Drag-and-drop operations must support:
  1. **Cross-Column Dragging**: Moving card from Column A to Column B.
     - Updates `task.columnId = targetColumnId`.
     - Recalculates `task.completedAt`: if target column has `isCompletedColumn: true`, sets `task.completedAt = new Date().toISOString()`; if moved out of completed column, sets `task.completedAt = null`.
  2. **In-Column Reordering**: Moving card up or down inside the same column.
     - Adjusts `task.order` values so that order indices are contiguous integers $0, 1, 2, \dots, N-1$.
  3. **Visual Feedback**:
     - Dragged item exhibits elevation (`shadow-2xl`), slight rotation (`rotate-2`), and reduced opacity (`opacity-90`).
     - Drop target column highlights with an accent border and subtle background tint.
     - Drop indicator placeholder bar shows exact insertion point.
     - Transitions between 150ms and 200ms with zero cumulative layout shift (CLS = 0).

#### Column Customization
- Built-in columns: `todo`, `in-progress`, `done`. Cannot be deleted to ensure system integrity.
- Custom columns can be created with:
  - Name (1–30 characters).
  - Color accent (chosen from a palette of 8 presets: Slate, Blue, Violet, Amber, Emerald, Rose, Cyan, Indigo).
  - Optional WIP limit (1–99). If number of tasks exceeds limit, column header shows warning pill `"WIP: 6/5"`.
- Custom column deletion requires confirmation. If column contains tasks, user selects which existing column receives the tasks before deletion proceeds.

---

### 5.3 Task Lifecycle & Rich Management (R3)

#### Task State Machine
```
[ New / Created ]
       │
       ▼
  ┌─────────┐      Drag / Select      ┌─────────────┐
  │  To Do  │ ──────────────────────> │ In Progress │
  └─────────┘ <────────────────────── └─────────────┘
       │                                     │
       │ Drag / Select         Drag / Select │
       ▼                                     ▼
  ┌─────────────────────────────────────────────────┐
  │                      Done                       │
  │   (sets completedAt, triggers streak engine)    │
  └─────────────────────────────────────────────────┘
```

#### Task Properties & Validation Constraints
- `id`: Non-empty string (UUID v4 format).
- `title`: String, trimmed length between 1 and 250 characters. Empty titles rejected.
- `description`: String, up to 10,000 characters. Sanitized Markdown rendering supporting:
  - Headings (`#`, `##`, `###`)
  - Bold (`**text**`), Italics (`*text*`), Strikethrough (`~~text~~`)
  - Bulleted (`- item`) and numbered (`1. item`) lists
  - Inline code (`` `code` ``) and code blocks (```` ```js ````)
  - Links (`[title](url)`) with `rel="noopener noreferrer"` and `target="_blank"`
- `priority`: One of `'high'`, `'medium'`, `'low'`. Defaults to `'medium'`.
- `dueDate`: Format `'YYYY-MM-DD'` or `null`. Timezone handling: parsed in local timezone to prevent date shifts.
- `tags`: Array of up to 5 tag IDs/names.
- `subtasks`: Array of checklist items. Each subtask:
  - `id`: Unique string.
  - `title`: Trimmed string, 1–200 characters.
  - `completed`: Boolean.
  - `order`: Integer.

---

### 5.4 Productivity Metrics Calculation Engine (R3)

#### Mathematical Formulations

1. **Daily Completion Rate**:
   $$\text{DailyRate} = \begin{cases} 0 & \text{if } N_{\text{daily, total}} = 0 \\ \operatorname{round}\left(\frac{N_{\text{daily, completed}}}{N_{\text{daily, total}}} \times 100\right) & \text{otherwise} \end{cases}$$
   Where $N_{\text{daily, total}}$ is the count of tasks with `horizon === 'daily'`, and $N_{\text{daily, completed}}$ is the count of daily tasks where `column.isCompletedColumn === true`.

2. **Weekly Completion Rate**:
   $$\text{WeeklyRate} = \begin{cases} 0 & \text{if } N_{\text{weekly, total}} = 0 \\ \operatorname{round}\left(\frac{N_{\text{weekly, completed}}}{N_{\text{weekly, total}}} \times 100\right) & \text{otherwise} \end{cases}$$

3. **Overdue Task Count**:
   $$\text{OverdueCount} = \left| \{ t \in \text{Tasks} \mid t.\text{dueDate} < \text{todayDateString} \land \neg \text{isCompleted}(t) \} \right|$$
   A task with `dueDate === null` is never overdue.

4. **Streak Calculation**:
   - Consecutive days where at least 1 task was marked completed.
   - If user completed a task today $\rightarrow$ `currentStreak` active.
   - If user completed a task yesterday and none yet today $\rightarrow$ `currentStreak` preserved awaiting today's completion.
   - If last completion date is prior to yesterday $\rightarrow$ `currentStreak = 0`.

---

### 5.5 Persistence, Schema Migration & Backup Engine (R4)

#### Storage Operations
1. **Save Operation**:
   - State is serialized with `JSON.stringify()`.
   - Saved to `localStorage.setItem('personal_dashboard_state_v1', serializedData)`.
   - Debounced by 200ms to avoid excessive disk I/O during typing, or synchronous on drag-drop completion.
2. **Load Operation**:
   - Reads `localStorage.getItem('personal_dashboard_state_v1')`.
   - If null $\rightarrow$ initialize with Seed Data.
   - If parse error $\rightarrow$ log error, preserve raw data in backup key, initialize Seed Data.
   - If valid $\rightarrow$ pass through `runMigrations(data)`.

#### Migration Pipeline
```typescript
export function runMigrations(rawData: any): DashboardAppState {
  let currentData = rawData;

  // If unversioned, wrap in version 1
  if (!currentData.schemaVersion) {
    currentData.schemaVersion = 1;
  }

  // Version 1 validation & backfilling
  if (currentData.schemaVersion === 1) {
    currentData.tasks = Array.isArray(currentData.tasks) ? currentData.tasks.map(backfillTaskDefaults) : [];
    currentData.columns = Array.isArray(currentData.columns) ? currentData.columns : defaultColumns;
    currentData.tags = Array.isArray(currentData.tags) ? currentData.tags : defaultTags;
    currentData.preferences = {
      theme: currentData.preferences?.theme || 'system',
      activeHorizonFilter: currentData.preferences?.activeHorizonFilter || 'all',
      soundEnabled: currentData.preferences?.soundEnabled ?? false,
      collapseCompletedColumns: currentData.preferences?.collapseCompletedColumns ?? false,
    };
    currentData.streakMetadata = currentData.streakMetadata || {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
  }

  return currentData as DashboardAppState;
}

function backfillTaskDefaults(task: any): Task {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || 'Tarea sin título',
    description: task.description || '',
    horizon: ['monthly', 'weekly', 'daily'].includes(task.horizon) ? task.horizon : 'daily',
    parentTaskId: task.parentTaskId || null,
    columnId: task.columnId || 'todo',
    priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
    dueDate: task.dueDate || null,
    dueTime: task.dueTime || null,
    tags: Array.isArray(task.tags) ? task.tags : [],
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map((st: any, idx: number) => ({
      id: st.id || crypto.randomUUID(),
      title: st.title || 'Subtarea',
      completed: Boolean(st.completed),
      order: typeof st.order === 'number' ? st.order : idx,
      createdAt: st.createdAt || new Date().toISOString(),
    })) : [],
    order: typeof task.order === 'number' ? task.order : 0,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
  };
}
```

#### JSON Export & Import Format
- **Export Trigger**: Clicking "Exportar Copia de Seguridad" generates a JSON blob:
  ```json
  {
    "app": "PersonalDashboard",
    "schemaVersion": 1,
    "exportedAt": "2026-10-12T17:00:00.000Z",
    "data": { ...DashboardAppState }
  }
  ```
  Initiates download of filename: `personal-dashboard-backup-YYYY-MM-DD.json`.
- **Import Validation**:
  1. Verifies JSON syntax with `JSON.parse()`.
  2. Verifies root object is non-null.
  3. Verifies `app === "PersonalDashboard"` or presence of `data.tasks` / `tasks`.
  4. Runs through `runMigrations()`.
  5. Asks user confirmation: *"¿Deseas restaurar la copia de seguridad? Se reemplazarán tus datos actuales por X tareas y Y columnas."*
  6. Upon confirmation, saves to `localStorage`, updates React state, and displays success toast.

---

## 6. Motivating Seed Data Specification

The initial dataset must be realistic, motivating, structured across all 3 horizons, and populate all 3 Kanban columns so that the user immediately sees the power of the application on first launch.

```json
{
  "columns": [
    {
      "id": "todo",
      "name": "Por hacer",
      "order": 0,
      "colorAccent": "#64748B",
      "wipLimit": null,
      "isCompletedColumn": false,
      "isDefault": true
    },
    {
      "id": "in-progress",
      "name": "En progreso",
      "order": 1,
      "colorAccent": "#2563EB",
      "wipLimit": 5,
      "isCompletedColumn": false,
      "isDefault": true
    },
    {
      "id": "done",
      "name": "Completado",
      "order": 2,
      "colorAccent": "#10B981",
      "wipLimit": null,
      "isCompletedColumn": true,
      "isDefault": true
    }
  ],
  "tags": [
    { "id": "tag-frontend", "name": "Frontend", "color": "#2563EB" },
    { "id": "tag-arquitectura", "name": "Arquitectura", "color": "#7C3AED" },
    { "id": "tag-personal", "name": "Personal", "color": "#059669" },
    { "id": "tag-aprendizaje", "name": "Aprendizaje", "color": "#D97706" }
  ],
  "tasks": [
    {
      "id": "task-m1",
      "title": "Lanzar MVP del Dashboard Personal Productivo",
      "description": "## Objetivo Macro del Mes\nDesplegar la primera versión funcional del dashboard personal con planificación tri-horizonte y tablero Kanban interactivo.\n\n### Criterios de Éxito\n- Arquitectura React 18 + Vite limpia y modular.\n- Soporte para drag & drop sin layout shift.\n- Cobertura de pruebas unitarias superior al 85%.",
      "horizon": "monthly",
      "parentTaskId": null,
      "columnId": "in-progress",
      "priority": "high",
      "dueDate": "2026-10-31",
      "dueTime": null,
      "tags": ["Frontend", "Arquitectura"],
      "subtasks": [
        { "id": "st-m1-1", "title": "Definir especificación y modelos de dominio", "completed": true, "order": 0, "createdAt": "2026-10-12T10:00:00Z" },
        { "id": "st-m1-2", "title": "Implementar componentes de tablero y vistas", "completed": true, "order": 1, "createdAt": "2026-10-12T10:00:00Z" },
        { "id": "st-m1-3", "title": "Validar pruebas unitarias y empaquetado", "completed": false, "order": 2, "createdAt": "2026-10-12T10:00:00Z" }
      ],
      "order": 0,
      "createdAt": "2026-10-01T09:00:00Z",
      "updatedAt": "2026-10-12T16:00:00Z",
      "completedAt": null
    },
    {
      "id": "task-m2",
      "title": "Dominar Patrones Avanzados de TypeScript y React",
      "description": "## Plan de Aprendizaje Mensual\nCompletar lectura técnica y ejercicios prácticos sobre tipado estricto, genéricos y máquinas de estado en React.",
      "horizon": "monthly",
      "parentTaskId": null,
      "columnId": "todo",
      "priority": "medium",
      "dueDate": "2026-10-30",
      "dueTime": null,
      "tags": ["Aprendizaje"],
      "subtasks": [
        { "id": "st-m2-1", "title": "Estudiar discriminación de uniones y tipos condicionales", "completed": true, "order": 0, "createdAt": "2026-10-05T10:00:00Z" },
        { "id": "st-m2-2", "title": "Aplicar genéricos a componentes de listas y tablas", "completed": false, "order": 1, "createdAt": "2026-10-05T10:00:00Z" }
      ],
      "order": 1,
      "createdAt": "2026-10-02T10:00:00Z",
      "updatedAt": "2026-10-08T11:00:00Z",
      "completedAt": null
    },
    {
      "id": "task-w1",
      "title": "Construir Tablero Kanban con Drag-and-Drop Fluido",
      "description": "### Compromiso Semanal\nImplementar las columnas interactivas, reordenamiento vertical y movimiento horizontal de tarjetas con feedback visual optimizado.",
      "horizon": "weekly",
      "parentTaskId": "task-m1",
      "columnId": "in-progress",
      "priority": "high",
      "dueDate": "2026-10-18",
      "dueTime": null,
      "tags": ["Frontend"],
      "subtasks": [
        { "id": "st-w1-1", "title": "Configurar columnas por defecto y estilos Tailwind", "completed": true, "order": 0, "createdAt": "2026-10-12T11:00:00Z" },
        { "id": "st-w1-2", "title": "Integrar gestores de eventos pointer/drag", "completed": false, "order": 1, "createdAt": "2026-10-12T11:00:00Z" },
        { "id": "st-w1-3", "title": "Verificar accesibilidad por teclado", "completed": false, "order": 2, "createdAt": "2026-10-12T11:00:00Z" }
      ],
      "order": 0,
      "createdAt": "2026-10-12T08:00:00Z",
      "updatedAt": "2026-10-12T15:30:00Z",
      "completedAt": null
    },
    {
      "id": "task-w2",
      "title": "Implementar Motor de Persistencia y Migraciones",
      "description": "Asegurar sincronización automática en localStorage, serialización robusta y utilidades de importación/exportación JSON.",
      "horizon": "weekly",
      "parentTaskId": "task-m1",
      "columnId": "todo",
      "priority": "medium",
      "dueDate": "2026-10-19",
      "dueTime": null,
      "tags": ["Arquitectura"],
      "subtasks": [],
      "order": 1,
      "createdAt": "2026-10-12T08:30:00Z",
      "updatedAt": "2026-10-12T08:30:00Z",
      "completedAt": null
    },
    {
      "id": "task-d1",
      "title": "Diseñar Modal de Creación y Edición de Tareas",
      "description": "### Foco Crítico de Hoy\nCrear el formulario accesible con campos para título, descripción Markdown, selector de horizonte, fecha límite y gestión de subtareas dinámicas.",
      "horizon": "daily",
      "parentTaskId": "task-w1",
      "columnId": "in-progress",
      "priority": "high",
      "dueDate": "2026-10-12",
      "dueTime": "18:00",
      "tags": ["Frontend"],
      "subtasks": [
        { "id": "st-d1-1", "title": "Maquetar campos accesibles con Tailwind", "completed": true, "order": 0, "createdAt": "2026-10-12T12:00:00Z" },
        { "id": "st-d1-2", "title": "Añadir vista previa de Markdown", "completed": false, "order": 1, "createdAt": "2026-10-12T12:00:00Z" },
        { "id": "st-d1-3", "title": "Validación de longitud de título y fechas", "completed": false, "order": 2, "createdAt": "2026-10-12T12:00:00Z" }
      ],
      "order": 0,
      "createdAt": "2026-10-12T09:00:00Z",
      "updatedAt": "2026-10-12T14:00:00Z",
      "completedAt": null
    },
    {
      "id": "task-d2",
      "title": "Configurar Paleta de Colores y Modo Oscuro",
      "description": "Asegurar contraste WCAG AAA con la paleta Slate/Zinc y acento Azul Real (`#2563EB`).",
      "horizon": "daily",
      "parentTaskId": "task-w1",
      "columnId": "done",
      "priority": "medium",
      "dueDate": "2026-10-12",
      "dueTime": null,
      "tags": ["Frontend"],
      "subtasks": [
        { "id": "st-d2-1", "title": "Definir tokens de colores en Tailwind config", "completed": true, "order": 0, "createdAt": "2026-10-12T09:30:00Z" },
        { "id": "st-d2-2", "title": "Implementar hook useTheme persistente", "completed": true, "order": 1, "createdAt": "2026-10-12T09:30:00Z" }
      ],
      "order": 0,
      "createdAt": "2026-10-12T09:15:00Z",
      "updatedAt": "2026-10-12T13:00:00Z",
      "completedAt": "2026-10-12T13:00:00Z"
    },
    {
      "id": "task-d3",
      "title": "Escribir Pruebas Unitarias para el Motor de Métricas",
      "description": "Validar cálculo exacto de porcentajes completados, detección de vencidas y gestión de racha.",
      "horizon": "daily",
      "parentTaskId": "task-w1",
      "columnId": "todo",
      "priority": "low",
      "dueDate": "2026-10-13",
      "dueTime": null,
      "tags": ["Arquitectura"],
      "subtasks": [],
      "order": 1,
      "createdAt": "2026-10-12T10:00:00Z",
      "updatedAt": "2026-10-12T10:00:00Z",
      "completedAt": null
    }
  ]
}
```

---

## 7. Verification Matrix & Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Concrete Verification Assertion |
|-------------|---------------------|---------------------------------|
| **R1. Horizontes Temporales** | Vistas y filtrado por horizonte funcional | `filterTasksByHorizon(tasks, 'daily')` devuelve exactamente las tareas diarias; `task.parentTaskId` resuelve al id de la meta semanal/mensual correspondiente. |
| **R2. Tablero Kanban DnD** | Arrastrar y soltar entre columnas y reordenamiento | `moveTask(taskId, targetColumnId, newOrder)` actualiza el `columnId`, recalcula `order` contiguous y actualiza `completedAt` si la columna es de tipo `done`. |
| **R3. Gestión de Tareas** | CRUD completo, Markdown y Subtareas | `createTask()`, `updateTask()`, `deleteTask()`, `duplicateTask()` producen mutaciones inmutables válidas; `subtasks.every(s => s.completed)` refleja progreso 100%. |
| **R3. Métricas** | Porcentajes, vencidas y racha | `calculateMetrics(tasks, today)` calcula `dailyCompletionRate`, `weeklyCompletionRate`, identifica tareas con `dueDate < today` activas, y calcula `streakDays`. |
| **R4. Persistencia** | Sincronización en `localStorage` y migraciones | Al invocar `saveState(state)`, `localStorage.getItem()` contiene JSON serializado con `schemaVersion: 1`; al cargar con esquema previo, `runMigrations()` completa campos faltantes. |
| **R4. Import/Export** | Descarga e importación JSON | `exportData()` genera JSON descargable; `importData(jsonString)` valida esquema y rechaza payloads corruptos con mensaje descriptivo. |
| **R5. UI/UX Pro Max** | Modo oscuro/claro, tipografía y responsive | `toggleTheme()` alterna clase `.dark` en el elemento raíz; cero uso de emojis en iconos (SVGs de Lucide exclusivos); WCAG AAA ratio > 7:1 en textos principales. |
| **Compilación y Tests** | `npm run build` y `npm test` limpios | Compilación sin errores TypeScript (`tsc --noEmit`) y suite de pruebas Vitest pasando al 100%. |

---

## 8. Architectural Recommendations for Implementation Track

1. **State Management**:
   - Recommend a centralized custom hook or Zustand/React Context (`DashboardProvider`) handling immutable state updates and wrapping `localStorage` auto-persistence with debouncing.
2. **Drag-and-Drop Library**:
   - Recommend `@hello-pangea/dnd` (actively maintained fork of `react-beautiful-dnd`) or `@dnd-kit/core` for accessibility, keyboard navigation, and seamless mobile touch support.
3. **Markdown Rendering**:
   - Recommend `react-markdown` with `remark-gfm` for tables/checklists and custom Tailwind typography styles (`prose prose-slate dark:prose-invert`).
4. **Icons**:
   - `lucide-react` for all iconography. Strictly avoid emoji icons in UI buttons, badges, and headers.
5. **Testing Framework**:
   - `vitest` + `@testing-library/react` + `@testing-library/user-event` for rapid, reliable unit and integration testing.

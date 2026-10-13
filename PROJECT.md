# Project: Personal Dashboard

## Architecture

### System Overview
The Personal Dashboard is a modern, responsive single-page web application engineered with **React 18+**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Lucide React**. It provides full temporal horizon planning (Monthly, Weekly, Daily), an interactive Kanban board with fluid drag-and-drop, rich task management, real-time productivity analytics, robust browser-local persistence with schema versioning and JSON backup/restore, and a dark/light mode UI/UX Pro Max aesthetic.

### Data Flow & State Architecture
1. **Separation of Contexts**: 
   - `TaskStateContext`: Supplies readonly access to `state: DashboardAppState` (tasks, columns, selectedHorizon, filterQuery, activeTheme).
   - `TaskDispatchContext`: Supplies the dispatch function for `TaskAction` (pure actions handled by `taskReducer.ts`).
2. **Persistence Middleware**:
   - `useDashboardPersistence`: Subscribes to state updates with debounced writes to `localStorage` under `personal_dashboard_state_v1`.
   - Listens to window `storage` events to synchronize state seamlessly across multiple browser tabs.
   - Includes schema validation and automated migrations (`migrateState`) on startup, with graceful fallback to seed data on irrecoverable corruption.
3. **Data Hierarchy & Cross-Horizon Linking**:
   - Monthly Goals $\leftarrow$ Weekly Commitments $\leftarrow$ Daily Tasks.
   - Linked via `parentTaskId`. Child completion dynamically calculates parent progress rollup.
4. **Drag and Drop Mechanics**:
   - Utilizes `@hello-pangea/dnd` for 60 FPS physics-based FLIP animations, touch-screen compatibility, keyboard accessibility, and zero layout shift.
   - Updates contiguous zero-based `order` indices and transitions tasks between status columns.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Scaffolding & Build System | Vite 5 + React 18 + TypeScript + Tailwind CSS setup with production build and zero errors | M1 | ORIGINAL_REQUEST §R5 |
| 2 | Theme Provider (Dark/Light) | Native dark/light mode toggle with persistence in localStorage and class-based DOM styling | M1 | ORIGINAL_REQUEST §R5 |
| 3 | Typography & Design Tokens | Slate/Zinc palette, #2563EB Royal Blue accent, Plus Jakarta Sans typography, WCAG AAA contrast | M1 | ORIGINAL_REQUEST §R5, ui-ux-pro-max |
| 4 | Lucide Icon System | Consistent SVG iconography throughout the app without any emoji iconography | M1 | ORIGINAL_REQUEST §R5 |
| 5 | Domain Type Definitions | TypeScript interfaces for Task, Column, Horizon, Tag, Subtask, Metrics, and DashboardAppState | M1 | Spec Miner §Domain Models |
| 6 | Seed Data Initialization | Curated, realistic seed dataset spanning all 3 horizons and 3 default Kanban columns | M1 | ORIGINAL_REQUEST §R4 |
| 7 | Pure State Reducer | Comprehensive reducer handling all task actions (add, edit, remove, duplicate, move, toggle) | M1 | Arch Explorer §State |
| 8 | Local Storage Persistence | Robust localStorage persistence under versioned key with QuotaExceededError protection | M2 | ORIGINAL_REQUEST §R4 |
| 9 | Schema Versioning & Migrations | Versioned storage schema (`CURRENT_SCHEMA_VERSION = 1`) with automated schema migration pipeline | M2 | ORIGINAL_REQUEST §R4 |
| 10 | Multi-Tab Storage Sync | Window `storage` event listener ensuring real-time synchronization across browser tabs | M2 | Arch Explorer §Persistence |
| 11 | JSON Data Export | Download sanitized, schema-validated `.json` backup file of user tasks, columns, and settings | M2 | ORIGINAL_REQUEST §R4 |
| 12 | JSON Data Import & Validation | File upload parser validating schema structure with preview and safe state replacement | M2 | ORIGINAL_REQUEST §R4 |
| 13 | Reset to Seed Data | Destructive action resetting current state back to curated starter seed data with confirmation | M2 | ORIGINAL_REQUEST §R4 |
| 14 | Temporal Horizons (Monthly) | Dedicated view for high-level monthly goals and milestone tracking with progress rollup | M3 | ORIGINAL_REQUEST §R1 |
| 15 | Temporal Horizons (Weekly) | Dedicated view for weekly commitments and operational priorities breakdown | M3 | ORIGINAL_REQUEST §R1 |
| 16 | Temporal Horizons (Daily) | Dedicated view for daily critical focus ("Today") tasks | M3 | ORIGINAL_REQUEST §R1 |
| 17 | Cross-Horizon Task Linking | Linking daily tasks to weekly/monthly parents with circular dependency prevention and progress rollup | M3 | ORIGINAL_REQUEST §R1 |
| 18 | Horizon Filter & Navigation | Segmented horizon selector in top bar allowing filtering or viewing all horizons | M3 | ORIGINAL_REQUEST §R1 |
| 19 | Productivity Metrics Engine | Calculation of completion rates (today/week), overdue counts, priority distributions, streaks | M3 | ORIGINAL_REQUEST §R3 |
| 20 | Bento Grid Metrics Ribbon | Responsive dashboard cards displaying real-time productivity statistics and visual indicators | M3 | ORIGINAL_REQUEST §R3, ui-ux-pro-max |
| 21 | Kanban Board Layout | Multi-column board (To Do, In Progress, Done) with column badges, count pills, and WIP limits | M4 | ORIGINAL_REQUEST §R2 |
| 22 | Drag-and-Drop Column Reorder | Moving task cards smoothly between columns with instant columnId and order update | M4 | ORIGINAL_REQUEST §R2 |
| 23 | Intra-Column Task Reorder | Reordering tasks within the same column updating zero-indexed contiguous order values | M4 | ORIGINAL_REQUEST §R2 |
| 24 | Kanban Card Component | Compact card displaying title, priority badge, due date status, horizon chip, and subtask progress bar | M4 | ORIGINAL_REQUEST §R2 |
| 25 | Task Creation & Quick Add | Inline quick-add or modal creation of tasks with title, horizon, column, and priority | M4 | ORIGINAL_REQUEST §R3 |
| 26 | Task Detail Modal / Slide Drawer | Comprehensive drawer with title editing, markdown description viewer/editor, due date, tags, and parent | M4 | ORIGINAL_REQUEST §R3 |
| 27 | Subtask Checklist Management | Interactive checklist inside tasks with progress percentage calculation and completion toggle | M4 | ORIGINAL_REQUEST §R3 |
| 28 | Color-Coded Tags System | Creation and selection of custom color-coded category tags with accessible text contrast | M4 | ORIGINAL_REQUEST §R3 |
| 29 | Task Duplication & Deletion | Cloning tasks with reset identifiers and safe deletion with confirmation | M4 | ORIGINAL_REQUEST §R3 |
| 30 | Column Customization | Renaming columns, adding new columns, and reordering columns | M4 | ORIGINAL_REQUEST §R2 |
| 31 | Empty States & Micro-Interactions | Polished empty state graphics, hover elevations, focus rings, and responsive mobile carousel | M4 | ORIGINAL_REQUEST §R5, ui-ux-pro-max |
| 32 | Full End-to-End Test Suite Pass | 100% pass on all 4 Tiers of opaque-box requirement tests and Tier 5 adversarial hardening | M5 | ORIGINAL_REQUEST Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Scaffolding, Theme & Domain Reducer | Vite + React 18 + TS + Tailwind config, Lucide icons, Dark/Light theme, Plus Jakarta Sans font, Domain types, Task reducer, Seed data, Initial unit tests | none | DONE |
| M2 | Local Persistence, Migration & Data Backup | LocalStorage service, schema versioning, migration engine, multi-tab sync, JSON export/import validator, Reset seed dialog, Persistence unit tests | M1 | DONE |
| M3 | Temporal Horizons & Productivity Metrics | Horizon views (Monthly, Weekly, Daily), Cross-horizon linking & progress rollup, Horizon navigation filter, Metrics calculation engine & Bento ribbon | M1 | DONE |
| M4 | Interactive Kanban Board, DnD & Task Drawer | Kanban board layout, @hello-pangea/dnd drag & drop, Kanban cards, Task slide-over drawer, Subtask checklist, Markdown description, Tags, Empty states, Mobile carousel | M1, M2, M3 | DONE |
| M5 | E2E Test Suite Pass & Adversarial Hardening | Phase 1: Pass 100% of E2E tests (Tiers 1-4). Phase 2: Adversarial Coverage Hardening (Tier 5) with Challenger stress testing | M1, M2, M3, M4, TEST_READY | DONE |

---

## Interface Contracts

### Domain Types (`src/types/domain.ts`)
```typescript
export type Horizon = 'monthly' | 'weekly' | 'daily';
export type Priority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color token or hex
}

export interface Task {
  id: string;
  title: string;
  description: string; // Markdown text
  horizon: Horizon;
  columnId: string;
  priority: Priority;
  dueDate: string | null; // ISO YYYY-MM-DD
  tags: string[]; // Tag IDs
  subtasks: Subtask[];
  parentTaskId?: string | null; // Linking to higher horizon task
  order: number; // Position in column
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  completedAt?: string | null; // ISO string when moved to done
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  wipLimit?: number | null;
  isCompletedColumn?: boolean;
}

export interface DashboardAppState {
  version: number;
  tasks: Task[];
  columns: KanbanColumn[];
  tags: Tag[];
  selectedHorizon: Horizon | 'all';
  searchQuery: string;
  theme: 'light' | 'dark';
}
```

### Storage Contract (`src/services/storageService.ts`)
```typescript
export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'personal_dashboard_state_v1';

export interface StorageService {
  loadState(): DashboardAppState;
  saveState(state: DashboardAppState): boolean;
  exportJSON(state: DashboardAppState): string;
  importJSON(jsonString: string): { success: boolean; state?: DashboardAppState; error?: string };
  resetToSeed(): DashboardAppState;
}
```

### Metrics Engine Contract (`src/utils/metrics.ts`)
```typescript
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

export function calculateMetrics(tasks: Task[], columns: KanbanColumn[]): ProductivityMetrics;
export function calculateChildProgress(parentId: string, tasks: Task[]): { total: number; completed: number; percent: number };
```

---

## Code Layout

```
.
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── domain.ts
│   ├── constants/
│   │   ├── initialData.ts
│   │   └── theme.ts
│   ├── context/
│   │   ├── TaskContext.tsx
│   │   ├── taskReducer.ts
│   │   └── ThemeContext.tsx
│   ├── services/
│   │   ├── storageService.ts
│   │   └── migrationService.ts
│   ├── utils/
│   │   ├── metrics.ts
│   │   ├── dateUtils.ts
│   │   └── validation.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── HorizonNav.tsx
│   │   │   └── QuickStats.tsx
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   └── TaskCard.tsx
│   │   ├── horizons/
│   │   │   ├── HorizonView.tsx
│   │   │   ├── MonthlyGoals.tsx
│   │   │   └── WeeklyCommitments.tsx
│   │   ├── task/
│   │   │   ├── TaskDrawer.tsx
│   │   │   ├── SubtaskList.tsx
│   │   │   └── TagSelector.tsx
│   │   └── settings/
│   │       ├── DataManagementModal.tsx
│   │       └── ColumnSettingsModal.tsx
│   └── test/
│       ├── setup.ts
│       ├── domain.test.ts
│       ├── reducer.test.ts
│       ├── storage.test.ts
│       ├── metrics.test.ts
│       └── kanban.test.ts
└── tests/
    └── e2e/
        ├── runner.ts
        ├── tier1_features.test.ts
        ├── tier2_boundaries.test.ts
        ├── tier3_pairwise.test.ts
        └── tier4_scenarios.test.ts
```

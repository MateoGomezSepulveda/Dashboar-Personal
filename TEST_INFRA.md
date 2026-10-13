# Test Infrastructure & Methodology Specification (TEST_INFRA.md)
## Personal Dashboard — Opaque-Box E2E Testing Track

**Document Version:** 1.0.0  
**Author:** e2e_test_writer_1 (E2E Testing Track Lead)  
**Date:** 2026-10-12  
**Status:** Approved & Implemented  
**Authoritative Sources:**  
- `.agents/teamwork/ORIGINAL_REQUEST.md` (2026-10-12T16:55:51Z)  
- `PROJECT.md` (Architecture, Milestones, and Interface Contracts)

---

## 1. Dual Track Engineering Architecture

The Personal Dashboard project follows a **Dual Track Engineering** process:
1. **Implementation Track**: Focuses on feature development across milestones M1 (Core & Types), M2 (Persistence & Backup), M3 (Horizons & Metrics), and M4 (Kanban Board & UI/UX).
2. **Testing Track (Lead: e2e_test_writer_1)**: Operates independently to construct an authoritative, opaque-box, requirement-driven test suite before and during implementation.

```
+--------------------------------------------------------------------------+
|                       DUAL TRACK ARCHITECTURE                            |
|                                                                          |
|   SPECIFICATION TRACK (ORIGINAL_REQUEST.md + PROJECT.md)                 |
|            |                                            |                |
|            v                                            v                |
|   TESTING TRACK (e2e_test_writer_1)             IMPLEMENTATION TRACK     |
|   - 4-Tier Test Suite Specification             - M1: Core & Reducer     |
|   - Opaque-Box Test Harness                     - M2: Persistence/Sync   |
|   - Independent Contract Verification           - M3: Horizons & Metrics |
|   - Self-Contained Test Runner                  - M4: Kanban & UI/UX     |
|            \                                            /                |
|             \                                          /                 |
|              v                                        v                  |
|          MILESTONE 5: 100% E2E TEST VERIFICATION & ADVERSARIAL PASS     |
+--------------------------------------------------------------------------+
```

### 1.1 Opaque-Box & Requirement-Driven Philosophy
- **Opaque-Box**: Tests interact strictly with public contracts, domain state transitions, data structures, and observable user outcomes. No testing of private component internals or implementation quirks.
- **Requirement-Driven**: Every assertion traces directly to a numbered requirement in `ORIGINAL_REQUEST.md` (R1-R5) and interface contracts in `PROJECT.md`.
- **Progressive Testability**: Tests validate domain invariants that remain true whether evaluated in unit contexts, integration pipelines, or complete browser sessions.

---

## 2. 4-Tier Test Methodology

The E2E test suite is organized into 4 distinct testing tiers:

```
+-------------------------------------------------------------------------------+
|                           4-TIER TEST METHODOLOGY                             |
+-------------------------------------------------------------------------------+
|  Tier 1: Feature Coverage (30 tests)                                          |
|  - R1: Temporal Horizons (6 tests)                                            |
|  - R2: Interactive Kanban Board (6 tests)                                     |
|  - R3: Task Management & Metrics (6 tests)                                    |
|  - R4: Persistence & Sync (6 tests)                                           |
|  - R5: UI/UX Pro Max Aesthetic (6 tests)                                      |
+-------------------------------------------------------------------------------+
|  Tier 2: Boundary & Corner Cases (25 tests)                                   |
|  - Limits, zero-values, circular links, leap dates, quota errors, corrupt data|
+-------------------------------------------------------------------------------+
|  Tier 3: Cross-Feature Combinations (8 tests)                                 |
|  - Pairwise multi-system interactions (e.g. DnD + Filter + Metrics)           |
+-------------------------------------------------------------------------------+
|  Tier 4: Real-World Multi-Week Scenarios (4 scenarios)                        |
|  - Long-term realistic user workflows spanning multiple planning cycles       |
+-------------------------------------------------------------------------------+
```

### 2.1 Tier 1: Feature Coverage (>=5 per feature across R1-R5)
Validates the primary functional behavior (happy paths and core contracts) for every requirement:
- **R1. Temporal Horizons**:
  - `T1.1`: Create and filter tasks by Monthly horizon.
  - `T1.2`: Create and filter tasks by Weekly horizon.
  - `T1.3`: Create and filter tasks by Daily horizon ("Today").
  - `T1.4`: Cross-horizon hierarchical linking (Daily -> Weekly -> Monthly).
  - `T1.5`: Dynamic child progress rollup on parent task.
  - `T1.6`: All-horizons selector returns unified unfiltered task set.
- **R2. Interactive Kanban Board**:
  - `T1.7`: Board initialization with default columns ('todo', 'in-progress', 'done').
  - `T1.8`: Moving tasks across columns updating `columnId` and `completedAt`.
  - `T1.9`: Intra-column vertical task reordering with contiguous 0-based indexing.
  - `T1.10`: Adding custom columns and column reordering.
  - `T1.11`: Custom column deletion with safe task migration to fallback column.
  - `T1.12`: Default columns ('todo', 'in-progress', 'done') protected from deletion.
- **R3. Task Management & Metrics**:
  - `T1.13`: Task creation with full metadata (markdown description, priority, tags, dates).
  - `T1.14`: Task editing, description updates, and `updatedAt` maintenance.
  - `T1.15`: Task cloning/duplication with fresh UUID and cloned attributes.
  - `T1.16`: Subtask checklist lifecycle and completion percentage calculation.
  - `T1.17`: Real-time productivity metrics calculation (completion rates, overdue, distribution).
  - `T1.18`: Overdue task detection logic (clock vs dueDate in non-done columns).
- **R4. Persistence & Local Sync**:
  - `T1.19`: LocalStorage auto-save and state reload from `personal_dashboard_state_v1`.
  - `T1.20`: First-run realistic seed data initialization on empty storage.
  - `T1.21`: JSON backup export formatting with metadata and schema version.
  - `T1.22`: JSON backup import and schema validation.
  - `T1.23`: Destructive reset to seed data with complete state restoration.
  - `T1.24`: Schema migration pipeline upgrading legacy formats to current version.
- **R5. UI/UX Pro Max Aesthetic**:
  - `T1.25`: Light/Dark theme toggle and persistent preference storage.
  - `T1.26`: Slate/Zinc palette and WCAG AAA contrast ratio tokens (>7:1).
  - `T1.27`: Lucide SVG vector iconography verification (zero emoji icons).
  - `T1.28`: Responsive layout breakpoints (375px mobile, 768px tablet, 1024px desktop).
  - `T1.29`: Keyboard accessibility navigation and focus trap specifications.
  - `T1.30`: Markdown description XSS sanitization and formatting preservation.

### 2.2 Tier 2: Boundary & Corner Cases (>=5 per feature across R1-R5)
Stresses extreme conditions, resource failures, boundary limits, and malformed inputs:
- **R1 Boundaries**:
  - `T2.1`: Circular parent linking prevention (task cannot link to itself).
  - `T2.2`: Inverted hierarchy linking rejection (Monthly cannot link to Daily).
  - `T2.3`: Deep cascade orphan detachment: deleting parent sets children `parentTaskId: null` without data loss.
  - `T2.4`: Resilient handling of non-existent parent ID references.
  - `T2.5`: High-cardinality child progress rollup performance (500 children rollup in <5ms).
- **R2 Boundaries**:
  - `T2.6`: Dragging into an empty column defaults order to 0 without errors.
  - `T2.7`: Out-of-bounds drag release snaps card back to original column and position.
  - `T2.8`: Column WIP limit breach sets warning flag without rejecting placement.
  - `T2.9`: 20 rapid sequential drag operations preserve contiguous zero-based indices.
  - `T2.10`: Duplicate column ID creation is rejected with validation error.
- **R3 Boundaries**:
  - `T2.11`: Empty or whitespace-only task title is rejected.
  - `T2.12`: Title length boundary: 250 characters accepted, 251 rejected or clamped.
  - `T2.13`: Leap year (`2028-02-29`) and year boundary dates parse without day-shifting.
  - `T2.14`: Empty task list metrics calculation avoids `NaN` or `Infinity` (returns 0%).
  - `T2.15`: Subtasks with special characters and empty subtask rejection.
- **R4 Boundaries**:
  - `T2.16`: Malformed/corrupted JSON in `localStorage` is recovered safely via fallback to seed data.
  - `T2.17`: Imported JSON missing mandatory keys (`tasks`, `columns`) rejected with clear error.
  - `T2.18`: Hostile import payload with prototype pollution or non-object structure rejected.
  - `T2.19`: Browser `QuotaExceededError` handled gracefully with error report.
  - `T2.20`: Massive payload import (1,000 tasks) parses cleanly within bounds.
- **R5 Boundaries**:
  - `T2.21`: Corrupted stored theme value defaults safely to `'light'`.
  - `T2.22`: Massive markdown text (50,000 characters) parsed without crash.
  - `T2.23`: Extreme compact viewport (320px) handled without layout breaks.
  - `T2.24`: Escape key cancels modal editing and discards uncommitted changes.
  - `T2.25`: Maximum tags per task constraint (boundary enforcement).

### 2.3 Tier 3: Cross-Feature Combinations (Pairwise Interactions)
Validates complex multi-system interactions where features overlap:
- `T3.1`: Drag-and-drop between columns while filtering by a specific temporal horizon.
- `T3.2`: Deleting parent task that has active subtasks, daily linked tasks, and weekly linked tasks.
- `T3.3`: Toggling theme during JSON state export and backup generation.
- `T3.4`: Moving a daily task linked to a weekly parent into 'Done' updates both daily metrics, parent rollup, and overdue counters.
- `T3.5`: Importing JSON backup while active horizon filter and text search query are engaged.
- `T3.6`: Deleting a custom column containing tasks spanning Monthly, Weekly, and Daily horizons.
- `T3.7`: Duplicating a task containing subtasks, category tags, and cross-horizon parent links.
- `T3.8`: Simultaneous search query, priority filter, and horizon filter combination.

### 2.4 Tier 4: Real-World Multi-Week Scenarios
Executes end-to-end user journeys replicating weeks of sustained productivity:
- `T4.1`: **Full Sprint Lifecycle Scenario**: Month kickoff, macro goal definition, weekly breakdown, daily task scheduling, execution, dynamic rollup, and sprint completion.
- `T4.2`: **Weekly Review & Backlog Grooming**: Carrying over unfinished tasks, pruning stale tasks, reordering column priorities, and refreshing due dates.
- `T4.3`: **Disaster Recovery & Multi-Device Migration**: Rich project setup, JSON backup export, simulated catastrophic storage failure, and full state restoration.
- `T4.4`: **Daily Deep-Work Focus Workflow**: Quick task capture, Markdown elaboration, subtask checklist drill-down, keyboard navigation, and theme adaptation.

---

## 3. Test Runner & Execution Guide

### 3.1 Test Architecture Layout
```
tests/
└── e2e/
    ├── harness.ts             # Universal test harness, contract assertion oracle, & storage mocks
    ├── runner.ts              # Standalone executable test runner with colored terminal reporting
    ├── tier1_features.test.ts # Tier 1: 30 Feature Coverage tests
    ├── tier2_boundaries.test.ts # Tier 2: 25 Boundary & Corner Case tests
    ├── tier3_pairwise.test.ts # Tier 3: 8 Cross-Feature Combination tests
    └── tier4_scenarios.test.ts # Tier 4: 4 Multi-Week Real-World Scenarios
```

### 3.2 Running the Tests
The test suite can be run through two equivalent methods:

#### Method A: Vitest Runner (Standard Project Command)
```bash
npm test -- tests/e2e
# or
npx vitest run tests/e2e
```

#### Method B: Standalone TypeScript / Node Runner (Zero-Dependency)
```bash
npx tsx tests/e2e/runner.ts
# or
node --loader ts-node/esm tests/e2e/runner.ts
```

### 3.3 Test Output Format
The test runner produces a structured summary report:
```
======================================================================
  PERSONAL DASHBOARD — E2E REQUIREMENT TEST SUITE
======================================================================
[TIER 1] Feature Coverage (R1-R5): 30 / 30 Passed
[TIER 2] Boundary & Corner Cases:  25 / 25 Passed
[TIER 3] Cross-Feature Pairs:       8 /  8 Passed
[TIER 4] Real-World Scenarios:      4 /  4 Passed
----------------------------------------------------------------------
TOTAL TESTS: 67 | PASSED: 67 | FAILED: 0 | DURATION: ~35ms
STATUS: ALL REQUIREMENTS VERIFIED (100% READY)
======================================================================
```

---

## 4. Requirement Traceability Matrix

| Requirement | Description | Tier 1 Tests | Tier 2 Tests | Tier 3 Tests | Tier 4 Scenarios | Total Coverage |
|-------------|-------------|--------------|--------------|--------------|------------------|----------------|
| **R1** | Temporal Horizons (Monthly, Weekly, Daily) | T1.1 - T1.6 (6) | T2.1 - T2.5 (5) | T3.1, T3.2, T3.4, T3.6, T3.7, T3.8 | T4.1, T4.2, T4.4 | 19 Tests |
| **R2** | Interactive Kanban Board (DnD, Columns) | T1.7 - T1.12 (6) | T2.6 - T2.10 (5) | T3.1, T3.4, T3.6 | T4.1, T4.2, T4.4 | 17 Tests |
| **R3** | Task CRUD, Markdown, Subtasks, Metrics | T1.13 - T1.18 (6) | T2.11 - T2.15 (5) | T3.2, T3.4, T3.7, T3.8 | T4.1, T4.2, T4.4 | 18 Tests |
| **R4** | Local Persistence, Schema Migration, Backup | T1.19 - T1.24 (6) | T2.16 - T2.20 (5) | T3.3, T3.5 | T4.1, T4.3 | 15 Tests |
| **R5** | UI/UX Pro Max, Theme, Accessibility | T1.25 - T1.30 (6) | T2.21 - T2.25 (5) | T3.3, T3.8 | T4.4 | 14 Tests |

**Total Distinct Test Cases:** 67 tests across Tiers 1-4.
All features exceed the minimum requirement of $\ge 5$ feature tests and $\ge 5$ boundary tests.

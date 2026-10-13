# Milestone 1 Empirical Challenge & Stress Resilience Report

- **Agent**: `m1_challenger_1` (Empirical Challenger)
- **Role**: Critic & Specialist
- **Target**: `src/context/taskReducer.ts`, `src/types/domain.ts`, `src/context/TaskContext.tsx`
- **Date**: 2026-10-12
- **Verdict**: **REQUEST_CHANGES**
- **Overall Risk Assessment**: **MEDIUM**

---

## 1. Executive Summary

As Empirical Challenger for Milestone 1, an adversarial stress test and boundary analysis was conducted against the task reducer (`src/context/taskReducer.ts`) and domain state architecture.

The core foundation engineered by `m1_worker_1` is solid: standard actions (`ADD_TASK`, `UPDATE_TASK`, `DELETE_TASK`, basic `MOVE_TASK`, `TOGGLE_SUBTASK`) demonstrate pure functional transitions, contiguous index renormalization ($0, 1, \dots, N-1$), and immutability under deep object freeze.

However, adversarial stress testing revealed **6 concrete failure modes and boundary vulnerabilities**, including potential duplicate task creation on rapid drag-and-drop, shallow reference leakage on task duplication, a silent no-op on `resetState()` invocation, incomplete completed-lifecycle state on clone, accidental task loss on partial column reordering, and array corruption on out-of-bounds column reordering.

Because downstream milestones (M2 persistence, M3 metrics, M4 interactive Kanban DnD) strictly depend on state integrity and invariant consistency, these 6 issues should be resolved before Milestone 1 is approved.

---

## 2. Test & Analysis Matrix Across Required Dimensions

| Dimension | Boundary Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **1. Rapid Sequential Moves** | 10 rapid sequential intra/inter column moves | Contiguous orders $0..N-1$, 3 unique tasks | Orders strictly preserved $0..N-1$ | **PASS** |
| | Stale `sourceColumnId` in payload during rapid DnD | Task moved without duplicate creation | Task exists in both source and destination (duplicate created) | **FAIL (Defect 1)** |
| **2. Out-of-bounds Orders** | `destinationIndex = -100` | Clamped safely to index 0 | Clamped safely to 0 | **PASS** |
| | `destinationIndex = 999999` | Clamped safely to column length | Clamped safely to column length | **PASS** |
| | `ADD_TASK` with `order: -50` or `888` | Normalized to contiguous order | Normalized to contiguous order | **PASS** |
| | `REORDER_COLUMNS` with `startIndex = 99` | Handled safely without corruption | Inserts `undefined` creating corrupt column object `{ order: 0 }` | **FAIL (Defect 2)** |
| **3. Empty Lists** | Move task into empty column | Task placed at order 0 with completed lifecycle | Placed at order 0, completedAt updated | **PASS** |
| | Move last task out of column | Leaves empty column without crashing | Leaves empty column cleanly | **PASS** |
| | All actions on `tasks = []` | Graceful no-op or valid addition | Zero uncaught exceptions | **PASS** |
| | `REORDER_COLUMN_TASKS` with partial `taskIds` | Preserves omitted tasks | Omitted tasks are permanently deleted | **FAIL (Defect 3)** |
| **4. Moving Between Columns** | Move `todo` $\rightarrow$ `done` | `completedAt` timestamp set | `completedAt` timestamp set | **PASS** |
| | Move `done` $\rightarrow$ `todo` / `in-progress` | `completedAt` reset to `null` | `completedAt` reset to `null` | **PASS** |
| | Move within `done` (intra-column) | Existing `completedAt` preserved | Existing `completedAt` preserved | **PASS** |
| **5. Orphan Task Detachment** | Delete parent task with children | Children have `parentTaskId: null`, `updatedAt` renewed | Children detached to `null`, `updatedAt` renewed | **PASS** |
| | Grandchildren hierarchy (Monthly $\rightarrow$ Weekly $\rightarrow$ Daily) | Deleting Monthly detaches Weekly; Daily still links to Weekly | Hierarchy preserved cleanly | **PASS** |
| **6. Duplicate Deep Copying** | Duplicated task IDs & subtask IDs | Unique new UUIDs for task and subtasks | New UUIDs generated | **PASS** |
| | Deep copy of `tags` array | Cloned independent array (`dup.tags !== orig.tags`) | **Shallow reference shared** (`dup.tags === orig.tags`) | **FAIL (Defect 4)** |
| | Duplicating task in `done` column | `completedAt` is non-null for completed column | **Hardcoded `completedAt: null`** in `done` column | **FAIL (Defect 5)** |
| **7. Immutability** | `Object.freeze` on state, tasks, subtasks, tags | Reducer executes without mutation error | Passes cleanly without error | **PASS** |
| | Structural sharing | Unmodified tasks retain reference identity (`===`) | Preserved across all operations | **PASS** |
| **8. State Reset** | `resetState()` called without argument | Resets state to default seed data | **Silent no-op (returns unmodified state)** | **FAIL (Defect 6)** |

---

## 3. Detailed Challenge Findings & Defect Reports

### Defect 1: Stale `sourceColumnId` causes task duplication in `MOVE_TASK`
- **Location**: `src/context/taskReducer.ts:193` & `222-253`
- **Severity**: HIGH
- **Attack Scenario**:
  During rapid drag-and-drop actions, if action payloads are queued or dispatched with a stale `sourceColumnId` (e.g., UI thinks task is still in column A, but previous action moved it to column B):
  ```ts
  const sourceColumnId = action.payload.sourceColumnId || task.columnId;
  ```
  In inter-column move:
  `sourceTasks` filters `t.columnId === sourceColumnId && t.id !== taskId`.
  `otherTasks` filters `t.columnId !== sourceColumnId && t.columnId !== destinationColumnId`.
  Because `task.columnId` is column B (different from stale column A), `task` is included in `otherTasks`.
  Meanwhile, `updatedTask` is inserted into `destTasks`.
  **Result**: The task now appears twice in `state.tasks`.
- **Blast Radius**: Corrupts task uniqueness; breaks Kanban board rendering and metrics.
- **Recommended Mitigation**:
  Use `task.columnId` as the single canonical source of truth for the task's origin:
  ```ts
  // taskReducer.ts line 193
  const sourceColumnId = task.columnId;
  ```

---

### Defect 2: Out-of-bounds `startIndex` in `REORDER_COLUMNS` inserts `undefined`
- **Location**: `src/context/taskReducer.ts:405-414`
- **Severity**: LOW-MEDIUM
- **Attack Scenario**:
  If `REORDER_COLUMNS` is dispatched with `startIndex >= state.columns.length` (or `< 0`):
  ```ts
  const [removed] = reordered.splice(startIndex, 1);
  reordered.splice(endIndex, 0, removed);
  return {
    ...state,
    columns: reordered.map((col, idx) => ({ ...col, order: idx })),
  };
  ```
  `reordered.splice(99, 1)` yields `removed = undefined`.
  `reordered.splice(endIndex, 0, undefined)` inserts `undefined`.
  `reordered.map((col, idx) => ({ ...col, order: idx }))` creates an invalid column `{ order: 0 }` with `id: undefined`.
- **Blast Radius**: Board crashes when accessing `col.id` or rendering column headers.
- **Recommended Mitigation**:
  Add boundary validation guard:
  ```ts
  case 'REORDER_COLUMNS': {
    const { startIndex, endIndex } = action.payload;
    if (
      startIndex < 0 ||
      startIndex >= state.columns.length ||
      endIndex < 0 ||
      endIndex >= state.columns.length
    ) {
      return state;
    }
    // ...
  }
  ```

---

### Defect 3: Silent task loss in `REORDER_COLUMN_TASKS` when partial `taskIds` supplied
- **Location**: `src/context/taskReducer.ts:256-271`
- **Severity**: MEDIUM
- **Attack Scenario**:
  If `REORDER_COLUMN_TASKS` is called with a subset of column task IDs (for example, after filtering or pagination):
  ```ts
  const reorderedColTasks = taskIds
    .map((id, index) => {
      const t = colTasks.find(ct => ct.id === id);
      return t ? { ...t, order: index } : null;
    })
    .filter((t): t is Task => t !== null);
  ```
  Any tasks in `colTasks` whose IDs are not in `taskIds` are not included in `reorderedColTasks` and not in `otherTasks`.
  **Result**: Unmentioned tasks are permanently and silently deleted from `state.tasks`.
- **Blast Radius**: Data loss under partial reordering operations.
- **Recommended Mitigation**:
  Preserve unmentioned tasks by appending them after the explicitly reordered tasks:
  ```ts
  case 'REORDER_COLUMN_TASKS': {
    const { columnId, taskIds } = action.payload;
    const colTasks = state.tasks.filter(t => t.columnId === columnId);
    const otherTasks = state.tasks.filter(t => t.columnId !== columnId);
    
    const reorderedMap = new Set(taskIds);
    const reorderedColTasks = taskIds
      .map((id) => colTasks.find(ct => ct.id === id))
      .filter((t): t is Task => Boolean(t));
    
    const unmentioned = colTasks.filter(ct => !reorderedMap.has(ct.id));
    const combinedColTasks = [...reorderedColTasks, ...unmentioned].map((t, idx) => ({
      ...t,
      order: idx,
    }));

    return {
      ...state,
      tasks: [...otherTasks, ...combinedColTasks],
    };
  }
  ```

---

### Defect 4: Shared `tags` array reference in `DUPLICATE_TASK`
- **Location**: `src/context/taskReducer.ts:163`
- **Severity**: LOW-MEDIUM
- **Attack Scenario**:
  In `DUPLICATE_TASK`:
  ```ts
  const duplicatedTask: Task = {
    ...original,
    id: newId,
    title: `${original.title} (Copia)`,
    subtasks: clonedSubtasks,
    // tags is NOT spread or cloned!
  };
  ```
  `original.tags` is copied by shallow object spread. Both `original` and `duplicatedTask` share the exact same array reference in heap memory (`duplicate.tags === original.tags`).
  Modifying `tags` on one task (e.g. adding a tag in a modal) will mutate both tasks if done directly.
- **Blast Radius**: Subtle cross-task state pollution violating state deep cloning guarantees.
- **Recommended Mitigation**:
  Explicitly clone the tags array:
  ```ts
  tags: Array.isArray(original.tags) ? [...original.tags] : [],
  ```

---

### Defect 5: `completedAt` set to `null` when duplicating task in `done` column
- **Location**: `src/context/taskReducer.ts:169`
- **Severity**: LOW
- **Attack Scenario**:
  In `DUPLICATE_TASK`:
  ```ts
  completedAt: null, // Hardcoded
  ```
  If a task in the `done` column is duplicated, it is inserted into `original.columnId` (which is `done`).
  However, its `completedAt` is set to `null`.
  In `PROJECT.md` and `src/test/domain.test.ts:48-53`, the domain invariant states that tasks residing in completed columns must have a valid `completedAt` timestamp.
  Furthermore, Productivity Metrics (Feature 19) uses `completedAt` to determine completion rates.
- **Blast Radius**: Inconsistent domain state; metrics miscalculation for cloned completed tasks.
- **Recommended Mitigation**:
  ```ts
  const destCol = state.columns.find(c => c.id === original.columnId);
  const completedAt = destCol?.isCompletedColumn ? now : null;
  ```

---

### Defect 6: `resetState()` with no arguments silently fails to reset
- **Location**: `src/context/taskReducer.ts:418-426` & `src/context/TaskContext.tsx:121-126`
- **Severity**: MEDIUM
- **Attack Scenario**:
  In `TaskContext.tsx`:
  ```ts
  const resetState = useCallback(
    (seedState?: DashboardAppState) => {
      dispatch({ type: 'RESET_STATE', payload: { seedState } });
    },
    [dispatch]
  );
  ```
  When the application calls `resetState()` without passing arguments:
  `action.payload` is `{ seedState: undefined }`.
  In `taskReducer.ts`:
  ```ts
  case 'RESET_TO_SEED':
  case 'RESET_STATE': {
    if (action.payload) {
      if ('seedState' in action.payload && action.payload.seedState) {
        return { ...action.payload.seedState };
      }
      if ('tasks' in action.payload) {
        return { ...(action.payload as unknown as DashboardAppState) };
      }
    }
    return state;
  }
  ```
  Because `action.payload.seedState` is `undefined`, it falls through and does `return state;`!
  **Result**: Clicking "Reset to Seed Data" in the UI does nothing.
- **Blast Radius**: Feature 13 ("Reset to Seed Data") is non-functional when triggered via default facade.
- **Recommended Mitigation**:
  In `taskReducer.ts`, import `INITIAL_APP_STATE` as default fallback:
  ```ts
  case 'RESET_TO_SEED':
  case 'RESET_STATE': {
    if (action.payload) {
      if ('seedState' in action.payload && action.payload.seedState) {
        return { ...action.payload.seedState };
      }
      if ('tasks' in action.payload) {
        return { ...(action.payload as unknown as DashboardAppState) };
      }
    }
    return { ...INITIAL_APP_STATE };
  }
  ```
  And in `TaskContext.tsx`:
  ```ts
  const resetState = useCallback(
    (seedState?: DashboardAppState) => {
      dispatch({ type: 'RESET_STATE', payload: { seedState: seedState || INITIAL_APP_STATE } });
    },
    [dispatch]
  );
  ```

---

## 4. Empirical Test Suite Created

To verify these boundary cases, an automated test suite has been committed to:
`src/test/challenger_stress.test.ts`

This suite exercises:
- 10 rapid sequential moves verifying order preservation
- Adversarial stale `sourceColumnId` injection
- Negative and excessive index clamping
- `REORDER_COLUMNS` out-of-bounds safety
- Empty list moves and zero-task state robustness
- Completed lifecycle transitions (`todo` $\leftrightarrow$ `done`)
- Orphan detachment and multi-tier hierarchy preservation
- Deep copy isolation of subtasks and tags
- Completed column duplication rules
- `Object.freeze` immutability verification
- `RESET_STATE` parameterless invocation

---

## 5. Explicit Verdict

**Verdict: REQUEST_CHANGES**

**Action Required**:
Instruct `m1_worker_1` (or relevant implementation agent) to apply the 6 targeted remediations described in Section 3 to `src/context/taskReducer.ts` and `src/context/TaskContext.tsx`. All changes are localized, low-risk, and immediately raise test suite pass rates to 100% across both baseline and adversarial stress suites.

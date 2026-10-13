## 2026-10-12T17:36:06Z
Identity: You are m2_worker_1, the implementation worker for Milestone 2: Local Persistence, Migration & Data Backup.
Working Directory: c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal\.agents\teamwork\m2_worker_1
Project Root: c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal
Parent Conversation ID: 4e5cc7d7-f455-416b-8a66-b6d8f72f2dc2
Authoritative Sources:
- c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal\PROJECT.md
- c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal\.agents\teamwork\survey_spec_miner_1\report.md
- c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal\.agents\teamwork\survey_explorer_arch_1\report.md
- c:\Users\mateo\OneDrive\Documentos\Proyectos\Dashboar Personal\tests\e2e\harness.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE OF WORK & FILE EXCLUSIVE OWNERSHIP:
1. `src/services/migrationService.ts`:
   - Schema versioning (`CURRENT_SCHEMA_VERSION = 1`).
   - `migrateState(rawState: unknown): DashboardAppState` with pipeline of migration functions from version 0 (raw unversioned) to version 1.
   - Validation helper `isValidAppState(obj: unknown): boolean` checking required arrays (tasks, columns, tags) and structure.
2. `src/services/storageService.ts`:
   - Key `personal_dashboard_state_v1`.
   - `loadState(): DashboardAppState` with automatic migration, corrupted unparseable JSON handling (fallback to seed data + preserving corrupt backup in `_corrupt` key).
   - `saveState(state: DashboardAppState): boolean` with `QuotaExceededError` try/catch protection.
   - `exportJSON(state: DashboardAppState): string` serializing state with export timestamp and version.
   - `importJSON(jsonString: string): { success: boolean; state?: DashboardAppState; error?: string }` with structural validation, prototype pollution protection, and safe parsing.
   - `resetToSeed(): DashboardAppState` returning `INITIAL_APP_STATE`.
3. `src/components/settings/DataManagementModal.tsx`:
   - Accessible modal dialog for:
     * Exporting JSON (triggers download of `personal-dashboard-backup-YYYY-MM-DD.json`).
     * Importing JSON with file input reader, validation error banner, preview of task/column counts, and Confirm Replace button.
     * Reset to Seed data with destructive confirmation ("¿Estás seguro de restablecer todos los datos a los valores de ejemplo?").
4. `src/test/storage.test.ts`:
   - Unit tests for loadState, saveState, auto-migration, corrupted JSON recovery, exportJSON, importJSON (valid payload, invalid json, missing arrays), and resetToSeed.
5. Integration:
   - In `src/context/TaskContext.tsx`, ensure `saveState` is called on state change (with debounced or immediate effect, plus multi-tab `storage` event synchronization).
   - In `src/App.tsx`, add a Data Management button in the header that opens `DataManagementModal`.

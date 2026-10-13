// src/test/storage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadState,
  saveState,
  exportJSON,
  importJSON,
  resetToSeed,
  STORAGE_KEY,
  CORRUPT_KEY,
  CORRUPT_BACKUP_KEY,
  CURRENT_SCHEMA_VERSION,
} from '../services/storageService';
import { migrateState, isValidAppState, validateAppState } from '../services/migrationService';
import { INITIAL_APP_STATE } from '../constants/initialData';
import { DashboardAppState } from '../types/domain';

describe('Storage & Migration Service Unit Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadState & Initialization', () => {
    it('initializes and saves clean seed data when storage is empty', () => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

      const state = loadState();

      expect(state).toBeDefined();
      expect(state.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(state.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(state.columns.length).toBe(INITIAL_APP_STATE.columns.length);

      // Verifies it wrote back to localStorage
      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('loads existing valid state from localStorage', () => {
      const customState: DashboardAppState = {
        ...INITIAL_APP_STATE,
        searchQuery: 'testing-search-term',
      };
      saveState(customState);

      const loaded = loadState();
      expect(loaded.searchQuery).toBe('testing-search-term');
      expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('recovers gracefully from corrupted unparseable JSON and preserves backup', () => {
      const corruptedString = '{ "invalid_json": true, incomplete...';
      window.localStorage.setItem(STORAGE_KEY, corruptedString);

      const state = loadState();

      // State falls back to clean seed data
      expect(state.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(state.version).toBe(CURRENT_SCHEMA_VERSION);

      // Corrupted raw data is preserved in corrupt backup keys
      expect(window.localStorage.getItem(CORRUPT_KEY)).toBe(corruptedString);
      expect(window.localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe(corruptedString);

      // Clean seed state replaces the corrupted key in primary storage
      const refreshedPrimary = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      expect(refreshedPrimary.version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('recovers gracefully from non-object JSON values (primitives)', () => {
      window.localStorage.setItem(STORAGE_KEY, '"just a string"');

      const state = loadState();
      expect(state.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(window.localStorage.getItem(CORRUPT_KEY)).toBe('"just a string"');
    });
  });

  describe('saveState & Quota Protection', () => {
    it('persists state accurately into localStorage', () => {
      const success = saveState(INITIAL_APP_STATE);
      expect(success).toBe(true);

      const raw = window.localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
    });

    it('handles QuotaExceededError gracefully without throwing', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        const error = new Error('The quota has been exceeded.') as any;
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = saveState(INITIAL_APP_STATE);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Migration Pipeline & Schema Validation', () => {
    it('correctly validates valid and invalid app state structures', () => {
      expect(isValidAppState(INITIAL_APP_STATE)).toBe(true);
      expect(isValidAppState(null)).toBe(false);
      expect(isValidAppState(undefined)).toBe(false);
      expect(isValidAppState({})).toBe(false);
      expect(isValidAppState({ tasks: [] })).toBe(false);
      expect(isValidAppState({ tasks: [], columns: [] })).toBe(false);
      expect(isValidAppState({ tasks: [], columns: [], tags: [] })).toBe(true);

      expect(validateAppState(null).valid).toBe(false);
      expect(validateAppState({}).error).toContain('tasks');
      expect(validateAppState({ tasks: [] }).error).toContain('columns');
      expect(validateAppState({ tasks: [], columns: [] }).error).toContain('tags');
      expect(validateAppState({ tasks: [], columns: [], tags: [] }).valid).toBe(true);
    });

    it('migrates unversioned v0 state to version 1 with backfilled defaults', () => {
      const v0RawState = {
        tasks: [
          {
            id: 'legacy-1',
            title: 'Legacy Task',
            // missing description, priority, order, subtasks, timestamps
          },
        ],
        // missing columns and tags
      };

      const migrated = migrateState(v0RawState);

      expect(migrated.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.columns.length).toBe(3); // default columns populated
      expect(migrated.tags.length).toBeGreaterThan(0); // default tags populated
      expect(migrated.tasks.length).toBe(1);

      const task = migrated.tasks[0];
      expect(task.id).toBe('legacy-1');
      expect(task.title).toBe('Legacy Task');
      expect(task.description).toBe('');
      expect(task.priority).toBe('medium');
      expect(task.horizon).toBe('daily');
      expect(task.columnId).toBe('todo');
      expect(task.subtasks).toEqual([]);
      expect(task.order).toBe(0);
      expect(task.createdAt).toBeTruthy();
      expect(task.updatedAt).toBeTruthy();
      expect(task.completedAt).toBeNull();
    });

    it('migrates state with legacy schemaVersion key to version 1', () => {
      const legacyState = {
        schemaVersion: 0,
        tasks: [],
        columns: [],
        tags: [],
      };

      const migrated = migrateState(legacyState);
      expect(migrated.version).toBe(1);
      expect(migrated.columns.length).toBe(3);
    });
  });

  describe('exportJSON', () => {
    it('produces valid formatted JSON with required metadata', () => {
      const exportedString = exportJSON(INITIAL_APP_STATE);
      expect(typeof exportedString).toBe('string');

      const parsed = JSON.parse(exportedString);
      expect(parsed.app).toBe('PersonalDashboard');
      expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(parsed.exportedAt).toBeTruthy();
      expect(parsed.data).toBeDefined();
      expect(parsed.data.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(parsed.data.columns.length).toBe(INITIAL_APP_STATE.columns.length);
    });
  });

  describe('importJSON & Security Protections', () => {
    it('successfully imports a valid wrapped export payload', () => {
      const exportedString = exportJSON(INITIAL_APP_STATE);
      const result = importJSON(exportedString);

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state?.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(result.state?.columns.length).toBe(INITIAL_APP_STATE.columns.length);
      expect(result.state?.version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('successfully imports a valid direct state payload without wrapper', () => {
      const directString = JSON.stringify(INITIAL_APP_STATE);
      const result = importJSON(directString);

      expect(result.success).toBe(true);
      expect(result.state?.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
    });

    it('rejects invalid JSON syntax with descriptive error', () => {
      const result = importJSON('{ invalid json syntax ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de sintaxis JSON');
    });

    it('rejects empty or whitespace-only input', () => {
      const result = importJSON('   ');
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('rejects non-object payloads such as numbers or booleans', () => {
      const result = importJSON('12345');
      expect(result.success).toBe(false);
      expect(result.error).toContain('object');
    });

    it('rejects payloads missing required arrays (tasks, columns, tags)', () => {
      const missingTasks = JSON.stringify({ columns: [], tags: [] });
      const res1 = importJSON(missingTasks);
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('tasks');

      const missingColumns = JSON.stringify({ tasks: [], tags: [] });
      const res2 = importJSON(missingColumns);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('columns');

      const missingTags = JSON.stringify({ tasks: [], columns: [] });
      const res3 = importJSON(missingTags);
      expect(res3.success).toBe(false);
      expect(res3.error).toContain('tags');
    });

    it('rejects payloads containing prototype pollution attempts via __proto__', () => {
      const maliciousPayload = '{"__proto__": {"isAdmin": true}, "tasks": [], "columns": [], "tags": []}';
      const result = importJSON(maliciousPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prototipo');
    });

    it('rejects payloads containing prototype pollution attempts via constructor.prototype', () => {
      const maliciousPayload = '{"constructor": {"prototype": {"polluted": true}}, "tasks": [], "columns": [], "tags": []}';
      const result = importJSON(maliciousPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('prototipo');
    });
  });

  describe('resetToSeed', () => {
    it('restores clean initial seed state and updates localStorage', () => {
      // Modify local storage first
      const alteredState = { ...INITIAL_APP_STATE, searchQuery: 'custom-query' };
      saveState(alteredState);

      const resetState = resetToSeed();

      expect(resetState.searchQuery).toBe('');
      expect(resetState.tasks.length).toBe(INITIAL_APP_STATE.tasks.length);
      expect(resetState.columns.length).toBe(INITIAL_APP_STATE.columns.length);

      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      expect(stored.searchQuery).toBe('');
    });
  });
});

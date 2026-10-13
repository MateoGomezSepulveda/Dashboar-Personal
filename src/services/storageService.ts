/**
 * ============================================================================
 * LOCAL STORAGE & DATA BACKUP SERVICE — PERSONAL DASHBOARD
 * ============================================================================
 * Handles browser persistence, QuotaExceededError protection, corrupted
 * recovery safeguards, JSON export formatting, and secure import parsing.
 */

import { DashboardAppState } from '../types/domain';
import { INITIAL_APP_STATE } from '../constants/initialData';
import {
  CURRENT_SCHEMA_VERSION,
  isValidAppState,
  migrateState,
  validateAppState,
} from './migrationService';

export { CURRENT_SCHEMA_VERSION };

/** Primary localStorage key */
export const STORAGE_KEY = 'personal_dashboard_state_v1';

/** Corrupted state backup keys */
export const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}_corrupt_backup`;
export const CORRUPT_KEY = `${STORAGE_KEY}_corrupt`;

/**
 * Checks for dangerous prototype pollution keys in object structure.
 */
function containsPrototypePollution(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check object own keys
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (containsPrototypePollution(obj[key])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Retrieves and deserializes application state from localStorage.
 * Automatically performs schema migrations and gracefully recovers from corruption.
 */
export function loadState(): DashboardAppState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...INITIAL_APP_STATE };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = { ...INITIAL_APP_STATE };
    saveState(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Stored data is not an object');
    }

    // Check basic schema validity or run migration pipeline
    const migrated = migrateState(parsed);

    if (!isValidAppState(migrated)) {
      throw new Error('Migrated state is invalid');
    }

    return migrated;
  } catch (error) {
    // Corrupted unparseable JSON or invalid schema: preserve backup and fallback to seed
    try {
      window.localStorage.setItem(CORRUPT_KEY, raw);
      window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // Ignore secondary storage error
    }

    console.warn('Dashboard state was corrupted or unparseable. Restored from seed data.', error);
    const fallbackSeed = { ...INITIAL_APP_STATE };
    saveState(fallbackSeed);
    return fallbackSeed;
  }
}

/**
 * Serializes and saves application state to localStorage with QuotaExceededError protection.
 */
export function saveState(state: DashboardAppState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error: any) {
    if (
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014
    ) {
      console.error('LocalStorage quota exceeded. Unable to persist state:', error);
    } else {
      console.error('Unexpected error while saving state to localStorage:', error);
    }
    return false;
  }
}

/**
 * Serializes state into a formatted JSON backup string containing application metadata.
 */
export function exportJSON(state: DashboardAppState): string {
  const payload = {
    app: 'PersonalDashboard',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Safely parses, validates, and migrates a JSON backup string with prototype pollution protection.
 */
export function importJSON(
  jsonString: string
): { success: boolean; state?: DashboardAppState; error?: string } {
  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    return { success: false, error: 'El archivo está vacío o no contiene datos válidos' };
  }

  // Defense-in-depth: Regex check for prototype pollution keys in JSON string
  if (/"(?:__proto__|constructor|prototype)"\s*:/i.test(jsonString)) {
    return {
      success: false,
      error: 'Copia de seguridad rechazada: contiene claves no permitidas (prototipo)',
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e: any) {
    return {
      success: false,
      error: `Error de sintaxis JSON: ${e?.message || 'formato inválido'}`,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { success: false, error: 'JSON payload must be an object' };
  }

  // Deep recursive prototype pollution check
  if (containsPrototypePollution(parsed)) {
    return {
      success: false,
      error: 'Copia de seguridad rechazada: contiene atributos de prototipo modificados',
    };
  }

  // Handle both wrapped payload ({ app, schemaVersion, data }) and direct state
  const candidate = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

  const validation = validateAppState(candidate);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const migratedState = migrateState(candidate);
    if (!isValidAppState(migratedState)) {
      return { success: false, error: 'El estado migrado no cumple con los requisitos del esquema' };
    }
    return { success: true, state: migratedState };
  } catch (err: any) {
    return { success: false, error: `Error durante la migración del esquema: ${err?.message || ''}` };
  }
}

/**
 * Restores state to initial clean seed data and persists it.
 */
export function resetToSeed(): DashboardAppState {
  const seed = { ...INITIAL_APP_STATE };
  saveState(seed);
  return seed;
}

export const storageService = {
  loadState,
  saveState,
  exportJSON,
  importJSON,
  resetToSeed,
};

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { DashboardAppState } from '../types/domain';
import {
  BRIDGE_STORAGE_KEY,
  isSeedIdea,
  type IdeaRecord,
} from './ideaSyncService';

// Check if Firebase environment variables are provided (with fallback to project client config for Netlify)
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCLDlxqyd4DI1_Aj_wtJDACqPSpxFDLAEI';
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dashboard-personal-mateo.firebaseapp.com';
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dashboard-personal-mateo';
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dashboard-personal-mateo.firebasestorage.app';
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '810853367735';
const appId = import.meta.env.VITE_FIREBASE_APP_ID || '1:810853367735:web:311b47ab1a70d5c1253232';

export const isFirebaseConfigured = Boolean(
  apiKey && apiKey !== 'tu_api_key_aqui' && projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0
      ? initializeApp({
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId,
        })
      : getApps()[0];

    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Advertencia: No se pudo inicializar Firebase:', err);
  }
}

const GCAL_TOKEN_KEY = 'personal_dashboard_gcal_token';
const GCAL_TOKEN_EXPIRY_KEY = 'personal_dashboard_gcal_token_expiry';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getGoogleCalendarToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(GCAL_TOKEN_KEY);
  const expiry = localStorage.getItem(GCAL_TOKEN_EXPIRY_KEY);
  if (!token) return null;
  if (expiry && Date.now() > Number(expiry)) {
    localStorage.removeItem(GCAL_TOKEN_KEY);
    localStorage.removeItem(GCAL_TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

export function setGoogleCalendarToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(GCAL_TOKEN_KEY, token);
    // Los tokens OAuth de Google duran ~3600s (guardamos 55 min de validez segura)
    localStorage.setItem(GCAL_TOKEN_EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
  } else {
    localStorage.removeItem(GCAL_TOKEN_KEY);
    localStorage.removeItem(GCAL_TOKEN_EXPIRY_KEY);
  }
}

/**
 * Autenticación con Google vía ventana emergente (incluye permiso de Google Calendar)
 */
export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase no está configurado. Por favor configura tus variables en .env.local');
  }
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    setGoogleCalendarToken(credential.accessToken);
    authenticateIdeaVaultWithGoogleToken(credential.accessToken);
  }
  return result.user;
}

/**
 * Solicita o renueva el token de acceso a Google Calendar mediante popup
 */
export async function authorizeGoogleCalendar(forceConsent: boolean = false): Promise<string | null> {
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.setCustomParameters({
    prompt: forceConsent ? 'consent' : 'select_account',
    include_granted_scopes: 'true',
  });
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || null;
  setGoogleCalendarToken(token);
  if (token) {
    authenticateIdeaVaultWithGoogleToken(token);
  }
  return token;
}

/**
 * Cierre de sesión de usuario
 */
export async function logoutUser(): Promise<void> {
  setGoogleCalendarToken(null);
  if (!auth) return;
  await signOut(auth);
}

/**
 * Suscribirse a cambios de estado de autenticación
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Guardar estado del dashboard en Firestore para el usuario autenticado
 */
export async function saveDashboardToCloud(
  userId: string,
  state: DashboardAppState
): Promise<boolean> {
  if (!db) return false;
  try {
    const userDocRef = doc(db, 'users', userId, 'dashboard', 'state');
    const cleanState = JSON.parse(JSON.stringify(state));
    await setDoc(userDocRef, {
      ...cleanState,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error al guardar en Firestore:', error);
    return false;
  }
}

/**
 * Cargar estado del dashboard desde Firestore
 */
export async function loadDashboardFromCloud(
  userId: string
): Promise<DashboardAppState | null> {
  if (!db) return null;
  try {
    const userDocRef = doc(db, 'users', userId, 'dashboard', 'state');
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as DashboardAppState;
    }
    return null;
  } catch (error) {
    console.error('Error al leer de Firestore:', error);
    return null;
  }
}

/**
 * Suscribirse a actualizaciones en tiempo real de Firestore
 */
export function subscribeToCloudDashboard(
  userId: string,
  onUpdate: (state: DashboardAppState) => void
): Unsubscribe {
  if (!db) return () => {};
  const userDocRef = doc(db, 'users', userId, 'dashboard', 'state');
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DashboardAppState;
        onUpdate(data);
      }
    },
    (err) => {
      console.error('Error en listener de Firestore:', err);
    }
  );
}

// ============================================================================
// CONEXIÓN DIRECTA CON ORGANIZADOR DE IDEAS (software-de-ideas + Cloud Bridge)
// ============================================================================

const IDEAVAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDmSxecrrN93ftHW_xJfNI5OTEMA7Cxa6c',
  authDomain: 'software-de-ideas.firebaseapp.com',
  projectId: 'software-de-ideas',
  storageBucket: 'software-de-ideas.firebasestorage.app',
  messagingSenderId: '490558745412',
  appId: '1:490558745412:web:a95a51cae1c654b4340511',
};

let ideaVaultApp: FirebaseApp | null = null;
let ideaVaultAuth: Auth | null = null;
let ideaVaultDb: Firestore | null = null;

function ensureIdeaVaultFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} | null {
  try {
    if (!ideaVaultApp) {
      const existing = getApps().find((a) => a.name === 'ideavault-cloud');
      ideaVaultApp =
        existing || initializeApp(IDEAVAULT_FIREBASE_CONFIG, 'ideavault-cloud');
    }
    if (!ideaVaultAuth) {
      ideaVaultAuth = getAuth(ideaVaultApp);
    }
    if (!ideaVaultDb) {
      ideaVaultDb = getFirestore(ideaVaultApp);
    }
    return { app: ideaVaultApp, auth: ideaVaultAuth, db: ideaVaultDb };
  } catch {
    return null;
  }
}

export function authenticateIdeaVaultWithGoogleToken(accessToken: string): void {
  const iv = ensureIdeaVaultFirebase();
  if (!iv || !accessToken) return;
  try {
    const cred = GoogleAuthProvider.credential(null, accessToken);
    signInWithCredential(iv.auth, cred).catch(() => {
      // Ignorar si el token de Google expiró
    });
  } catch {
    // Ignorar error de credencial
  }
}

/**
 * Si el usuario ya había iniciado sesión en Organizador de Ideas en este navegador,
 * lee su refreshToken desde IndexedDB (`firebaseLocalStorageDb`) y descarga sus ideas
 * reales directamente desde Firestore (`software-de-ideas`).
 */
async function fetchIdeasViaIndexedDbSession(): Promise<IdeaRecord[]> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return [];

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open('firebaseLocalStorageDb');
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        try {
          const idb = req.result;
          if (!idb.objectStoreNames.contains('firebaseLocalStorage')) {
            idb.close();
            resolve([]);
            return;
          }
          const tx = idb.transaction('firebaseLocalStorage', 'readonly');
          const store = tx.objectStore('firebaseLocalStorage');
          const getAllReq = store.getAll();
          getAllReq.onerror = () => {
            idb.close();
            resolve([]);
          };
          getAllReq.onsuccess = async () => {
            idb.close();
            const records = Array.isArray(getAllReq.result) ? getAllReq.result : [];
            const match = records.find(
              (r: Record<string, unknown>) =>
                typeof r?.fbase_key === 'string' &&
                r.fbase_key.includes(IDEAVAULT_FIREBASE_CONFIG.apiKey)
            );
            const value = match?.value as
              | {
                  uid?: string;
                  stsTokenManager?: { refreshToken?: string; accessToken?: string };
                }
              | undefined;
            const uid = value?.uid;
            const refreshToken = value?.stsTokenManager?.refreshToken;
            if (!uid || !refreshToken) {
              resolve([]);
              return;
            }

            try {
              const tokenRes = await fetch(
                `https://securetoken.googleapis.com/v1/token?key=${IDEAVAULT_FIREBASE_CONFIG.apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(
                    refreshToken
                  )}`,
                }
              );
              if (!tokenRes.ok) {
                resolve([]);
                return;
              }
              const tokenData = await tokenRes.json();
              const idToken = tokenData.id_token as string | undefined;
              const userId = (tokenData.user_id as string | undefined) || uid;
              if (!idToken) {
                resolve([]);
                return;
              }

              const docRes = await fetch(
                `https://firestore.googleapis.com/v1/projects/${IDEAVAULT_FIREBASE_CONFIG.projectId}/databases/(default)/documents/ideavault_users/${userId}`,
                {
                  headers: { Authorization: `Bearer ${idToken}` },
                }
              );
              if (!docRes.ok) {
                resolve([]);
                return;
              }
              const docJson = await docRes.json();
              const ideasArray = parseFirestoreRestIdeas(docJson);
              resolve(ideasArray);
            } catch {
              resolve([]);
            }
          };
        } catch {
          resolve([]);
        }
      };
    } catch {
      resolve([]);
    }
  });
}

function fromFirestoreValue(val: Record<string, unknown> | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const arrObj = val.arrayValue as { values?: Record<string, unknown>[] };
    return Array.isArray(arrObj?.values)
      ? arrObj.values.map((v) => fromFirestoreValue(v))
      : [];
  }
  if ('mapValue' in val) {
    const mapObj = val.mapValue as { fields?: Record<string, Record<string, unknown>> };
    const fields = mapObj?.fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function parseFirestoreRestIdeas(docJson: Record<string, unknown>): IdeaRecord[] {
  const fields = docJson?.fields as Record<string, Record<string, unknown>> | undefined;
  if (!fields || !fields.ideas) return [];
  const rawIdeas = fromFirestoreValue(fields.ideas);
  if (!Array.isArray(rawIdeas)) return [];
  return rawIdeas.filter((i) => !isSeedIdea(i as IdeaRecord)) as IdeaRecord[];
}

function cacheRealIdeasLocallyAndBridge(ideas: IdeaRecord[]): void {
  const real = (ideas || []).filter((i) => !isSeedIdea(i));
  if (real.length === 0) return;

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(real));
    }
  } catch {
    // Ignorar error de cuota
  }

  if (db) {
    const bridgeRef = doc(db, 'users', 'ideavault_sync_bridge', 'dashboard', 'ideas');
    setDoc(bridgeRef, {
      ideas: JSON.parse(JSON.stringify(real)),
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

/**
 * Suscribe el Dashboard a todas las fuentes en la nube donde están las ideas reales
 * creadas en el Organizador de Ideas (`software-de-ideas` + `ideavault_sync_bridge`).
 */
export function subscribeToRealIdeasCloud(
  onReceiveIdeas: (ideas: IdeaRecord[]) => void
): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];

  // 1. Escuchar el documento puente en `dashboard-personal-mateo`
  if (db) {
    const bridgeRef = doc(db, 'users', 'ideavault_sync_bridge', 'dashboard', 'ideas');
    getDoc(bridgeRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.ideas)) {
            const real = (data.ideas as IdeaRecord[]).filter((i) => !isSeedIdea(i));
            if (real.length > 0) onReceiveIdeas(real);
          }
        }
      })
      .catch(() => {});

    const unsubBridge = onSnapshot(
      bridgeRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data && Array.isArray(data.ideas)) {
          const real = (data.ideas as IdeaRecord[]).filter((i) => !isSeedIdea(i));
          if (real.length > 0) onReceiveIdeas(real);
        }
      },
      () => {}
    );
    unsubscribers.push(unsubBridge);
  }

  // 2. Autenticar y escuchar directamente el proyecto `software-de-ideas`
  const iv = ensureIdeaVaultFirebase();
  if (iv) {
    const gcalToken = getGoogleCalendarToken();
    if (gcalToken) {
      authenticateIdeaVaultWithGoogleToken(gcalToken);
    }

    let unsubIdeaDoc: Unsubscribe | null = null;
    const unsubAuth = onAuthStateChanged(iv.auth, (ivUser) => {
      if (unsubIdeaDoc) {
        unsubIdeaDoc();
        unsubIdeaDoc = null;
      }
      if (!ivUser) return;

      const userIdeaRef = doc(iv.db, 'ideavault_users', ivUser.uid);
      unsubIdeaDoc = onSnapshot(
        userIdeaRef,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (data && Array.isArray(data.ideas)) {
            const real = (data.ideas as IdeaRecord[]).filter((i) => !isSeedIdea(i));
            if (real.length > 0) {
              cacheRealIdeasLocallyAndBridge(real);
              onReceiveIdeas(real);
            }
          }
        },
        () => {}
      );
    });

    unsubscribers.push(() => {
      unsubAuth();
      if (unsubIdeaDoc) unsubIdeaDoc();
    });
  }

  // 3. Descarga inmediata si existe sesión previa de Organizador de Ideas en IndexedDB
  fetchIdeasViaIndexedDbSession()
    .then((ideas) => {
      if (ideas.length > 0) {
        cacheRealIdeasLocallyAndBridge(ideas);
        onReceiveIdeas(ideas);
      }
    })
    .catch(() => {});

  return () => {
    unsubscribers.forEach((u) => u());
  };
}

export { auth, db, type User };

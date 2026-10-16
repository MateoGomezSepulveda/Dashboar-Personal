import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

export { auth, db, type User };

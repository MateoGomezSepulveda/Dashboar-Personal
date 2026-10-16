import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  subscribeToAuth,
  loginWithGoogle,
  logoutUser,
  isFirebaseConfigured,
  type User,
} from '../services/firebase';

export type SyncStatus = 'local' | 'synced' | 'syncing' | 'error';

/** Tiempo máximo de inactividad antes de cerrar sesión automáticamente: 2 minutos */
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setSyncStatus('local');
      return;
    }

    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setSyncStatus(currentUser ? 'synced' : 'local');
      if (currentUser) {
        lastActivityRef.current = Date.now();
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      lastActivityRef.current = Date.now();
      await loginWithGoogle();
    } catch (error) {
      console.error('Error en autenticación:', error);
      setSyncStatus('error');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      setUser(null);
      setSyncStatus('local');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }, []);

  // Cierre automático de sesión tras 2 minutos sin actividad (mouse, teclado, scroll o pantalla táctil)
  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      lastActivityRef.current = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          logout();
        } else {
          resetInactivityTimer();
        }
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'wheel',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Iniciar temporizador al autenticarse
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, logout]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured: isFirebaseConfigured,
      syncStatus,
      setSyncStatus,
      login,
      logout,
    }),
    [user, loading, syncStatus, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: null,
  loading: false,
  isConfigured: false,
  syncStatus: 'local',
  setSyncStatus: () => {},
  login: async () => {},
  logout: async () => {},
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context || DEFAULT_AUTH_CONTEXT;
};

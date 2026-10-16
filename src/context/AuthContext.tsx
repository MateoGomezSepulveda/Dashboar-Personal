import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  subscribeToAuth,
  loginWithGoogle,
  logoutUser,
  isFirebaseConfigured,
  type User,
} from '../services/firebase';

export type SyncStatus = 'local' | 'synced' | 'syncing' | 'error';

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
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    try {
      setSyncStatus('syncing');
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

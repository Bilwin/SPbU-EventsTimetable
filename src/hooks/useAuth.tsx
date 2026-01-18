'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, AuthState } from '@/types/auth';

type AuthContextValue = AuthState & {
  signIn: (initData: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json() as { authenticated: boolean; user?: AuthUser };
        if (data.authenticated && data.user) {
          setState({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[auth.refreshAuth]', error);
      setState((prev) => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check authentication',
      }));
    }
  }, []);

  const signIn = useCallback(async (initData: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ initData }),
      });

      const data = await response.json() as { success: boolean; user?: AuthUser; error?: string };

      if (data.success && data.user) {
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: data.error || 'Authentication failed',
      });
      return false;
    } catch (error) {
      console.error('[auth.signIn]', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Network error during authentication',
      });
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[auth.signOut]', error);
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

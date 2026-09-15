import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthState } from '../types';
import {
  api,
  setAuthToken,
  clearToken,
  getStoredToken,
  setUnauthorizedHandler,
  type AuthRights,
  type AuthUserDto,
  type LoginResponse,
  type MeResponse,
} from './api';

/**
 * The console's role union, checked rather than cast: the API sends a bare string, and an unknown
 * key must resolve to the *narrowest* role rather than being trusted into `super_admin`.
 */
function isRoleKey(value: string): value is User['roleKey'] {
  return value === 'super_admin' || value === 'admin' || value === 'staff' || value === 'viewer';
}

/**
 * The API sends rights beside the user; the console's `User` carries them on it. Flattening here,
 * once, is what lets every permission gate keep reading `user.panels`/`user.actions`.
 */
function toUser(dto: AuthUserDto, rights: AuthRights): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    roleKey: isRoleKey(dto.roleKey) ? dto.roleKey : 'viewer',
    memberId: dto.memberId,
    panels: rights.panels ?? {},
    actions: rights.actions ?? {},
  };
}

interface AuthContextValue extends AuthState {
  /** `remember` picks the storage the token is kept in; see `setAuthToken` in `api.ts`. */
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    const storedToken = getStoredToken();
    if (storedToken) {
      setAuthToken(storedToken);
      setTokenState(storedToken);
      try {
        const response = await api.get<MeResponse>('/api/auth/me');
        setUser(toUser(response.data.user, response.data.rights));
      } catch {
        clearToken();
        setUser(null);
        setTokenState(null);
      }
    }
    setIsLoading(false);
  }, []);

  // A 401 from any request ends the session: clear the user so the gate renders again. Registered
  // before the restore effect so the very first `/api/auth/me` is already covered.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setTokenState(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // `isLoading` means "we do not yet know whether there is a session" — the boot-time restore only.
  // A sign-in must NOT touch it: the gate is rendered while isLoading is false, so toggling it here
  // would unmount AuthScreen mid-request and throw away the error it is trying to show.
  const login = async (email: string, password: string, remember = true) => {
    const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
    setAuthToken(data.token, remember);
    setTokenState(data.token);
    setUser(toUser(data.user, data.rights));
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
    } finally {
      clearToken();
      setUser(null);
      setTokenState(null);
    }
  };

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
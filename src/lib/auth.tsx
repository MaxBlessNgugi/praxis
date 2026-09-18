import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ActiveOrganization, User, AuthState } from '../types';
import {
  api,
  authApi,
  billingApi,
  vendorApi,
  setAuthToken,
  setEphemeralToken,
  clearToken,
  getStoredToken,
  setUnauthorizedHandler,
  type AuthRights,
  type AuthUserDto,
  type LoginResponse,
  type MeResponse,
  type SignupBody,
  type SubscriptionDto,
  type SupportSessionDto,
} from './api';

/**
 * What the API answers when a reset link is asked for.
 *
 * `canSendEmail` describes the *installation*, not the address that was typed: the answer may not
 * differ between an account and a stranger, or the endpoint becomes a way to find out who has one.
 * `devLink` exists only on a development server with no provider configured.
 */
export interface PasswordResetAnswer {
  message: string;
  canSendEmail: boolean;
  expiresInMinutes: number;
  devLink?: string;
}

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
function toUser(dto: AuthUserDto, rights: AuthRights, organizations: MeResponse['data']['organizations']): User {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    roleKey: isRoleKey(dto.roleKey) ? dto.roleKey : 'viewer',
    roleName: dto.roleName,
    isPlatformAdmin: dto.isPlatformAdmin,
    memberId: dto.memberId,
    panels: rights.panels ?? {},
    actions: rights.actions ?? {},
    organizations,
  };
}

/** The session pieces a sign-in, a switch, or a restore all produce — applied in one place. */
interface SessionPayload {
  token: string;
  user: AuthUserDto;
  rights: AuthRights;
  organization: ActiveOrganization;
  subscription: SubscriptionDto | null;
  organizations: MeResponse['data']['organizations'];
  /** Only a sign-in passes this; a switch and a signup persist by default. */
  remember?: boolean;
}

interface AuthContextValue extends AuthState {
  /**
   * What this church is on, and what it owes.
   *
   * Held with the session rather than fetched by each screen that cares, because two of them — the
   * billing screen and the gate that decides whether the console opens at all — need it on the same
   * first paint. `restoreSession` is also the refresh: it re-reads `/me`, subscription included.
   */
  subscription: SubscriptionDto | null;
  /** `remember` picks the storage the token is kept in; see `setAuthToken` in `api.ts`. */
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  /** A church signing itself up. Answers the same session shape as `login`, so neither is special. */
  signup: (body: SignupBody) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Replace the session's own password. The server mints a fresh token, because the change ends every
   * *other* session on the account and this one must survive it — so the token is stored here rather
   * than left to the caller.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Ask for a reset link. Does not need a session and does not create one. */
  requestPasswordReset: (email: string) => Promise<PasswordResetAnswer>;
  /** Spend an emailed link. Signs nobody in: the console deliberately asks for the password again. */
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  /**
   * Re-reads the church's standing after something changed it. Kept apart from `restoreSession` on
   * purpose: that one is the boot-time "is there a session?" and flashes the splash screen, which is
   * the wrong thing to do to a treasurer who has just asked for a different plan.
   */
  refreshSubscription: () => Promise<void>;
  /**
   * Move this session to another church the account serves. The server answers with a token whose
   * organization claim is the new church and the rights that church's role carries, so this is the
   * whole switch — every panel re-renders from the new session because the state simply changes
   * underneath them.
   */
  switchOrganization: (organizationId: string) => Promise<void>;
  /**
   * The signed-in account renaming itself. The API call and the context update live here rather
   * than in the dialog so the header and the sidebar cannot show a stale name afterwards.
   */
  renameSelf: (name: string) => Promise<void>;
  /**
   * The church a Praxis operator is currently looking inside, or null in an ordinary session.
   *
   * Held here because it describes the *session* rather than any one screen: the strip that says
   * whose access this is renders above every panel, and the moment it stopped being true the operator
   * would need to be told everywhere at once.
   */
  supportSession: SupportSessionDto | null;
  /** Swap the operator's own session for the visit's, keeping the original to hand back. */
  enterSupportSession: (session: SupportSessionDto) => Promise<void>;
  /** Close the visit — from inside it, so the church's log records the end as well as the start. */
  exitSupportSession: (reason: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [supportSession, setSupportSession] = useState<SupportSessionDto | null>(null);
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
        setUser(toUser(response.data.user, response.data.rights, response.data.organizations));
        setOrganization(response.data.organization);
        setSubscription(response.data.subscription);
      } catch {
        clearToken();
        setUser(null);
        setOrganization(null);
        setSubscription(null);
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
      setOrganization(null);
      setSubscription(null);
      setSupportSession(null);
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
  // A sign-in, a church switch, and a signup all land here: one place applies a session, so no
  // caller can update the token and forget the rights, or the reverse.
  const applySession = useCallback((payload: SessionPayload) => {
    setAuthToken(payload.token, payload.remember);
    setTokenState(payload.token);
    setUser(toUser(payload.user, payload.rights, payload.organizations));
    setOrganization(payload.organization);
    setSubscription(payload.subscription);
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
    applySession({ ...data, remember });
  };

  /**
   * A church signing itself up: the same session a sign-in would have produced, so from here on there
   * is one kind of session and nothing downstream asks how it was made.
   */
  const signup = async (body: SignupBody) => {
    const { data } = await authApi.signup(body);
    applySession(data);
  };

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const { data } = await authApi.switchOrganization({ organizationId });
      applySession(data);
    },
    [applySession],
  );

  const refreshSubscription = async () => {
    const envelope = await billingApi.subscription();
    setSubscription(envelope.data);
  };

  /**
   * Step inside a church as an operator.
   *
   * The visit's token goes into memory and the operator's own stays in storage, so closing the tab
   * ends the visit rather than resuming it. The whole session is then re-read — `/me` answers for the
   * *visited* church, with the support role's rights — which is what makes every panel below behave
   * exactly as it would for that church's own administrator, with nothing for a screen to special-case.
   */
  const enterSupportSession = async (session: SupportSessionDto) => {
    setEphemeralToken(session.token);
    try {
      const response = await api.get<MeResponse>('/api/auth/me');
      setUser(toUser(response.data.user, response.data.rights, response.data.organizations));
      setOrganization(response.data.organization);
      setSubscription(response.data.subscription);
      setSupportSession(session);
      setTokenState(session.token);
    } catch (error) {
      setEphemeralToken(null);
      setSupportSession(null);
      throw error;
    }
  };

  /**
   * Close the visit and hand the operator their own session back.
   *
   * The closing line is written from inside the session, so a failure to write it must not strand the
   * operator inside another church: the local session is restored either way, and the visit is over
   * when the token expires at the latest.
   */
  const exitSupportSession = async (reason: string) => {
    try {
      await vendorApi.endSupportSession({ reason });
    } catch {
      // Deliberately swallowed: the visit is over either way, and the operator is handed their own
      // session back below. A failed closing line is a note for the vendor console, not a blockage.
    } finally {
      setEphemeralToken(null);
      setSupportSession(null);
      await restoreSession();
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { data } = await authApi.changePassword({ currentPassword, newPassword });
    setAuthToken(data.token);
    setTokenState(data.token);
  };

  const requestPasswordReset = async (email: string) => {
    const { data } = await authApi.requestPasswordReset({ email });
    return data;
  };

  const confirmPasswordReset = async (token: string, password: string) => {
    await authApi.confirmPasswordReset({ token, password });
  };

  const renameSelf = useCallback(async (name: string) => {
    const { data } = await authApi.updateOwnProfile({ name });
    setUser((current) => (current ? { ...current, name: data.name } : current));
  }, []);

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // A revoked or expired token is a session that is already over; the local one is cleared below
      // regardless, so signing out never depends on the server answering.
    } finally {
      clearToken();
      setUser(null);
      setOrganization(null);
      setSubscription(null);
      setSupportSession(null);
      setTokenState(null);
    }
  };

  const value: AuthContextValue = {
    user,
    organization,
    subscription,
    token,
    isAuthenticated,
    isLoading,
    login,
    signup,
    switchOrganization,
    renameSelf,
    logout,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    restoreSession,
    refreshSubscription,
    supportSession,
    enterSupportSession,
    exitSupportSession,
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
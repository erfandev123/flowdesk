import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api, setActiveBusiness, getActiveBusiness, API_ENDPOINTS } from '../lib/api';
import type { Business } from '../types';

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface Workspace {
  id: string;
  name: string;
  currency: string;
  role: string;
  logo_text: string;
}

interface MeResponse {
  user: SessionUser;
  businessId: string | null;
  role: string | null;
  businesses: Workspace[];
}

interface AuthValue {
  user: SessionUser | null;
  business: Business | null;
  businesses: Workspace[];
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string; email: string; password: string; business_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchBusiness: (id: string) => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Workspace[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBusiness = useCallback(async () => {
    try {
      const b = await api.get<Business>(API_ENDPOINTS.BUSINESS);
      setBusiness(b);
      setActiveBusiness(b.id);
    } catch {
      setBusiness(null);
    }
  }, []);

  /**
   * Load the signed-in user, the workspaces they belong to, and the active
   * workspace in one place. Reused by the initial load, by sign-in and by
   * sign-up so the three paths can never drift apart.
   */
  const loadSession = useCallback(async () => {
    const me = await api.get<MeResponse>(API_ENDPOINTS.AUTH_ME);
    setUser(me.user);
    setBusinesses(me.businesses);
    setRole(me.role ?? null);

    const target = me.businessId || getActiveBusiness() || me.businesses[0]?.id;
    if (target) {
      setActiveBusiness(target);
      const b = await api.get<Business>(API_ENDPOINTS.BUSINESS);
      setBusiness(b);
    }
    return me;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadSession();
      } catch {
        setUser(null);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    await api.post(API_ENDPOINTS.AUTH_LOGIN, { email, password });
    await loadSession();
  }, [loadSession]);

  const register = useCallback(async (payload: {
    name: string; email: string; password: string; business_name: string;
  }) => {
    await api.post(API_ENDPOINTS.AUTH_REGISTER, payload);
    await loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    await api.post(API_ENDPOINTS.AUTH_LOGOUT);
    setUser(null);
    setBusiness(null);
    setRole(null);
    localStorage.removeItem('fd_business');
  }, []);

  const switchBusiness = useCallback(async (id: string) => {
    const res = await api.post<{ businessId: string; role: string }>(
      API_ENDPOINTS.AUTH_SWITCH, { business_id: id },
    );
    setActiveBusiness(id);
    setRole(res.role ?? null);
    const b = await api.get<Business>(API_ENDPOINTS.BUSINESS);
    setBusiness(b);
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    business,
    businesses,
    role,
    loading,
    login,
    register,
    logout,
    switchBusiness,
    refreshBusiness: loadBusiness,
  }), [user, business, businesses, role, loading, login, register, logout, switchBusiness, loadBusiness]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

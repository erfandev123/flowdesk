import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api, setActiveBusiness, getActiveBusiness } from '../lib/api';
import type { Business } from '../types';

interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface AuthValue {
  user: SessionUser | null;
  business: Business | null;
  businesses: { id: string; name: string; currency: string; role: string; logo_text: string }[];
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
  const [businesses, setBusinesses] = useState<AuthValue['businesses']>([]);
  const [loading, setLoading] = useState(true);

  const loadBusiness = useCallback(async () => {
    try {
      const b = await api.get<Business>('/business');
      setBusiness(b);
      setActiveBusiness(b.id);
    } catch {
      setBusiness(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{
          user: SessionUser; businessId: string | null;
          businesses: AuthValue['businesses'];
        }>('/auth/me');
        setUser(res.user);
        setBusinesses(res.businesses);
        const target = res.businessId || getActiveBusiness() || res.businesses[0]?.id;
        if (target) {
          setActiveBusiness(target);
          const b = await api.get<Business>('/business');
          setBusiness(b);
        }
      } catch {
        setUser(null);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: SessionUser; businessId: string | null }>('/auth/login', {
      email, password,
    });
    setUser(res.user);
    if (res.businessId) {
      setActiveBusiness(res.businessId);
      const b = await api.get<Business>('/business');
      setBusiness(b);
      const me = await api.get<{ businesses: AuthValue['businesses'] }>('/auth/me');
      setBusinesses(me.businesses);
    }
  }, []);

  const register = useCallback(async (payload: {
    name: string; email: string; password: string; business_name: string;
  }) => {
    const res = await api.post<{ user: SessionUser; businessId: string }>('/auth/register', payload);
    setUser(res.user);
    setActiveBusiness(res.businessId);
    const b = await api.get<Business>('/business');
    setBusiness(b);
    const me = await api.get<{ businesses: AuthValue['businesses'] }>('/auth/me');
    setBusinesses(me.businesses);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
    setBusiness(null);
    localStorage.removeItem('fd_business');
  }, []);

  const switchBusiness = useCallback(async (id: string) => {
    await api.post('/auth/switch', { business_id: id });
    setActiveBusiness(id);
    const b = await api.get<Business>('/business');
    setBusiness(b);
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    business,
    businesses,
    loading,
    login,
    register,
    logout,
    switchBusiness,
    refreshBusiness: loadBusiness,
  }), [user, business, businesses, loading, login, register, logout, switchBusiness, loadBusiness]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

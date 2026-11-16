import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api';

/**
 * Session state shared by every page.
 *   me          = GET /api/auth/me  ({ user, roleChain, permissions, grantedBy })
 *   can(perm)   = UI convenience only: hides links/buttons. The SERVER (E1 guard) is the real check.
 */
const AuthContext = createContext(null);

/** Where each role lands after signing in. */
export const homeFor = (role) => ({ ADMIN: '/admin', SELLER: '/seller', FINANCE: '/ops', WAREHOUSE_STAFF: '/ops', CEO: '/ops' }[role] || '/');

/** Which sign-in page each role uses (shown when someone uses the wrong one). */
export const PORTALS = {
  CUSTOMER: { to: '/login', label: 'customer sign-in' },
  SELLER: { to: '/seller/login', label: 'Seller Central' },
  FINANCE: { to: '/staff/login', label: 'staff sign-in' },
  WAREHOUSE_STAFF: { to: '/staff/login', label: 'staff sign-in' },
  CEO: { to: '/staff/login', label: 'staff sign-in' },
  ADMIN: { to: '/admin/login', label: 'admin console' },
};

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setMe(null); setLoading(false); return null; }
    try {
      const data = await api('/auth/me');
      setMe(data);
      return data;
    } catch {
      tokenStore.clear();
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear();
      setMe(null);
      setNotice('Your session ended. Please sign in again.');
    };
    window.addEventListener('team3:unauthorized', onUnauthorized);
    return () => window.removeEventListener('team3:unauthorized', onUnauthorized);
  }, []);

  /** portal: 'admin' | 'staff'. Staff pages also send the role the page is for; the server compares it with the account. */
  const login = useCallback(async (email, password, portal, role) => {
    const body = { email, password, portal, ...(role ? { role } : {}) };
    const { token } = await api('/auth/login', { method: 'POST', body, auth: false });
    tokenStore.set(token);
    setNotice('');
    return refresh();
  }, [refresh]);

  const register = useCallback(async (name, email, password) => {
    await api('/auth/register', { method: 'POST', body: { name, email, password }, auth: false });
    return login(email, password, 'staff', 'CUSTOMER');
  }, [login]);

  /** Server-side logout: bumps token_version, so this token (and any copy of it) stops working. */
  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* already invalid */ }
    tokenStore.clear();
    setMe(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { token } = await api('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
    tokenStore.set(token);
    return refresh();
  }, [refresh]);

  const updateName = useCallback(async (name) => {
    const data = await api('/auth/profile', { method: 'PUT', body: { name } });
    setMe(data);
    return data;
  }, []);

  const value = useMemo(() => ({
    me, loading, notice, setNotice, login, register, logout, refresh, changePassword, updateName,
    can: (permission) => !!me && me.permissions.includes(permission),
  }), [me, loading, notice, login, register, logout, refresh, changePassword, updateName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

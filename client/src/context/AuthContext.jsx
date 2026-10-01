import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints.js';
import { refreshAccessToken, sessionHint, setAccessToken, setAuthLostHandler } from '../api/client.js';
import { ROLES } from '../constants/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | guest
  const qc = useQueryClient();

  const loadMe = useCallback(async () => {
    const { user: me } = await authApi.me();
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  // Restore the session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sessionHint.get()) {
        setStatus('guest');
        return;
      }
      try {
        await refreshAccessToken();
        if (alive) await loadMe();
      } catch {
        sessionHint.set(false);
        if (alive) setStatus('guest');
      }
    })();
    setAuthLostHandler(() => {
      sessionHint.set(false);
      setUser(null);
      setStatus('guest');
    });
    return () => {
      alive = false;
    };
  }, [loadMe]);

  const applySession = useCallback(
    (data) => {
      setAccessToken(data.accessToken);
      sessionHint.set(true);
      setUser(data.user);
      setStatus('authenticated');
      qc.invalidateQueries();
      return data.user;
    },
    [qc]
  );

  const login = useCallback(async (values) => applySession(await authApi.login(values)), [applySession]);
  const register = useCallback(async (values) => applySession(await authApi.register(values)), [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      sessionHint.set(false);
      setUser(null);
      setStatus('guest');
      qc.clear();
    }
  }, [qc]);

  const value = useMemo(() => {
    const role = user?.role;
    return {
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
      refreshUser: loadMe,
      setUser,
      applySession,
      isSuperAdmin: role === ROLES.SUPER_ADMIN,
      isModerator: role === ROLES.CITY_MODERATOR || role === ROLES.SUPER_ADMIN,
      isClubAdmin: [ROLES.FAN_CLUB_ADMIN, ROLES.CITY_MODERATOR, ROLES.SUPER_ADMIN].includes(role),
    };
  }, [user, status, login, register, logout, loadMe, applySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from '../api';
import { AuthContext } from './authContext';
import { useToast } from './useToast';

// One source of truth for "who is logged in", shared by the header, routes and pages.
export default function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    let cancelled = false;
    api
      .post('/get-me/', { token }, { auth: false })
      .then((data) => {
        if (!cancelled) setUser({ username: data.username });
      })
      .catch((err) => {
        // A rejected token is useless; a network failure may be temporary, so keep it.
        if (!cancelled && err.status >= 400 && err.status < 500) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
      toast.info('Your session has expired. Please log in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, [toast]);

  const login = useCallback(async (usernameOrEmail, password) => {
    const data = await api.post(
      '/login/',
      { username_or_email: usernameOrEmail, password },
      { auth: false },
    );
    setToken(data.token);
    setUser({ username: data.username });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

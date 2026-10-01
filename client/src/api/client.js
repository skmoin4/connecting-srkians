import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Access tokens live in memory only (never localStorage). The refresh token is an httpOnly
 * cookie scoped to /api/v1/auth, so it can't be read by scripts.
 */
let accessToken = null;
let onAuthLost = () => {};

export const setAccessToken = (t) => {
  accessToken = t;
};

/**
 * Non-sensitive hint that a refresh cookie probably exists, so guests don't fire a doomed
 * /auth/refresh (and a console 401) on every page load. The cookie itself stays httpOnly.
 */
const HINT = 'srk.session';
export const sessionHint = {
  get: () => {
    try {
      return localStorage.getItem(HINT) === '1';
    } catch {
      return true; // storage blocked → just try the refresh
    }
  },
  set: (on) => {
    try {
      if (on) localStorage.setItem(HINT, '1');
      else localStorage.removeItem(HINT);
    } catch {
      /* ignore */
    }
  },
};
export const getAccessToken = () => accessToken;
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

export const http = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000 });

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise = null;
const doRefresh = () => axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = doRefresh()
      // 409 = another tab refreshed a moment ago; the cookie jar now has the new token, retry once.
      .catch((err) => (err.response?.status === 409 ? new Promise((r) => setTimeout(r, 400)).then(doRefresh) : Promise.reject(err)))
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');
    if (status === 401 && original && !original._retry && !isAuthCall && accessToken) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        setAccessToken(null);
        onAuthLost();
      }
    }
    return Promise.reject(error);
  }
);

/** Unwraps the standard { success, message, data } envelope. */
export const unwrap = (p) => p.then((r) => r.data.data);

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.code === 'ECONNABORTED' ? 'The request timed out.' : err?.message === 'Network Error' ? 'Cannot reach the server.' : fallback);

export const fieldErrors = (err) => err?.response?.data?.errors || [];

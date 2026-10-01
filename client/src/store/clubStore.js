import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tiny persisted store for the fan-club dashboard's "active club" (admins may manage several).
 * Uses useSyncExternalStore — no extra state library needed.
 */
const KEY = 'srk.activeClub';
const listeners = new Set();

const read = () => {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
};

export function setActiveClubId(id) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useActiveClubId() {
  const id = useSyncExternalStore(subscribe, read, () => null);
  const set = useCallback((v) => setActiveClubId(v), []);
  return [id, set];
}

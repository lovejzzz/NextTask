import { useCallback, useState } from 'react';

import type { Pursuit } from '../lib/pursuit';

const STORAGE_KEY = 'next-task:pursuit';

function load(): Pursuit | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.goal === 'string' && typeof parsed.baseline === 'number') return parsed as Pursuit;
    }
  } catch {
    // ignore parse/storage failures
  }
  return null;
}

function save(pursuit: Pursuit | null) {
  try {
    if (pursuit) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pursuit));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

/**
 * Boardy's standing intention, persisted across sessions — the continuity that
 * turns momentary wants into a life. He commits to one goal at a time; `set` it
 * when he adopts a new focus, `clear` it when it's done or abandoned.
 */
export function useBoardyPursuit() {
  const [pursuit, setPursuitState] = useState<Pursuit | null>(load);

  const set = useCallback((next: Pursuit) => {
    setPursuitState(next);
    save(next);
  }, []);

  const clear = useCallback(() => {
    setPursuitState(null);
    save(null);
  }, []);

  return { pursuit, set, clear };
}

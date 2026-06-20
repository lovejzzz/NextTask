import { useCallback, useState } from 'react';

import { parseShipped, storageKey } from '../lib/momentum';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the counter still lives in memory for the session.
  }
}

/**
 * Tracks tasks shipped to Done today (experimental "momentum" streak).
 * Resets naturally each day because the storage key embeds the date.
 */
export function useMomentum() {
  const [shippedToday, setShippedToday] = useState<number>(() => parseShipped(safeGet(storageKey())));

  const recordShip = useCallback(() => {
    setShippedToday(() => {
      // Re-read so a day rollover (or another tab) starts from the right base.
      const key = storageKey();
      const next = parseShipped(safeGet(key)) + 1;
      safeSet(key, String(next));
      return next;
    });
  }, []);

  return { shippedToday, recordShip };
}

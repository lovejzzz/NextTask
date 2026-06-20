import { useCallback, useState } from 'react';

import { lastNDayKeys, parseShipped, storageKey } from '../lib/momentum';

const WEEK_DAYS = 7;

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
 * Tracks tasks shipped to Done (experimental "momentum"). Exposes today's count,
 * a 7-day series for the sparkline, and the weekly total. Each day lives under
 * its own storage key, so the streak resets naturally at midnight.
 */
export function useMomentum() {
  const [week, setWeek] = useState<number[]>(() => lastNDayKeys(WEEK_DAYS).map((key) => parseShipped(safeGet(key))));

  const recordShip = useCallback(() => {
    const key = storageKey();
    const next = parseShipped(safeGet(key)) + 1;
    safeSet(key, String(next));
    setWeek((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = next; // last entry is today
      return copy;
    });
  }, []);

  const shippedToday = week[week.length - 1] ?? 0;
  const weekTotal = week.reduce((sum, value) => sum + value, 0);

  return { shippedToday, week, weekTotal, recordShip };
}

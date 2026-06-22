import { useCallback, useState } from 'react';

import { recordGrowth, type GrowthEntry, type GrowthMove, type GrowthSignal } from '../lib/growth';

const STORAGE_KEY = 'next-task:growth-ledger';
const CAP = 100;

function load(): GrowthEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(-CAP);
    }
  } catch {
    // ignore parse/storage failures
  }
  return [];
}

function save(ledger: GrowthEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // ignore storage failures
  }
}

/**
 * Boardy's developmental autobiography, persisted. The growth model (growth.ts)
 * decides *what* counts as growth; this is where an actual moment of it — a routine
 * crystallized, an ability asked for, a drift corrected — gets written down and
 * carried across sessions, so he can recount honestly how he's grown from a real
 * trail rather than an assertion. Append-only via recordGrowth (which de-dupes).
 */
export function useGrowthLedger() {
  const [ledger, setLedger] = useState<GrowthEntry[]>(load);

  const record = useCallback((signal: GrowthSignal, move: GrowthMove) => {
    setLedger((current) => {
      const next = recordGrowth(current, signal, move);
      if (next !== current) save(next);
      return next;
    });
  }, []);

  return { ledger, record };
}

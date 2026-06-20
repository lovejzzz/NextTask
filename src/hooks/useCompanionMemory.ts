import { useCallback, useEffect, useRef, useState } from 'react';

import {
  daysBetween,
  emptyMemory,
  recordShip as applyShip,
  recordVisit,
  type CompanionMemory,
} from '../lib/companionMemory';

const STORAGE_KEY = 'next-task:companion-memory';

function load(): CompanionMemory {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.totalShipped === 'number') return parsed as CompanionMemory;
    }
  } catch {
    // ignore parse/storage failures
  }
  return emptyMemory();
}

function save(memory: CompanionMemory) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // ignore storage failures
  }
}

/**
 * Persistent cross-session memory for the companion. Loads prior history, counts
 * this visit once the lab is open, and records ships toward streak/total.
 */
export function useCompanionMemory(enabled: boolean) {
  const [memory, setMemory] = useState<CompanionMemory>(load);
  // Captured once at load, before recordVisit overwrites lastSeen.
  const [awayDaysAtLoad] = useState(() => Math.max(0, daysBetween(load().lastSeen, Date.now())));
  const visited = useRef(false);

  useEffect(() => {
    if (!enabled || visited.current) return;
    visited.current = true;
    // Defer out of the effect body so the setState isn't synchronous.
    queueMicrotask(() =>
      setMemory((current) => {
        const next = recordVisit(current);
        save(next);
        return next;
      }),
    );
  }, [enabled]);

  const recordShip = useCallback(() => {
    setMemory((current) => {
      const next = applyShip(current);
      save(next);
      return next;
    });
  }, []);

  return { memory, awayDaysAtLoad, recordShip };
}

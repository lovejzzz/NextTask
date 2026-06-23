import { useCallback, useState } from 'react';

import type { Reminder } from '../lib/reminders';

const STORAGE_KEY = 'next-task:reminders';
const CAP = 50;

function load(): Reminder[] {
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

function save(reminders: Reminder[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // ignore storage failures
  }
}

/**
 * Tier 3: Boardy's reminder store — his first real, persisted, reversible action in
 * the world (such as his world is). Add returns the new reminder so the caller can
 * offer an undo; remove is the undo; markFired stops a due reminder from re-firing.
 */
export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(load);

  const add = useCallback((text: string, dueAt: number | null): Reminder => {
    const reminder: Reminder = { id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, dueAt, createdAt: Date.now() };
    setReminders((current) => {
      const next = [...current, reminder].slice(-CAP);
      save(next);
      return next;
    });
    return reminder;
  }, []);

  const remove = useCallback((id: string) => {
    setReminders((current) => {
      const next = current.filter((r) => r.id !== id);
      save(next);
      return next;
    });
  }, []);

  const markFired = useCallback((id: string) => {
    setReminders((current) => {
      const next = current.map((r) => (r.id === id ? { ...r, firedAt: Date.now() } : r));
      save(next);
      return next;
    });
  }, []);

  return { reminders, add, remove, markFired };
}

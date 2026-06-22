import { useEffect, useRef, useState } from 'react';

import { deriveEvents, recordEvent, type BoardEvent } from '../lib/history';
import type { Task } from '../lib/types';

const STORAGE_KEY = 'next-task:board-history';
const CAP = 500;

function load(): BoardEvent[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((e) => e && typeof e.id === 'string').slice(-CAP);
    }
  } catch {
    // ignore parse/storage failures
  }
  return [];
}

function save(events: BoardEvent[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore storage failures
  }
}

/**
 * Boardy's lived history — the board's own changelog, recorded by *observing* its
 * state transitions (a diff between renders), so an event lands no matter what
 * caused the change. Persisted across sessions; feeds reconstructive episodic
 * memory (`recallHistory`). The first observed board is the baseline, not a wall
 * of "created" events.
 */
export function useBoardHistory(tasks: Task[]) {
  const [events, setEvents] = useState<BoardEvent[]>(load);
  const prevRef = useRef<Task[] | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = tasks;
    if (prev === null) return; // establish a baseline; don't record the initial load
    const fresh = deriveEvents(prev, tasks, Date.now());
    if (!fresh.length) return;
    setEvents((current) => {
      const next = fresh.reduce((log, event) => recordEvent(log, event), current);
      save(next);
      return next;
    });
  }, [tasks]);

  return events;
}

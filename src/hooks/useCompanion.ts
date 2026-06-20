import { useCallback, useEffect, useState } from 'react';

import { quipFor, readMood, type CompanionSignals } from '../lib/companion';

type BoardSignals = Pick<CompanionSignals, 'active' | 'overdue' | 'inProgress' | 'shippedToday'>;

const HEARTBEAT_MS = 5_000;

/**
 * Drives "The Board Has Feelings": blends live board signals with behavioural
 * ones (idle time, fidgeting, pokes) into a mood + a line of dialogue.
 *
 * - `registerActivity` — real progress; resets idle + fidget count.
 * - `registerFidget` — cosmetic, no-op actions (recoloring, theme flips).
 * - `poke` — the user prodding the creature; coughs up a fresh line.
 */
export function useCompanion(board: BoardSignals, enabled: boolean) {
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const [fidgets, setFidgets] = useState(0);
  const [pokes, setPokes] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Heartbeat so idle-driven moods surface even when nothing re-renders.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNowTick(Date.now()), HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  const idleMs = Math.max(0, nowTick - lastActivityAt);
  const signals: CompanionSignals = { ...board, fidgets, idleMs };
  const mood = readMood(signals);
  // Mood selects the pool; pokes index within it — so a mood change alone yields
  // a fresh line, and prodding cycles lines within the current mood.
  const quip = quipFor(mood, pokes);

  const registerActivity = useCallback(() => {
    setLastActivityAt(Date.now());
    setFidgets(0);
  }, []);

  const registerFidget = useCallback(() => {
    setLastActivityAt(Date.now()); // still interaction — just not progress
    setFidgets((value) => value + 1);
  }, []);

  const poke = useCallback(() => {
    setLastActivityAt(Date.now());
    setPokes((value) => value + 1);
  }, []);

  return { mood, quip, idleMs, registerActivity, registerFidget, poke };
}

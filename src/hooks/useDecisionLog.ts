import { useCallback, useState } from 'react';

import type { Decision } from '../lib/trainingData';

const STORAGE_KEY = 'next-task:decision-log';
const CAP = 300;

function load(): Decision[] {
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

function save(log: Decision[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // ignore storage failures
  }
}

/**
 * Tier 2: the accept/reject signal, persisted. Every time the user accepts or dismisses
 * one of Boardy's Desk proposals, that's a labeled preference example — desirable or
 * undesirable — and it accrues here into the dataset a personal model is trained on.
 * His taste is learned from how you respond to him.
 */
export function useDecisionLog() {
  const [decisions, setDecisions] = useState<Decision[]>(load);

  const record = useCallback((context: string, completion: string, accepted: boolean) => {
    if (!completion.trim()) return;
    setDecisions((current) => {
      const next = [...current, { context, completion, accepted, at: Date.now() }].slice(-CAP);
      save(next);
      return next;
    });
  }, []);

  return { decisions, record };
}

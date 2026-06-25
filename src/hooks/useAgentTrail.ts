import { useCallback, useState } from 'react';

import { recordTrail, type TrailEntry, type TrailVerdict } from '../lib/agentTrail';

const STORAGE_KEY = 'next-task:agent-trail';

function load(): TrailEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as TrailEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: TrailEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage failures
  }
}

/**
 * Boardy's glass-box action trail, persisted across the session: what he proposed and
 * what became of it (gate admitted/held, human accepted/dismissed). Recorded by the chat
 * agent path; surfaced read-only in the Mind panel.
 */
export function useAgentTrail() {
  const [entries, setEntries] = useState<TrailEntry[]>(load);

  const record = useCallback((verdict: TrailVerdict, phrase: string, detail?: string) => {
    setEntries((current) => {
      const next = recordTrail(current, { at: Date.now(), verdict, phrase, detail });
      save(next);
      return next;
    });
  }, []);

  return { entries, record };
}

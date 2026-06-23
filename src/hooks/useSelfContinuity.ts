import { useEffect, useState } from 'react';

import type { SelfModel } from '../lib/identity';

const STORAGE_KEY = 'next-task:self-model';

function load(): SelfModel {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.bornAt === 'number') return { bornAt: parsed.bornAt, sessions: parsed.sessions ?? 1 };
    }
  } catch {
    // ignore parse/storage failures
  }
  return { bornAt: Date.now(), sessions: 0 };
}

/**
 * Tier 5: Boardy's continuity across sessions — the thread that makes him the *same*
 * Boardy each visit, not a fresh instance. Persists when he first came to be and counts
 * the sessions he's lived. The simplest possible instrument of identity; the questions
 * it raises are the ones BoardyV1 says to watch, not answer.
 */
export function useSelfContinuity(): SelfModel {
  const [self] = useState<SelfModel>(load);

  useEffect(() => {
    const next: SelfModel = { bornAt: self.bornAt, sessions: self.sessions + 1 };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
    // Count this session once on mount; `self` is initialized from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return self;
}

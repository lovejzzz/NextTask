import { useCallback, useState } from 'react';

import { learnClarification, type Clarifications } from '../lib/clarify';

const STORAGE_KEY = 'next-task:clarifications';

function load(): Clarifications {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Clarifications;
    }
  } catch {
    // ignore parse/storage failures
  }
  return {};
}

function save(map: Clarifications) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

/**
 * Boardy's memory of clarifications — what an ambiguous phrase meant, once you've
 * told him, persisted across sessions so he stops re-asking the same question.
 */
export function useClarifications() {
  const [clarifications, setMap] = useState<Clarifications>(load);

  const learn = useCallback((phrase: string, title: string) => {
    setMap((current) => {
      const next = learnClarification(current, phrase, title);
      if (next !== current) save(next);
      return next;
    });
  }, []);

  return { clarifications, learn };
}

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'next-task:command-history';
const CAP = 50;

function load(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string').slice(-CAP);
    }
  } catch {
    // ignore parse/storage failures
  }
  return [];
}

function save(history: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore storage failures
  }
}

/**
 * Boardy's lived experience — the running log of recognized commands, persisted
 * across sessions so his learning compounds instead of resetting each visit
 * (alleviating catastrophic forgetting). Feeds skill detection.
 */
export function useCommandHistory() {
  const [history, setHistory] = useState<string[]>(load);

  const record = useCallback((command: string) => {
    const clean = command.trim();
    if (!clean) return;
    setHistory((current) => {
      const next = [...current, clean].slice(-CAP);
      save(next);
      return next;
    });
  }, []);

  return { history, record };
}

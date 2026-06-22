import { useCallback, useState } from 'react';

const STORAGE_KEY = 'next-task:unmet-asks';
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

function save(asks: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(asks));
  } catch {
    // ignore storage failures
  }
}

/**
 * The other half of lived experience: the asks Boardy *couldn't* meet. Where
 * useCommandHistory remembers what he could do (and learns skills from it), this
 * remembers what he couldn't — the raw material the autonomous growth model reads
 * to sense his own capability gaps and ask for the primitives he's missing
 * (growth.ts). Persisted across sessions so a recurring need compounds into a
 * signal instead of resetting each visit.
 */
export function useUnmetAsks() {
  const [unmet, setUnmet] = useState<string[]>(load);

  const record = useCallback((ask: string) => {
    const clean = ask.trim();
    // One- or two-word inputs ("hi", "thanks", "cool") are chit-chat, not unmet
    // capability asks — don't let them masquerade as gaps.
    if (clean.split(/\s+/).length < 3) return;
    setUnmet((current) => {
      const next = [...current, clean].slice(-CAP);
      save(next);
      return next;
    });
  }, []);

  return { unmet, record };
}

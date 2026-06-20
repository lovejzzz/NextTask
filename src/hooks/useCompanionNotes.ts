import { useCallback, useState } from 'react';

import { addNote as applyAdd, type CompanionNote } from '../lib/companionNotes';

const STORAGE_KEY = 'next-task:companion-notes';

function load(): CompanionNote[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((n) => n && typeof n.text === 'string');
    }
  } catch {
    // ignore parse/storage failures
  }
  return [];
}

function save(notes: CompanionNote[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore storage failures
  }
}

/** Persistent "things you told me" notes for the companion. */
export function useCompanionNotes() {
  const [notes, setNotes] = useState<CompanionNote[]>(load);

  const addNote = useCallback((fact: string) => {
    setNotes((current) => {
      const next = applyAdd(current, fact);
      save(next);
      return next;
    });
  }, []);

  const clearNotes = useCallback(() => {
    setNotes([]);
    save([]);
  }, []);

  return { notes, addNote, clearNotes };
}

import { useCallback, useState } from 'react';

import { markUndone, recordAudit, type AuditEntry } from '../lib/agency';

const STORAGE_KEY = 'next-task:audit-log';
const CAP = 200;

function load(): AuditEntry[] {
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

function save(log: AuditEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // ignore storage failures
  }
}

/**
 * Tier 3: the glass-box trail of every action Boardy takes. Persisted, so "what has he
 * actually done" is answerable across sessions — the accountability that makes agency
 * trustworthy. record returns the entry's timestamp so the caller can mark it undone.
 */
export function useAuditLog() {
  const [log, setLog] = useState<AuditEntry[]>(load);

  const record = useCallback((entry: Omit<AuditEntry, 'at'>): number => {
    const at = Date.now();
    setLog((current) => {
      const next = recordAudit(current, { ...entry, at });
      save(next);
      return next;
    });
    return at;
  }, []);

  const undo = useCallback((at: number) => {
    setLog((current) => {
      const next = markUndone(current, at);
      save(next);
      return next;
    });
  }, []);

  return { log, record, undo };
}

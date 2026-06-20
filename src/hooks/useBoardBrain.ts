import { useCallback, useEffect, useRef, useState } from 'react';

import { loadBrain, type BrainMessage, type GenerateFn, type OnToken } from '../lib/companionBrain';

const STORAGE_KEY = 'next-task:brain';

export type BrainStatus = 'off' | 'loading' | 'ready' | 'error';

/**
 * Manages the optional in-browser LLM behind "give the board a brain". Loads on
 * explicit opt-in (and auto-resumes if previously enabled), tracks download
 * progress, and exposes a guarded `run` that never throws — callers fall back to
 * the rule-based voice on null. `run` streams tokens when given an `onToken`.
 */
export function useBoardBrain(enabled: boolean) {
  const [status, setStatus] = useState<BrainStatus>('off');
  const [progress, setProgress] = useState(0);
  const generateRef = useRef<GenerateFn | null>(null);
  const autoTried = useRef(false);

  const enable = useCallback(async () => {
    setStatus((current) => (current === 'loading' || current === 'ready' ? current : 'loading'));
    if (generateRef.current) {
      setStatus('ready');
      return;
    }
    setProgress(0);
    try {
      const generate = await loadBrain((ratio) => setProgress(ratio));
      generateRef.current = generate;
      setStatus('ready');
      try {
        window.localStorage.setItem(STORAGE_KEY, 'on');
      } catch {
        // ignore storage failures
      }
    } catch {
      setStatus('error');
    }
  }, []);

  const disable = useCallback(() => {
    generateRef.current = null;
    setStatus('off');
    setProgress(0);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'off');
    } catch {
      // ignore storage failures
    }
  }, []);

  // Auto-resume once if the user opted in on a previous visit.
  useEffect(() => {
    if (!enabled || autoTried.current) return;
    autoTried.current = true;
    let opted = false;
    try {
      opted = window.localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
      opted = false;
    }
    if (!opted) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void enable();
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, enable]);

  const run = useCallback(async (messages: BrainMessage[], onToken?: OnToken): Promise<string | null> => {
    if (!generateRef.current) return null;
    try {
      const output = await generateRef.current(messages, onToken);
      return output || null;
    } catch {
      return null;
    }
  }, []);

  return { status, progress, enable, disable, run };
}

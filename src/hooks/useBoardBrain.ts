import { useCallback, useEffect, useRef, useState } from 'react';

import { buildBrainMessages, loadBrain, type BrainContext, type GenerateFn } from '../lib/companionBrain';
import type { Mood } from '../lib/companion';

const STORAGE_KEY = 'next-task:brain';

export type BrainStatus = 'off' | 'loading' | 'ready' | 'error';

/**
 * Manages the optional in-browser LLM behind "give the board a brain". Loads on
 * explicit opt-in (and auto-resumes if previously enabled), tracks download
 * progress, and exposes a guarded `generate` that never throws — callers fall
 * back to the rule-based voice on null.
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
    // Defer out of the effect body so the load (and its setState) isn't synchronous.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void enable();
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, enable]);

  const generate = useCallback(async (mood: Mood, context: BrainContext): Promise<string | null> => {
    if (!generateRef.current) return null;
    try {
      const line = await generateRef.current(buildBrainMessages(mood, context));
      return line || null;
    } catch {
      return null;
    }
  }, []);

  return { status, progress, enable, disable, generate };
}

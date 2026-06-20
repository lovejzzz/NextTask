import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Secret experimental mode.
 *
 * The mode is hidden from the normal UI and is toggled by tapping the app logo
 * three times in quick succession. While enabled, the app surfaces creative,
 * still-in-the-oven features that are not part of the stable experience. The
 * preference is persisted so a refresh keeps the lab open.
 */
const STORAGE_KEY = 'next-task:experimental-mode';
const TAP_WINDOW_MS = 1200;
const TAPS_REQUIRED = 3;

export type ExperimentalToggle = 'on' | 'off';

function readInitial(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function useExperimentalMode() {
  const [enabled, setEnabled] = useState<boolean>(readInitial);
  const [lastToggle, setLastToggle] = useState<ExperimentalToggle | null>(null);
  const tapsRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Ignore storage failures (private mode, quota); state still works in-memory.
    }
  }, [enabled]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const registerLogoTap = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    tapsRef.current += 1;

    if (tapsRef.current >= TAPS_REQUIRED) {
      tapsRef.current = 0;
      setEnabled((prev) => {
        const next = !prev;
        setLastToggle(next ? 'on' : 'off');
        return next;
      });
      return;
    }

    timerRef.current = window.setTimeout(() => {
      tapsRef.current = 0;
      timerRef.current = null;
    }, TAP_WINDOW_MS);
  }, []);

  const disable = useCallback(() => {
    tapsRef.current = 0;
    setEnabled(false);
    setLastToggle('off');
  }, []);

  const acknowledgeToggle = useCallback(() => setLastToggle(null), []);

  return { enabled, registerLogoTap, disable, lastToggle, acknowledgeToggle };
}

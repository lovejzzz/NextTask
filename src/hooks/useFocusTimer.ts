import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A Pomodoro-style countdown for the experimental Focus Timer.
 *
 * Counts down from `durationSec` once started and calls `onComplete` at zero.
 * The timer is expected to be remounted (via a React key) when its target task
 * changes, so it simply re-initialises from `durationSec` on mount.
 */
export function useFocusTimer(durationSec: number, onComplete: () => void) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Keep the latest callback without retriggering the interval effect.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          onCompleteRef.current();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const start = useCallback(() => {
    setRemaining((value) => (value <= 0 ? durationSec : value));
    setRunning(true);
  }, [durationSec]);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(durationSec);
  }, [durationSec]);

  const progress = durationSec > 0 ? 1 - remaining / durationSec : 0;

  return { remaining, running, progress, start, pause, reset };
}

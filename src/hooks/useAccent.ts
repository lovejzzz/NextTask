import { useCallback, useEffect, useState } from 'react';

import { accentById, DEFAULT_ACCENT_ID, nextAccentId } from '../lib/accents';

const STORAGE_KEY = 'next-task:accent';

function safeGet(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT_ID;
  } catch {
    return DEFAULT_ACCENT_ID;
  }
}

function clearAccentVars() {
  const root = document.documentElement;
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-2');
  root.style.removeProperty('--gradient-accent');
}

/**
 * Experimental accent themes. Applies the chosen palette to the document root
 * while `enabled`, and cleanly reverts to the stock theme when the lab is off
 * (or when "Indigo", the default, is selected).
 */
export function useAccent(enabled: boolean) {
  const [accentId, setAccentId] = useState<string>(safeGet);

  useEffect(() => {
    if (!enabled || accentId === DEFAULT_ACCENT_ID) {
      clearAccentVars();
      return;
    }
    const accent = accentById(accentId);
    const root = document.documentElement;
    root.style.setProperty('--accent', accent.accent);
    root.style.setProperty('--accent-2', accent.accent2);
    root.style.setProperty(
      '--gradient-accent',
      `linear-gradient(135deg, ${accent.accent} 0%, ${accent.accent2} 100%)`,
    );
    return clearAccentVars;
  }, [enabled, accentId]);

  // Cycle to the next accent and return its label (for a toast).
  const cycle = useCallback(() => {
    let label = '';
    setAccentId((prev) => {
      const id = nextAccentId(prev);
      label = accentById(id).label;
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // Ignore storage failures; the in-memory selection still applies.
      }
      return id;
    });
    return label;
  }, []);

  return { accentId, cycle };
}

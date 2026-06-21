import { useCallback, useState } from 'react';

import type { Tool } from '../lib/tools';

const STORAGE_KEY = 'next-task:tools';
const MAX_TOOLS = 12;

function load(): Tool[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((t) => t && typeof t.name === 'string' && Array.isArray(t.steps));
    }
  } catch {
    // ignore parse/storage failures
  }
  return [];
}

function save(tools: Tool[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch {
    // ignore storage failures
  }
}

/** Persistent, board-composed tools (macros) the companion can run. */
export function useTools() {
  const [tools, setTools] = useState<Tool[]>(load);

  const add = useCallback((tool: Tool) => {
    setTools((current) => {
      const without = current.filter((t) => t.name.toLowerCase() !== tool.name.toLowerCase());
      const next = [...without, tool].slice(-MAX_TOOLS);
      save(next);
      return next;
    });
  }, []);

  const get = useCallback((name: string) => tools.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null, [tools]);

  return { tools, names: tools.map((t) => t.name), add, get };
}

/**
 * Boardy's learning loop. Inspired by Voyager's skill library and Hermes Agent's
 * automated skill creation: when Boardy notices he keeps doing the same sequence
 * of commands, he can save it as a reusable skill (a Tool) — turning lived
 * experience into procedural memory. Safe by construction: a "skill" is just a
 * composition of commands the board already understands (no codegen).
 */
const STOP = new Set(['the', 'my', 'a', 'an', 'to', 'all', 'task', 'tasks', 'and', 'then', 'is', 'me', 'for']);

/**
 * Find the most recent sequence of consecutive commands that has occurred at
 * least `minRepeat` times in `history` — Boardy's "I keep doing this" signal.
 * Prefers longer sequences. Ignores trivial all-identical repeats.
 */
export function detectRepeatedSequence(history: string[], minRepeat = 2): string[] | null {
  const clean = history.map((h) => h.trim()).filter(Boolean);
  const key = (window: string[]) => window.map((s) => s.toLowerCase()).join(' ||| ');

  for (const len of [3, 2]) {
    if (clean.length < len * minRepeat) continue;
    const counts = new Map<string, number>();
    for (let i = 0; i + len <= clean.length; i++) counts.set(key(clean.slice(i, i + len)), (counts.get(key(clean.slice(i, i + len))) ?? 0) + 1);
    for (let i = clean.length - len; i >= 0; i--) {
      const window = clean.slice(i, i + len);
      const distinct = new Set(window.map((s) => s.toLowerCase()));
      if (distinct.size > 1 && (counts.get(key(window)) ?? 0) >= minRepeat) return window;
    }
  }
  return null;
}

/**
 * Skill retrieval: if the user just did the first step of a saved multi-step
 * skill, offer to finish the rest. Boardy using what he learned, not just
 * hoarding it.
 */
export function suggestSkillContinuation(
  lastCommand: string,
  tools: { name: string; steps: string[] }[],
): { name: string; firstStep: string; remaining: string[] } | null {
  const last = lastCommand.trim().toLowerCase();
  if (!last) return null;
  for (const tool of tools) {
    if (tool.steps.length > 1 && tool.steps[0].trim().toLowerCase() === last) {
      return { name: tool.name, firstStep: tool.steps[0], remaining: tool.steps.slice(1) };
    }
  }
  return null;
}

/** A short, readable, kebab name for a learned skill, derived from its steps. */
export function suggestSkillName(steps: string[]): string {
  const words = steps
    .flatMap((s) => s.toLowerCase().split(/\s+/))
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w));
  const picked = [...new Set(words)].slice(0, 3);
  return picked.length ? picked.join('-') : 'routine';
}

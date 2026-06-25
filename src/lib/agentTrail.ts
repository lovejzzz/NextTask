/**
 * The agent's glass-box trail — what Boardy *proposed*, and what became of it.
 *
 * The board history (history.ts) records facts about the artifact (a task moved, was
 * dropped). This is a different, complementary log: the brain's *cognition* around
 * actions — that it proposed something, whether the gate admitted or held it, and
 * whether the human accepted or dismissed it. Keeping it separate preserves history's
 * "facts, not interpretations" model while still making the agent's choices inspectable
 * in the Mind panel. Append-only, deterministic, no LLM.
 */
export type TrailVerdict = 'admitted' | 'held' | 'accepted' | 'dismissed';

export type TrailEntry = {
  at: number; // epoch ms
  phrase: string; // the proposal, in plain words
  verdict: TrailVerdict;
  detail?: string; // e.g. the gate's reasons when it held
};

const CAP = 50; // a generous backstop; the panel shows only the most recent few

/** Append an entry (append-only, capped). Pure — returns a new array. */
export function recordTrail(log: TrailEntry[], entry: TrailEntry): TrailEntry[] {
  return [...log, entry].slice(-CAP);
}

/** A first-person line for the Mind panel. */
export function formatTrailEntry(entry: TrailEntry): string {
  const verb: Record<TrailVerdict, string> = {
    admitted: 'I proposed (and the gate cleared it)',
    held: 'I proposed, but the gate held it',
    accepted: 'you accepted',
    dismissed: 'you dismissed',
  };
  return `${verb[entry.verdict]}: ${entry.phrase}${entry.detail ? ` — ${entry.detail}` : ''}`;
}

/** The most recent entries, newest first, formatted for display. */
export function summarizeTrail(log: TrailEntry[], limit = 8): string[] {
  return [...log].slice(-limit).reverse().map(formatTrailEntry);
}

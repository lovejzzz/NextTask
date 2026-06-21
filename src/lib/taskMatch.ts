/**
 * Fuzzy-match a spoken task reference ("the login bug", "email sam") to an
 * actual task on the board, so the companion can act on what you mean without
 * exact titles. Pure + tested.
 */
import type { Task } from './types';

const STOP_WORDS = new Set(['the', 'a', 'an', 'task', 'to', 'my', 'for', 'card', 'item', 'one']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/["'`.,;:!?]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
}

/** Score how well `phrase` refers to `title` (0 = no match). */
export function matchScore(title: string, phrase: string): number {
  const titleLower = title.toLowerCase();
  const phraseLower = phrase.trim().toLowerCase();
  if (!phraseLower) return 0;
  if (titleLower === phraseLower) return 100;
  if (titleLower.includes(phraseLower)) return 80 + phraseLower.length / 100;

  const titleTokens = new Set(tokenize(title));
  const phraseTokens = tokenize(phrase);
  if (!phraseTokens.length || !titleTokens.size) return 0;

  const overlap = phraseTokens.filter((token) => titleTokens.has(token)).length;
  if (!overlap) return 0;
  // Reward covering the phrase's words; this is the share of asked-for words found.
  return (overlap / phraseTokens.length) * 60;
}

/**
 * Best matching task for a phrase, or null if nothing clears the bar. Done tasks
 * are de-prioritized (active work wins ties) but still matchable.
 */
export function matchTask(tasks: Task[], phrase: string, threshold = 30): Task | null {
  let best: Task | null = null;
  let bestScore = 0;
  for (const task of tasks) {
    let score = matchScore(task.title, phrase);
    if (task.status === 'done') score -= 5;
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }
  return bestScore >= threshold ? best : null;
}

/**
 * What a spoken task reference resolves to. Either nothing clears the bar, one
 * task clearly wins, or several are too close to call — in which case the
 * companion should *ask* which one rather than guess and act (especially on a
 * delete or a status change he can't read your mind to undo).
 */
export type TaskReference =
  | { kind: 'none' }
  | { kind: 'one'; task: Task }
  | { kind: 'ambiguous'; candidates: Task[] };

// Two matches within this many points of the top are "too close to call."
const AMBIGUITY_MARGIN = 5;

/**
 * Resolve a phrase to a task, but be honest about ambiguity: if more than one
 * task sits within {@link AMBIGUITY_MARGIN} of the best score, return them all
 * as candidates so the caller can ask instead of picking blindly.
 */
export function resolveTaskReference(tasks: Task[], phrase: string, threshold = 30): TaskReference {
  const scored = tasks
    .map((task) => ({ task, score: matchScore(task.title, phrase) - (task.status === 'done' ? 5 : 0) }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { kind: 'none' };
  const contenders = scored.filter((entry) => entry.score >= scored[0].score - AMBIGUITY_MARGIN);
  if (contenders.length > 1) return { kind: 'ambiguous', candidates: contenders.map((entry) => entry.task) };
  return { kind: 'one', task: scored[0].task };
}

/** Best match for a phrase against a list of named things (labels, teammates). */
export function matchNamed<T extends { name: string }>(items: T[], phrase: string, threshold = 40): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const item of items) {
    const score = matchScore(item.name, phrase);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= threshold ? best : null;
}

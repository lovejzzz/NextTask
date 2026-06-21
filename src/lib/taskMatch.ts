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

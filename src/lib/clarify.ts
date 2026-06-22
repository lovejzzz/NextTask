/**
 * Learning from a clarification (Language L5). Entry 7 taught Boardy to ask "which
 * one?" when a task reference is a genuine toss-up. But asking the *same* question
 * every time — never remembering your answer — makes you repeat yourself, which is
 * its own small rudeness. This remembers the choice: once you've told him what an
 * ambiguous phrase meant, he resolves it directly next time instead of re-asking.
 *
 * Pure + persisted by a hook. A plain phrase→title map — glass-box, correctable.
 */
export type Clarifications = Record<string, string>; // normalized phrase → chosen task title

/** Normalize a spoken reference so casing/spacing/punctuation don't fork the key. */
export function clarifyKey(phrase: string): string {
  return phrase
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '');
}

/** Remember that an ambiguous phrase was clarified to a specific task title. */
export function learnClarification(map: Clarifications, phrase: string, title: string): Clarifications {
  const key = clarifyKey(phrase);
  if (!key || !title.trim()) return map;
  return { ...map, [key]: title };
}

/** The title a phrase was previously clarified to, or null if never clarified. */
export function recallClarifiedTitle(map: Clarifications, phrase: string): string | null {
  return map[clarifyKey(phrase)] ?? null;
}

/**
 * Long-term "things you told me" memory. The companion captures facts you ask
 * it to remember ("remember that the launch is Friday", "I'm focusing on the
 * redesign") and carries them across sessions, weaving them into its prompt and
 * recalling them on request. Pure + tested; persisted by a hook.
 */
export type CompanionNote = { text: string; at: number };

const MAX_NOTES = 8;

function tidy(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s,;:.!?]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '';
}

/** Extract a fact to remember from a statement, or null if it isn't one. */
export function parseRememberable(text: string): string | null {
  const raw = text.trim();
  let match: RegExpMatchArray | null;

  // "remember (that) X" / "note (that) X" — but not "remember to <do thing>".
  if ((match = raw.match(/^(?:remember|note)(?:\s+that)?\s+(?!to\b)(.+)/i))) return tidy(match[1]) || null;
  if ((match = raw.match(/^(?:for the record|fyi|just so you know|keep in mind)(?:\s+that)?[,:]?\s+(.+)/i))) {
    return tidy(match[1]) || null;
  }
  if ((match = raw.match(/^i'?m (?:focus(?:ing|ed) on|working on)\s+(.+)/i))) {
    const rest = tidy(match[1]);
    return rest ? `Focusing on ${rest.charAt(0).toLowerCase()}${rest.slice(1)}` : null;
  }
  if ((match = raw.match(/^my (focus|goal|priority|deadline)\s+(?:is|are)\s+(.+)/i))) {
    const rest = tidy(match[2]);
    return rest ? `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}: ${rest}` : null;
  }
  return null;
}

/** Add a note, de-duplicating (case-insensitive) and keeping the most recent. */
export function addNote(notes: CompanionNote[], fact: string, at: number = Date.now()): CompanionNote[] {
  const text = fact.trim();
  if (!text) return notes;
  const without = notes.filter((note) => note.text.toLowerCase() !== text.toLowerCase());
  return [...without, { text, at }].slice(-MAX_NOTES);
}

/** Compact, prompt-friendly rendering of remembered notes. */
export function formatNotes(notes: CompanionNote[]): string {
  if (!notes.length) return '';
  return notes.map((note) => note.text).join('; ');
}

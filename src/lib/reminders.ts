/**
 * Tier 3 (BoardyV1) — Boardy's first real capability: reminders.
 *
 * This is the capability the growth model has been *sensing he lacked and asking for*
 * ("remind me to …", filed as a 🤖 request). Tier 3 makes it real — and entirely
 * in-app: a reminder is a small, board-local, reversible entity, no external service,
 * so by the graduated-autonomy policy (agency.ts) he can set one on his own, with an
 * undo and an audit entry. The autonomous-growth loop closes on itself: the gap he
 * asked to have built is now built, and his own filed request resolves.
 *
 * Pure parsing + due-checking here; persistence is a hook, the act runs through the
 * Capability interface.
 */
export type Reminder = { id: string; text: string; dueAt: number | null; createdAt: number; firedAt?: number };

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function tidy(text: string): string {
  const t = text.trim().replace(/[\s,;:.!?]+$/, '').trim();
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : '';
}

/** Start of tomorrow at 9am, local — a humane default for "tomorrow". */
function tomorrow9am(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/**
 * Parse "remind me to X", optionally with a trailing time ("in 30 minutes", "in 2
 * hours", "in 3 days", "tomorrow"). Returns the reminder text and its due time (null
 * for an open-ended reminder), or null if it isn't a reminder at all.
 */
export function parseReminder(text: string, now: number = Date.now()): { text: string; dueAt: number | null } | null {
  const m = text.match(/^\s*remind me\s+(?:to\b\s*)?(.*)$/i);
  if (!m) return null;
  let body = m[1].trim();
  let dueAt: number | null = null;

  const rel = body.match(/\s+in\s+(\d+)\s*(min(?:ute)?s?|hours?|hrs?|h|days?|d)\b\.?$/i);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const ms = /^h/.test(unit) || unit.startsWith('hour') || unit.startsWith('hr') ? HOUR : /^d/.test(unit) || unit.startsWith('day') ? DAY : MIN;
    dueAt = now + n * ms;
    body = body.slice(0, rel.index).trim();
  } else {
    const tom = body.match(/\s+tomorrow\b\.?$/i);
    if (tom) {
      dueAt = tomorrow9am(now);
      body = body.slice(0, tom.index).trim();
    }
  }
  const clean = tidy(body);
  return clean ? { text: clean, dueAt } : null;
}

/** Reminders that are due now and haven't fired yet. */
export function dueReminders(reminders: Reminder[], now: number = Date.now()): Reminder[] {
  return reminders.filter((r) => r.dueAt !== null && r.dueAt <= now && !r.firedAt);
}

/** A friendly confirmation of a set reminder. */
export function describeReminder(r: { text: string; dueAt: number | null }, now: number = Date.now()): string {
  if (r.dueAt === null) return `I'll remind you to ${r.text} — just say "what are my reminders" to see it.`;
  const mins = Math.round((r.dueAt - now) / MIN);
  const when = mins < 60 ? `in ${Math.max(1, mins)} min` : mins < 24 * 60 ? `in ${Math.round(mins / 60)}h` : `on ${new Date(r.dueAt).toLocaleString()}`;
  return `Reminder set: I'll nudge you to ${r.text} ${when}.`;
}

/** Plain-text list of active reminders, for the glass-box Mind panel. */
export function describeReminders(reminders: Reminder[]): string[] {
  return reminders
    .filter((r) => !r.firedAt)
    .map((r) => (r.dueAt ? `${r.text} (due ${new Date(r.dueAt).toLocaleString()})` : `${r.text} (no time set)`));
}

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

/** An absolute time today ("at 3pm", "at 15:30"); rolls to tomorrow if already past. */
function absoluteTime(hour: number, minute: number, ampm: string | undefined, now: number): number {
  let h = hour;
  if (ampm) {
    const pm = /pm/i.test(ampm);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  const d = new Date(now);
  d.setHours(h, minute, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1); // next occurrence
  return d.getTime();
}

/**
 * Parse "remind me to X" or "set a reminder to X", with an optional time anywhere in
 * the phrase — relative ("in 30 minutes", "in 2 hours/days"), absolute ("at 3pm",
 * "at 15:30"), "tomorrow", or "next week". The time phrase is stripped from the
 * reminder text wherever it sits. Returns the text and due time (null for open-ended),
 * or null if it isn't a reminder at all.
 */
export function parseReminder(text: string, now: number = Date.now()): { text: string; dueAt: number | null } | null {
  // A question ("remind me what's overdue") is not a reminder-to-do — reject it here too.
  if (/^\s*remind me\s+(?:what|when|who|whom|where|why|which|whether|how)\b/i.test(text)) return null;
  const m = text.match(/^\s*(?:remind me|set (?:a |an )?reminder)\s+(?:(?:to|for|that)\b\s*)?(.*)$/i);
  if (!m) return null;
  let body = m[1].trim();
  let dueAt: number | null = null;

  const cut = (match: RegExpMatchArray | null): boolean => {
    if (!match || match.index === undefined) return false;
    body = (body.slice(0, match.index) + ' ' + body.slice(match.index + match[0].length)).replace(/\s{2,}/g, ' ').trim();
    return true;
  };

  // Relative: "in N minutes/hours/days" (anywhere in the phrase).
  const rel = body.match(/\bin\s+(\d+)\s*(min(?:ute)?s?|hours?|hrs?|h|days?|d)\b\.?/i);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const ms = unit.startsWith('h') ? HOUR : unit.startsWith('d') ? DAY : MIN;
    dueAt = now + n * ms;
    cut(rel);
  } else {
    // Absolute: "at 3pm", "at 3:30pm", "at 15:00".
    const at = body.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b\.?/i);
    if (at && !(at[3] === undefined && parseInt(at[1], 10) > 23)) {
      dueAt = absoluteTime(parseInt(at[1], 10), at[2] ? parseInt(at[2], 10) : 0, at[3], now);
      cut(at);
    } else {
      const nextWeek = body.match(/\bnext week\b\.?/i);
      const tom = body.match(/\btomorrow\b\.?/i);
      if (nextWeek) {
        const d = new Date(tomorrow9am(now));
        d.setDate(d.getDate() + 6);
        dueAt = d.getTime();
        cut(nextWeek);
      } else if (tom) {
        dueAt = tomorrow9am(now);
        cut(tom);
      }
    }
  }

  // After cutting a leading-position time, a dangling connector can remain ("to stretch").
  body = body.replace(/^(?:to|for|that)\b\s*/i, '').trim();
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

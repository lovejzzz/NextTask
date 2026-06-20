/**
 * Cross-session memory for the board companion. Gives it continuity — it knows
 * how long you've worked together, how much you've shipped, your best streak,
 * and how long you've been away — so its voice can reference real history
 * instead of reacting only to the current moment. Pure + persisted by a hook.
 */
import { dayKey } from './momentum';

export type CompanionMemory = {
  firstSeen: number; // epoch ms
  lastSeen: number; // epoch ms
  sessions: number;
  totalShipped: number;
  currentStreak: number; // consecutive days with a ship
  bestStreak: number;
  lastShipDay: string | null; // dayKey
};

export function emptyMemory(now: number = Date.now()): CompanionMemory {
  return {
    firstSeen: now,
    lastSeen: now,
    sessions: 1,
    totalShipped: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastShipDay: null,
  };
}

/** Whole calendar days from `a` to `b` (local). */
export function daysBetween(a: number, b: number): number {
  const da = new Date(a);
  const db = new Date(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** Record a returning visit: bump session count and recency. */
export function recordVisit(mem: CompanionMemory, now: number = Date.now()): CompanionMemory {
  return { ...mem, sessions: mem.sessions + 1, lastSeen: now };
}

/** Record a task shipped to Done, updating all-time total and daily streak. */
export function recordShip(mem: CompanionMemory, now: Date = new Date()): CompanionMemory {
  const today = dayKey(now);
  let currentStreak = mem.currentStreak;
  if (mem.lastShipDay !== today) {
    const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    currentStreak = mem.lastShipDay === yesterday ? mem.currentStreak + 1 : 1;
  }
  return {
    ...mem,
    lastSeen: now.getTime(),
    totalShipped: mem.totalShipped + 1,
    currentStreak,
    bestStreak: Math.max(mem.bestStreak, currentStreak),
    lastShipDay: today,
  };
}

/** A compact, prompt-friendly recap of the relationship so far. */
export function summarizeMemory(mem: CompanionMemory, now: number = Date.now()): string {
  const known = Math.max(0, daysBetween(mem.firstSeen, now));
  const away = Math.max(0, daysBetween(mem.lastSeen, now));
  const parts: string[] = [];
  parts.push(
    known <= 0
      ? `We just met today (visit #${mem.sessions}).`
      : `We've known each other ~${known} day(s) across ${mem.sessions} visit(s).`,
  );
  parts.push(
    `They've shipped ${mem.totalShipped} task(s) all-time (best streak ${mem.bestStreak} day(s), current ${mem.currentStreak}).`,
  );
  if (away >= 1) parts.push(`They were away ${away} day(s) before this visit.`);
  return parts.join(' ');
}

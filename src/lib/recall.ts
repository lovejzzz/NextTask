/**
 * Reconstructive memory — Boardy remembers by *reading the board*, not by storing.
 *
 * Every conventional AI memory (vector stores, MemGPT, Generative Agents — and the
 * store/decay/retrieve engine in memory.ts) keeps a private copy of what it knows.
 * That copy drifts: it "remembers" your deadline is Friday after you moved the card
 * to Monday, and now it lies. The drift is unavoidable whenever memory is a *copy*.
 *
 * Boardy's world — the board — is already a durable, structured, timestamped,
 * human-maintained record. So most of what he "remembers" isn't stored at all; it's
 * *reconstructed* on demand from the live board:
 *   - what happened  → task state + timestamps (the card is in Done, dated)
 *   - your deadlines → the due dates themselves
 *   - your focus     → what's in progress
 *   - what you neglect → what's gone stale
 * Reconstructed memory can't desync from reality, because it *is* reality, read
 * freshly each time. Move the card and the memory moves with it.
 *
 * Only the irreducible residue — things that happened and left no trace on the
 * board (a spoken preference, a stated goal) — is actually stored, in the thin
 * trace layer (memory.ts), and even that stays subordinate to the board.
 *
 * Grounding: reconstructive memory (Bartlett, 1932); "the world as its own best
 * model" (Brooks, 1991); the extended-mind thesis (Clark & Chalmers, 1998). The
 * synthesis — making the shared workspace the memory substrate so it can't rot —
 * is the new part. See MEMORY.md.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { retrieve, type MemoryKind, type MemoryStore } from './memory';
import type { Task } from './types';

export type Recollection = {
  kind: MemoryKind;
  text: string;
  confidence: number; // board-derived recollections are near-certain; traces carry their own
  source: 'board' | 'trace';
};

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function duePhrase(daysOut: number): string {
  if (daysOut < 0) return `overdue by ${Math.abs(daysOut)} day${Math.abs(daysOut) === 1 ? '' : 's'}`;
  if (daysOut === 0) return 'due today';
  if (daysOut === 1) return 'due tomorrow';
  return `due in ${daysOut} days`;
}

/** Your nearest commitment — read straight off the cards, so it's never stale. */
export function recallNearestDeadline(tasks: Task[], now: Date = new Date()): Recollection | null {
  const today = startOfToday(now);
  const dated = tasks
    .filter((task) => task.status !== 'done' && task.due_date)
    .map((task) => ({ task, daysOut: differenceInCalendarDays(parseISO(`${task.due_date}T00:00:00`), today) }))
    .sort((a, b) => a.daysOut - b.daysOut);
  if (!dated.length) return null;
  const { task, daysOut } = dated[0];
  return { kind: 'semantic', text: `Your nearest deadline: "${task.title}" is ${duePhrase(daysOut)}.`, confidence: 1, source: 'board' };
}

/** What you're in the middle of — derived from the in-progress column. */
export function recallFocus(tasks: Task[]): Recollection | null {
  const inFlight = tasks.filter((task) => task.status === 'in_progress');
  if (!inFlight.length) return null;
  const titles = inFlight.slice(0, 3).map((task) => `"${task.title}"`).join(', ');
  return { kind: 'semantic', text: `Right now you're in the middle of: ${titles}.`, confidence: 1, source: 'board' };
}

/** What you finished lately — reconstructed from recent moves into Done. */
export function recallRecentlyShipped(tasks: Task[], now: Date = new Date(), withinDays = 2): Recollection | null {
  const today = startOfToday(now);
  const shipped = tasks
    .filter((task) => task.status === 'done' && differenceInCalendarDays(today, parseISO(task.updated_at)) <= withinDays)
    .slice(0, 3);
  if (!shipped.length) return null;
  const titles = shipped.map((task) => `"${task.title}"`).join(', ');
  return { kind: 'episodic', text: `Recently you shipped: ${titles}.`, confidence: 0.9, source: 'board' };
}

/** What you've been avoiding — the oldest untouched active work. */
export function recallNeglected(tasks: Task[], now: Date = new Date(), staleDays = 14): Recollection | null {
  const today = startOfToday(now);
  const stale = tasks
    .filter((task) => task.status !== 'done')
    .map((task) => ({ task, age: differenceInCalendarDays(today, parseISO(task.updated_at)) }))
    .filter((entry) => entry.age >= staleDays)
    .sort((a, b) => b.age - a.age);
  if (!stale.length) return null;
  const { task, age } = stale[0];
  return { kind: 'episodic', text: `You've left "${task.title}" untouched for ${age} days.`, confidence: 1, source: 'board' };
}

/** Every recollection the board itself can reconstruct, most certain first. */
export function recallFromBoard(tasks: Task[], now: Date = new Date()): Recollection[] {
  return [recallNearestDeadline(tasks, now), recallFocus(tasks), recallRecentlyShipped(tasks, now), recallNeglected(tasks, now)].filter(
    (r): r is Recollection => r !== null,
  );
}

/**
 * What Boardy remembers, period: the board reconstructed live (primary), blended
 * with the thin stored residue the board can't hold (preferences, stated goals).
 * With a query, both are filtered to what's relevant. The board always leads —
 * a live truth outranks a stored one, by construction.
 */
export function reconstruct(tasks: Task[], traces: MemoryStore = [], now: Date = new Date(), query = ''): Recollection[] {
  const fromBoard = recallFromBoard(tasks, now);
  const q = query.trim().toLowerCase();
  const board = q
    ? fromBoard.filter((r) => q.split(/\s+/).some((word) => word.length > 2 && r.text.toLowerCase().includes(word)))
    : fromBoard;

  const fromTraces: Recollection[] = retrieve(traces, query, now.getTime(), 3).map(({ item }) => ({
    kind: item.kind,
    text: item.text,
    confidence: item.confidence,
    source: 'trace',
  }));

  return [...board, ...fromTraces];
}

/**
 * Adaptive reasoning the companion uses to give real advice, not just react:
 * what to drop, the fastest win, and the biggest risk — all composed
 * deterministically from board state so the answers are grounded and testable.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { focusScore, rankFocusTasks, taskAgeDays } from './experimental';
import { matchTask } from './taskMatch';
import type { Task, TaskStatus } from './types';

// How close a status is to "done" — used to find low-effort wins.
const CLOSENESS: Record<TaskStatus, number> = { in_review: 3, in_progress: 2, todo: 1, done: 0 };

/** Lowest-value active tasks worth dropping or deferring (worst first). */
export function pickDropCandidates(tasks: Task[], now?: Date): Task[] {
  const ranked = rankFocusTasks(tasks, now); // most-deserving first
  return ranked.slice(-3).reverse(); // the tail = least deserving; show worst first
}

export type DropCandidate = { task: Task; reason: string };

/**
 * Is this task genuinely safe to drop? Honest triage never suggests cutting
 * load-bearing work — anything overdue, due soon, high-priority, or already in
 * motion stays. Only quiet, low-stakes work is fair game.
 */
function isDroppable(task: Task, now: Date): boolean {
  if (task.status !== 'todo') return false; // done or in motion — not a cut
  if (task.priority === 'high') return false; // important
  if (task.due_date) {
    const daysOut = differenceInCalendarDays(parseISO(`${task.due_date}T00:00:00`), now);
    if (daysOut <= 7) return false; // overdue or due soon — load-bearing
  }
  return true;
}

/** Why a task is safe to cut — the honest justification for the drop. */
function dropReason(task: Task, now: Date): string {
  const bits: string[] = [];
  if (task.priority === 'low') bits.push('low priority');
  if (!task.due_date) bits.push('no deadline');
  const age = taskAgeDays(task, now);
  if (age >= 14) bits.push(`untouched ${age} days`);
  if (!bits.length) bits.push('nothing pressing about it');
  return bits.join(', ');
}

/**
 * Tasks genuinely safe to drop or defer — worst first, each with the reason it's
 * safe to cut. Empty when everything is load-bearing: he'd rather say "nothing
 * is safe to drop" than invent a cut to look decisive.
 */
export function pickDropCandidatesWithReasons(tasks: Task[], now?: Date, limit = 3): DropCandidate[] {
  const ref = now ?? new Date();
  const droppable = rankFocusTasks(tasks, now).filter((task) => isDroppable(task, ref));
  // rankFocusTasks is most-deserving first, so the safest cuts are at the tail.
  return droppable
    .slice(-limit)
    .reverse()
    .map((task) => ({ task, reason: dropReason(task, ref) }));
}

const WORTH: Record<string, number> = { high: 3, normal: 2, low: 1 };

/** A small bonus when finishing this also beats a looming deadline. */
function dueSoonBoost(task: Task, now: Date): number {
  if (!task.due_date) return 0;
  return differenceInCalendarDays(parseISO(`${task.due_date}T00:00:00`), now) <= 2 ? 1.5 : 0;
}

/**
 * A real quick win lives in the top-left of the impact/effort matrix: fast to
 * finish AND worth finishing. Closeness (low effort) leads, but among near-done
 * work the *valuable* task wins — not the most trivial. This is the fix for the
 * old "smallest commitment" rule, which did the exact opposite and steered you to
 * busywork.
 */
export function quickWinScore(task: Task, now: Date = new Date()): number {
  return CLOSENESS[task.status] * 6 + (WORTH[task.priority] + dueSoonBoost(task, now)) * 4;
}

function byWorthwhileQuickness(now: Date) {
  return (a: Task, b: Task): number => quickWinScore(b, now) - quickWinScore(a, now) || a.position - b.position;
}

/** The N best quick wins — fast *and* worth doing — skipping anything blocked. */
export function pickQuickWins(tasks: Task[], limit = 2, now: Date = new Date()): Task[] {
  const blocked = new Set(detectBlocked(tasks).map((task) => task.id));
  const active = tasks.filter((task) => task.status !== 'done' && !blocked.has(task.id));
  return [...active].sort(byWorthwhileQuickness(now)).slice(0, limit);
}

/** The single best quick win: near-done and genuinely worth finishing. */
export function pickQuickWin(tasks: Task[], now: Date = new Date()): Task | null {
  const blocked = new Set(detectBlocked(tasks).map((task) => task.id));
  const active = tasks.filter((task) => task.status !== 'done' && !blocked.has(task.id));
  return active.length ? [...active].sort(byWorthwhileQuickness(now))[0] : null;
}

/** The most pressing task — the focus ranking already weights overdue + priority. */
export function pickBiggestRisk(tasks: Task[], now?: Date): Task | null {
  return rankFocusTasks(tasks, now)[0] ?? null;
}

/**
 * The top task you can actually act on right now — focus ranking minus anything
 * blocked. Don't send someone at a wall: "what's next" should be doable.
 */
export function pickNextActionable(tasks: Task[], now?: Date): Task | null {
  const blocked = new Set(detectBlocked(tasks).map((task) => task.id));
  return rankFocusTasks(tasks, now).find((task) => !blocked.has(task.id)) ?? null;
}

/** How sure Boardy is about a "what's next" pick. */
export type FocusConfidence = 'clear' | 'weak' | 'none';

// A top pick needs to clear the runner-up by at least this much to feel real —
// less than ~one priority/status step apart is, honestly, a coin-flip.
const CONFIDENT_MARGIN = 8;

/**
 * How confident is the next-action recommendation? Compares the top actionable
 * task's focus score against the runner-up. A comfortable margin is a genuine
 * pick; a near-tie means he's essentially guessing — and should say so instead
 * of manufacturing certainty. Humility, made measurable.
 */
export function focusConfidence(tasks: Task[], now?: Date): FocusConfidence {
  const blocked = new Set(detectBlocked(tasks).map((task) => task.id));
  const actionable = rankFocusTasks(tasks, now).filter((task) => !blocked.has(task.id));
  if (!actionable.length) return 'none';
  if (actionable.length === 1) return 'clear';
  const margin = focusScore(actionable[0], now) - focusScore(actionable[1], now);
  return margin >= CONFIDENT_MARGIN ? 'clear' : 'weak';
}

const BLOCKED_RE = /\b(blocked|waiting on|waiting for|on hold|stuck|depends on|blocker)\b/i;
const BLOCKED_LABEL_RE = /blocked|on.?hold|waiting/i;

/** Active tasks that look blocked — read from the title, description, or labels. */
export function detectBlocked(tasks: Task[]): Task[] {
  return tasks.filter(
    (task) =>
      task.status !== 'done' &&
      (BLOCKED_RE.test(task.title) ||
        BLOCKED_RE.test(task.description ?? '') ||
        task.labels.some((label) => BLOCKED_LABEL_RE.test(label.name))),
  );
}

// The thing a blocked task is waiting on — captured so it can be matched to a task.
const DEPENDS_RE = /\b(?:blocked on|blocked by|waiting on|waiting for|depends on)\s+(.+)/i;

/**
 * Second-order leverage: how many *other* active tasks are waiting on each task.
 * Finishing a task that several others depend on clears a bottleneck — worth more
 * than its own priority suggests. Maps task id → how many it would unblock.
 */
export function unblockCount(tasks: Task[]): Map<string, number> {
  const active = tasks.filter((task) => task.status !== 'done');
  const counts = new Map<string, number>();
  for (const blocked of active) {
    const text = `${blocked.title} ${blocked.description ?? ''}`;
    const match = text.match(DEPENDS_RE);
    if (!match) continue;
    // Trim trailing punctuation/parens off the captured dependency ("the API)" → "the API").
    const reference = match[1].replace(/[)\]\s.,;:!?]+$/, '').trim();
    if (!reference) continue;
    // Match the dependency against the *other* tasks, never the blocked one itself.
    const dep = matchTask(
      active.filter((task) => task.id !== blocked.id),
      reference,
    );
    if (dep) counts.set(dep.id, (counts.get(dep.id) ?? 0) + 1);
  }
  return counts;
}

/** The task whose completion would free the most other work, or null if none. */
export function pickUnblocker(tasks: Task[]): { task: Task; unblocks: number } | null {
  const counts = unblockCount(tasks);
  let best: { task: Task; unblocks: number } | null = null;
  for (const task of tasks) {
    const unblocks = counts.get(task.id) ?? 0;
    if (unblocks > 0 && (!best || unblocks > best.unblocks)) best = { task, unblocks };
  }
  return best;
}

export type StatusInput = {
  shippedToday: number;
  totalShipped: number;
  streak: number;
  bestStreak: number;
  overdue: number;
  active: number;
};

/**
 * An honest status line. The wins come first, but the truth never omits the bad
 * news: if overdue work is piling up, say so instead of empty cheer. Honesty
 * about the present before any pep talk.
 */
export function honestStatus({ shippedToday, totalShipped, streak, bestStreak, overdue, active }: StatusInput): string {
  const facts = `${shippedToday} shipped today · ${totalShipped} all-time · streak ${streak} (best ${bestStreak})`;
  let truth: string;
  if (overdue > 0) {
    truth = `But ${overdue} overdue ${overdue === 1 ? 'task is' : 'tasks are'} piling up — don't let the streak distract you from that.`;
  } else if (active === 0) {
    truth = "Board's clear — genuinely nothing pressing. Enjoy it.";
  } else if (shippedToday > 0) {
    truth = 'Good momentum, nothing overdue. Keep it rolling.';
  } else {
    truth = 'Nothing shipped yet today, but nothing overdue either. The day is young.';
  }
  return `${facts}. ${truth}`;
}

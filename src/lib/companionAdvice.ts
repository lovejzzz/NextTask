/**
 * Adaptive reasoning the companion uses to give real advice, not just react:
 * what to drop, the fastest win, and the biggest risk — all composed
 * deterministically from board state so the answers are grounded and testable.
 */
import { rankFocusTasks } from './experimental';
import type { Task, TaskStatus } from './types';

// How close a status is to "done" — used to find low-effort wins.
const CLOSENESS: Record<TaskStatus, number> = { in_review: 3, in_progress: 2, todo: 1, done: 0 };

/** Lowest-value active tasks worth dropping or deferring (worst first). */
export function pickDropCandidates(tasks: Task[], now?: Date): Task[] {
  const ranked = rankFocusTasks(tasks, now); // most-deserving first
  return ranked.slice(-3).reverse(); // the tail = least deserving; show worst first
}

const PRIORITY_WEIGHT: Record<string, number> = { low: 3, normal: 2, high: 1 };

// Fastest first: closest to done, then smallest commitment, then board order.
function byQuickness(a: Task, b: Task): number {
  return (
    CLOSENESS[b.status] - CLOSENESS[a.status] ||
    PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
    a.position - b.position
  );
}

/** The N fastest things to finish, skipping anything blocked. */
export function pickQuickWins(tasks: Task[], limit = 2): Task[] {
  const blocked = new Set(detectBlocked(tasks).map((task) => task.id));
  const active = tasks.filter((task) => task.status !== 'done' && !blocked.has(task.id));
  return [...active].sort(byQuickness).slice(0, limit);
}

/** The single fastest thing to finish: closest to done, then smallest commitment. */
export function pickQuickWin(tasks: Task[]): Task | null {
  const active = tasks.filter((task) => task.status !== 'done');
  return active.length ? [...active].sort(byQuickness)[0] : null;
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

import { parseISO, isBefore, differenceInCalendarDays } from 'date-fns';

import type { Task, TaskPriority, TaskStatus } from './types';

/**
 * Logic powering the experimental "Focus Spotlight" feature.
 *
 * Given the board, it picks the single task you should work on next and ranks
 * the rest, so the spotlight can suggest one clear action at a time. The score
 * favours work already in motion, higher priority, and looming due dates.
 */
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 30,
  normal: 16,
  low: 6,
};

// Work already in motion is closer to "done" — nudge it forward first.
const STATUS_WEIGHT: Record<TaskStatus, number> = {
  in_review: 24,
  in_progress: 20,
  todo: 8,
  done: 0,
};

// The column a task advances into when you act on the spotlight.
const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: 'in_progress',
  in_progress: 'in_review',
  in_review: 'done',
  done: null,
};

export function nextStatusFor(status: TaskStatus): TaskStatus | null {
  return NEXT_STATUS[status];
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function focusScore(task: Task, now: Date = startOfToday()): number {
  if (task.status === 'done') return Number.NEGATIVE_INFINITY;

  let score = PRIORITY_WEIGHT[task.priority] + STATUS_WEIGHT[task.status];

  if (task.due_date) {
    const due = parseISO(`${task.due_date}T00:00:00`);
    const daysOut = differenceInCalendarDays(due, now);
    if (isBefore(due, now)) {
      // Overdue: the further past due, the louder it gets (capped).
      score += 40 + Math.min(Math.abs(daysOut), 14) * 2;
    } else if (daysOut === 0) {
      // Due today is a hard commitment — last chance before it's overdue.
      score += 30;
    } else if (daysOut <= 3) {
      score += 22 - daysOut * 5;
    } else if (daysOut <= 7) {
      score += 6;
    }
  }

  return score;
}

/**
 * A short, human reason explaining why this task earned the spotlight, so the
 * ranking isn't a black box. Returns the single most compelling signal.
 */
export function focusReason(task: Task, now: Date = startOfToday()): string {
  if (task.status === 'done') return 'Already shipped';

  if (task.due_date) {
    const due = parseISO(`${task.due_date}T00:00:00`);
    const daysOut = differenceInCalendarDays(due, now);
    if (daysOut < 0) {
      const late = Math.abs(daysOut);
      return `Overdue by ${late} day${late === 1 ? '' : 's'}`;
    }
    if (daysOut === 0) return 'Due today';
    if (daysOut === 1) return 'Due tomorrow';
    if (daysOut <= 3) return `Due in ${daysOut} days`;
  }

  if (task.priority === 'high') return 'High priority';
  if (task.status === 'in_review') return 'Waiting on review';
  if (task.status === 'in_progress') return 'Already in motion';
  return 'Next in your queue';
}

/**
 * Rank actionable (non-done) tasks from most to least deserving of focus.
 * Ties fall back to board position so the order stays stable.
 */
export function rankFocusTasks(tasks: Task[], now: Date = startOfToday()): Task[] {
  return tasks
    .filter((task) => task.status !== 'done')
    .map((task) => ({ task, score: focusScore(task, now) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.task.position - b.task.position;
    })
    .map((entry) => entry.task);
}

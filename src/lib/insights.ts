import { differenceInCalendarDays, isBefore, parseISO } from 'date-fns';

import type { Task, TaskStatus } from './types';

/**
 * Pure board analytics for the experimental Board Insights panel.
 * Computes completion, per-status distribution, and risk signals in one pass.
 */
export type BoardInsights = {
  total: number;
  done: number;
  active: number;
  completion: number; // 0..1
  byStatus: Record<TaskStatus, number>;
  overdue: number;
  highPriority: number; // non-done high-priority tasks
  avgAgeDays: number; // mean age of active tasks, in days
};

export function computeInsights(tasks: Task[], now: Date = new Date()): BoardInsights {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  let overdue = 0;
  let highPriority = 0;
  let ageSum = 0;

  for (const task of tasks) {
    byStatus[task.status] += 1;
    if (task.status !== 'done') {
      if (task.priority === 'high') highPriority += 1;
      if (task.due_date && isBefore(parseISO(`${task.due_date}T00:00:00`), today)) overdue += 1;
      ageSum += Math.max(0, differenceInCalendarDays(now, new Date(task.created_at)));
    }
  }

  const total = tasks.length;
  const done = byStatus.done;
  const active = total - done;
  return {
    total,
    done,
    active,
    completion: total > 0 ? done / total : 0,
    byStatus,
    overdue,
    highPriority,
    avgAgeDays: active > 0 ? Math.round(ageSum / active) : 0,
  };
}

/**
 * The board's overall *shape* — a single gestalt read, not a per-task feeling.
 * Lets Boardy step back from individual cards and say what *situation* he's
 * looking at, so his tone and advice can match the whole rather than the next.
 */
export type BoardShape = 'empty' | 'overwhelmed' | 'scattered' | 'calm';

export function boardShape(insights: BoardInsights): BoardShape {
  const { active, overdue, highPriority, avgAgeDays } = insights;
  if (active === 0) return 'empty';
  // A wall of pressing work: lots overdue, lots high-priority, or just a lot.
  if (overdue >= 3 || highPriority >= 4 || active >= 10) return 'overwhelmed';
  // Not heavy, but sprawling: many tasks, nothing urgent, most going stale.
  if (active >= 6 && overdue === 0 && avgAgeDays >= 14) return 'scattered';
  return 'calm';
}

/** A spoken, one-line read of the board's shape — the gestalt, in his voice. */
export function describeBoardShape(insights: BoardInsights): string {
  switch (boardShape(insights)) {
    case 'empty':
      return "Empty board — nothing on your plate. Genuinely clear. Enjoy it or add something.";
    case 'overwhelmed': {
      const bits: string[] = [];
      if (insights.overdue) bits.push(`${insights.overdue} overdue`);
      if (insights.highPriority) bits.push(`${insights.highPriority} high-priority`);
      const detail = bits.length ? ` — ${bits.join(', ')}` : '';
      return `Heavy board: ${insights.active} active${detail}. Don't try to hold it all at once — pick the one most pressing thing and start there.`;
    }
    case 'scattered':
      return `Scattered, not heavy: ${insights.active} active, none urgent, but most going stale (avg ${insights.avgAgeDays} days untouched). Worth a cleanup — cut a few or batch the rest before they rot.`;
    case 'calm':
    default:
      return `Steady board — ${insights.active} active, nothing on fire. A healthy amount of work. Pick one and go.`;
  }
}

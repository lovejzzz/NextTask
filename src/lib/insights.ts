import { isBefore, parseISO } from 'date-fns';

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
};

export function computeInsights(tasks: Task[], now: Date = new Date()): BoardInsights {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  let overdue = 0;
  let highPriority = 0;

  for (const task of tasks) {
    byStatus[task.status] += 1;
    if (task.status !== 'done') {
      if (task.priority === 'high') highPriority += 1;
      if (task.due_date && isBefore(parseISO(`${task.due_date}T00:00:00`), today)) overdue += 1;
    }
  }

  const total = tasks.length;
  const done = byStatus.done;
  return {
    total,
    done,
    active: total - done,
    completion: total > 0 ? done / total : 0,
    byStatus,
    overdue,
    highPriority,
  };
}

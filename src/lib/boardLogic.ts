import { STATUSES } from './constants';
import type { ReorderUpdate, Task, TaskStatus } from './types';

/** Group tasks by status, each lane sorted by ascending position. */
export function groupTasks(tasks: Task[]): Record<TaskStatus, Task[]> {
  return STATUSES.reduce(
    (acc, status) => {
      acc[status.id] = tasks.filter((task) => task.status === status.id).sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );
}

/**
 * Compute the minimal set of position/status updates needed to drop `active`
 * into `targetStatus` (optionally before `overTaskId`). Positions are spaced by
 * 1000 so future inserts rarely need a full re-sequence. Only rows whose status
 * or position actually changes are returned.
 */
export function reorderForDrop(
  tasks: Task[],
  active: Task,
  targetStatus: TaskStatus,
  overTaskId?: string,
): ReorderUpdate[] {
  const sourceStatus = active.status;
  const updates: ReorderUpdate[] = [];
  const targetTasks = tasks
    .filter((task) => task.status === targetStatus && task.id !== active.id)
    .sort((a, b) => a.position - b.position);
  const moved = { ...active, status: targetStatus };
  const overIndex = overTaskId ? targetTasks.findIndex((task) => task.id === overTaskId) : -1;
  targetTasks.splice(overIndex >= 0 ? overIndex : targetTasks.length, 0, moved);

  targetTasks.forEach((task, index) => {
    const position = (index + 1) * 1000;
    const original = tasks.find((item) => item.id === task.id);
    if (original?.position !== position || original?.status !== targetStatus) {
      updates.push({ id: task.id, status: targetStatus, position });
    }
  });

  if (sourceStatus !== targetStatus) {
    tasks
      .filter((task) => task.status === sourceStatus && task.id !== active.id)
      .sort((a, b) => a.position - b.position)
      .forEach((task, index) => {
        const position = (index + 1) * 1000;
        if (task.position !== position) updates.push({ id: task.id, status: sourceStatus, position });
      });
  }

  return updates;
}

/** Human-readable label for a status id. */
export function statusLabel(status: TaskStatus) {
  return STATUSES.find((item) => item.id === status)?.label ?? status;
}

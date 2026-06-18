import { addDays, format, formatDistanceToNowStrict, isBefore, isToday, isTomorrow, parseISO } from 'date-fns';

import type { Task } from './types';

export function dueTone(task: Pick<Task, 'due_date' | 'status'>) {
  if (!task.due_date) return 'none';
  if (task.status === 'done') return 'complete';
  const due = parseISO(`${task.due_date}T00:00:00`);
  const today = startOfToday();
  if (isBefore(due, today)) return 'overdue';
  if (due <= addDays(today, 3)) return 'soon';
  return 'future';
}

export function dueLabel(task: Pick<Task, 'due_date' | 'status'>) {
  if (!task.due_date) return 'No date';
  const due = parseISO(`${task.due_date}T00:00:00`);
  if (task.status !== 'done' && isBefore(due, startOfToday())) return 'Overdue';
  if (isToday(due)) return 'Today';
  if (isTomorrow(due)) return 'Tomorrow';
  return format(due, 'MMM d');
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return '';
  return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`;
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

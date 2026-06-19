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
  // Use local calendar components, not toISOString (UTC), so the value matches
  // the user's local "today" — otherwise users behind UTC get an off-by-one date
  // near midnight, and it would disagree with dueTone/dueLabel which parse locally.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

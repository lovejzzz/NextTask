import type { TaskPriority, TaskStatus } from './types';

export const STATUSES: Array<{ id: TaskStatus; label: string; shortLabel: string; tone: string }> = [
  { id: 'todo', label: 'To Do', shortLabel: 'Todo', tone: 'slate' },
  { id: 'in_progress', label: 'In Progress', shortLabel: 'Doing', tone: 'blue' },
  { id: 'in_review', label: 'In Review', shortLabel: 'Review', tone: 'violet' },
  { id: 'done', label: 'Done', shortLabel: 'Done', tone: 'emerald' },
];

export const PRIORITIES: Array<{ id: TaskPriority; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
];

export const LOCAL_DEMO_ENABLED = import.meta.env.VITE_ENABLE_LOCAL_DEMO === 'true';

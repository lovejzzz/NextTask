import { format } from 'date-fns';

import { rankFocusTasks } from './experimental';
import type { Task } from './types';

/**
 * Experimental "Standup Generator": turns the current board into a tidy
 * markdown summary you can paste into Slack / notes — what's in motion, what
 * shipped today, and the single best thing to pick up next.
 */
function sameLocalDay(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function section(emoji: string, title: string, items: Task[]): string[] {
  const lines = [`${emoji} ${title} (${items.length})`];
  if (items.length === 0) lines.push('- —');
  else for (const task of items) lines.push(`- ${task.title}`);
  lines.push('');
  return lines;
}

export function buildStandup(tasks: Task[], now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inProgress = tasks.filter((task) => task.status === 'in_progress');
  const inReview = tasks.filter((task) => task.status === 'in_review');
  const doneToday = tasks.filter((task) => task.status === 'done' && sameLocalDay(task.updated_at, now));
  const next = rankFocusTasks(tasks, today)[0] ?? null;

  const lines: string[] = [`🗓️ Standup — ${format(now, 'EEE, MMM d')}`, ''];
  lines.push(...section('🚀', 'In progress', inProgress));
  lines.push(...section('🔍', 'In review', inReview));
  lines.push(...section('✅', 'Done today', doneToday));
  lines.push('⏭️ Up next');
  lines.push(next ? `- ${next.title}` : '- Nothing queued');

  return lines.join('\n').trim();
}

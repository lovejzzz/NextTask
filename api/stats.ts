import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_shared/auth';
import { hydrateBoard } from './_shared/data';
import { handleApiError, methodNotAllowed, sendData } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return methodNotAllowed(res, req.method);
    const { supabase, user } = await requireUser(req);
    const { tasks } = await hydrateBoard(supabase, user.id);
    const today = startOfToday();
    const soon = addDays(today, 3);

    const payload = {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === 'done').length,
      overdue: tasks.filter((task) => task.due_date && task.status !== 'done' && date(task.due_date) < today).length,
      dueSoon: tasks.filter((task) => {
        if (!task.due_date || task.status === 'done') return false;
        const due = date(task.due_date);
        return due >= today && due <= soon;
      }).length,
      byStatus: {
        todo: tasks.filter((task) => task.status === 'todo').length,
        in_progress: tasks.filter((task) => task.status === 'in_progress').length,
        in_review: tasks.filter((task) => task.status === 'in_review').length,
        done: tasks.filter((task) => task.status === 'done').length,
      },
      byPriority: {
        low: tasks.filter((task) => task.priority === 'low').length,
        normal: tasks.filter((task) => task.priority === 'normal').length,
        high: tasks.filter((task) => task.priority === 'high').length,
      },
    };

    return sendData(res, payload);
  } catch (error) {
    return handleApiError(res, error);
  }
}

function date(value: string) {
  return new Date(`${value}T00:00:00`);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(value: Date, days: number) {
  const copy = new Date(value);
  copy.setDate(copy.getDate() + days);
  return copy;
}

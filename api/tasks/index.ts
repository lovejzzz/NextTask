import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth.js';
import {
  getNextPosition,
  hydrateBoard,
  hydrateTask,
  recordActivity,
  replaceAssignees,
  replaceLabels,
  type BoardFilters,
  type TaskPriority,
  type TaskStatus,
} from '../_shared/data.js';
import { handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../_shared/http.js';
import { taskCreateSchema } from '../_shared/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);

    if (req.method === 'GET') {
      const filters: BoardFilters = {
        search: queryString(req.query.search),
        status: queryString(req.query.status) as TaskStatus | undefined,
        priority: queryString(req.query.priority) as TaskPriority | undefined,
        label_id: queryString(req.query.label_id),
        assignee_id: queryString(req.query.assignee_id),
        due: queryString(req.query.due) as BoardFilters['due'],
      };
      const payload = await hydrateBoard(supabase, user.id, filters);
      return sendData(res, payload);
    }

    if (req.method === 'POST') {
      const input = taskCreateSchema.parse(parseJsonBody(req));
      const position = await getNextPosition(supabase, user.id, input.status);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date,
          position,
        })
        .select('*')
        .single();

      if (error || !data) throw error;

      await replaceAssignees(supabase, user.id, data.id, input.assignee_ids);
      await replaceLabels(supabase, user.id, data.id, input.label_ids);
      await recordActivity(supabase, user.id, data.id, 'task_created', 'Created task', { title: input.title });

      const task = await hydrateTask(supabase, user.id, data.id);
      return sendData(res, task, 201);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

function queryString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

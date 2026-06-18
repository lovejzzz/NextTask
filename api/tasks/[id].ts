import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth.js';
import {
  getTaskOrThrow,
  hydrateTask,
  recordActivity,
  replaceAssignees,
  replaceLabels,
  taskMoveMessage,
} from '../_shared/data.js';
import { getParam, handleApiError, methodNotAllowed, parseJsonBody, sendData, sendNoContent } from '../_shared/http.js';
import { taskUpdateSchema } from '../_shared/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const id = getParam(req, 'id');

    if (!id) {
      return res.status(400).json({ error: { code: 'bad_request', message: 'Task id is required' } });
    }

    if (req.method === 'PATCH') {
      const previous = await getTaskOrThrow(supabase, user.id, id);
      const input = taskUpdateSchema.parse(parseJsonBody(req));

      const patch = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.due_date !== undefined ? { due_date: input.due_date } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      };

      if (Object.keys(patch).length) {
        const { error } = await supabase.from('tasks').update(patch).eq('user_id', user.id).eq('id', id);
        if (error) throw error;
      }

      if (input.assignee_ids) {
        await replaceAssignees(supabase, user.id, id, input.assignee_ids);
      }

      if (input.label_ids) {
        await replaceLabels(supabase, user.id, id, input.label_ids);
      }

      const nextStatus = input.status;
      const didMove = nextStatus && nextStatus !== previous.status;
      if (didMove && nextStatus) {
        await recordActivity(supabase, user.id, id, 'task_moved', taskMoveMessage(previous.status, nextStatus), {
          from: previous.status,
          to: nextStatus,
        });
      } else if (Object.keys(patch).length || input.assignee_ids || input.label_ids) {
        await recordActivity(supabase, user.id, id, 'task_updated', 'Updated task', {
          fields: Object.keys(patch),
          assigneesChanged: Boolean(input.assignee_ids),
          labelsChanged: Boolean(input.label_ids),
        });
      }

      const task = await hydrateTask(supabase, user.id, id);
      return sendData(res, task);
    }

    if (req.method === 'DELETE') {
      await getTaskOrThrow(supabase, user.id, id);
      await recordActivity(supabase, user.id, id, 'task_deleted', 'Deleted task');
      const { error } = await supabase.from('tasks').delete().eq('user_id', user.id).eq('id', id);
      if (error) throw error;
      return sendNoContent(res);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

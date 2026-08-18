import { requireUser } from '../_shared/auth.js';
import { getRequestToday } from '../_shared/dateOnly.js';
import {
  assertOwnedRelationIds,
  getNextPosition,
  hydrateBoard,
  hydrateTask,
  recordActivityBestEffort,
  replaceAssignees,
  replaceLabels,
  type BoardFilters,
} from '../_shared/data.js';
import { handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../_shared/http.js';
import { boardFilterSchema, taskCreateSchema } from '../_shared/validation.js';
import type { VercelRequest, VercelResponse } from '../_shared/vercel.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);

    if (req.method === 'GET') {
      const filters: BoardFilters = {
        ...boardFilterSchema.parse({
          search: queryString(req.query.search),
          status: queryString(req.query.status),
          priority: queryString(req.query.priority),
          label_id: queryString(req.query.label_id),
          assignee_id: queryString(req.query.assignee_id),
          due: queryString(req.query.due),
        }),
        today: getRequestToday(req),
      };
      const payload = await hydrateBoard(supabase, user.id, filters);
      return sendData(res, payload);
    }

    if (req.method === 'POST') {
      const input = taskCreateSchema.parse(parseJsonBody(req));
      await assertOwnedRelationIds(supabase, user.id, input.assignee_ids, input.label_ids);
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

      let task: Awaited<ReturnType<typeof hydrateTask>>;
      try {
        await replaceAssignees(supabase, user.id, data.id, input.assignee_ids, []);
        await replaceLabels(supabase, user.id, data.id, input.label_ids, []);
        await recordActivityBestEffort(supabase, user.id, data.id, 'task_created', 'Created task', {
          title: input.title,
        });
        task = await hydrateTask(supabase, user.id, data.id);
      } catch (error) {
        const rollback = await supabase.from('tasks').delete().eq('user_id', user.id).eq('id', data.id);
        if (rollback.error) console.error(`Failed to roll back incomplete task ${data.id}`, rollback.error);
        throw error;
      }
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

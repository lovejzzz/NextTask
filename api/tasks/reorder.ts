import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth';
import { getTaskOrThrow, hydrateBoard, recordActivity, taskMoveMessage } from '../_shared/data';
import { handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../_shared/http';
import { reorderSchema } from '../_shared/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PATCH') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);
    const input = reorderSchema.parse(parseJsonBody(req));

    for (const update of input.updates) {
      const previous = await getTaskOrThrow(supabase, user.id, update.id);
      const { error } = await supabase
        .from('tasks')
        .update({ status: update.status, position: update.position })
        .eq('user_id', user.id)
        .eq('id', update.id);

      if (error) throw error;

      if (previous.status !== update.status) {
        await recordActivity(
          supabase,
          user.id,
          update.id,
          'task_moved',
          taskMoveMessage(previous.status, update.status),
          { from: previous.status, to: update.status },
        );
      }
    }

    const payload = await hydrateBoard(supabase, user.id);
    return sendData(res, payload);
  } catch (error) {
    return handleApiError(res, error);
  }
}

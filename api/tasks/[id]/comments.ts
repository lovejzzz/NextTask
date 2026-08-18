import { getTaskOrThrow, recordActivityBestEffort } from '../../_shared/data.js';
import { getUuidParam, handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../../_shared/http.js';
import { commentSchema } from '../../_shared/validation.js';
import type { VercelRequest, VercelResponse } from '../../_shared/vercel.js';
import { requireBoard } from '../../_shared/workspace.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user, board } = await requireBoard(req, req.method === 'GET' ? 'read' : 'write');
    const id = getUuidParam(req, 'id', 'Task id');

    await getTaskOrThrow(supabase, board.id, id);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('board_id', board.id)
        .eq('task_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return sendData(res, data ?? []);
    }

    if (req.method === 'POST') {
      const input = commentSchema.parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: id, board_id: board.id, user_id: user.id, body: input.body })
        .select('*')
        .single();
      if (error || !data) throw error;
      await recordActivityBestEffort(supabase, user.id, board.id, id, 'comment_added', 'Commented', {
        comment_id: data.id,
      });
      return sendData(res, data, 201);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

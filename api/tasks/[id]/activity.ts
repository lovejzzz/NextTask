import { getTaskOrThrow } from '../../_shared/data.js';
import { getUuidParam, handleApiError, methodNotAllowed, sendData } from '../../_shared/http.js';
import type { VercelRequest, VercelResponse } from '../../_shared/vercel.js';
import { requireBoard } from '../../_shared/workspace.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return methodNotAllowed(res, req.method);

    const { supabase, board } = await requireBoard(req, 'read');
    const id = getUuidParam(req, 'id', 'Task id');

    await getTaskOrThrow(supabase, board.id, id);

    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .eq('board_id', board.id)
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return sendData(res, data ?? []);
  } catch (error) {
    return handleApiError(res, error);
  }
}

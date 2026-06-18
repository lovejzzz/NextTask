import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../../../_shared/auth.js';
import { getTaskOrThrow, recordActivity } from '../../../_shared/data.js';
import { getParam, handleApiError, methodNotAllowed, sendNoContent } from '../../../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'DELETE') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);
    const id = getParam(req, 'id');
    const commentId = getParam(req, 'commentId');
    if (!id || !commentId) {
      return res.status(400).json({ error: { code: 'bad_request', message: 'Task id and comment id are required' } });
    }

    await getTaskOrThrow(supabase, user.id, id);
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('user_id', user.id)
      .eq('task_id', id)
      .eq('id', commentId);
    if (error) throw error;

    await recordActivity(supabase, user.id, id, 'comment_deleted', 'Deleted a comment', { comment_id: commentId });
    return sendNoContent(res);
  } catch (error) {
    return handleApiError(res, error);
  }
}

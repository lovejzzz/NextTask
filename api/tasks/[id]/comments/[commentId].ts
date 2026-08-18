import { requireUser } from '../../../_shared/auth.js';
import { getTaskOrThrow, recordActivityBestEffort } from '../../../_shared/data.js';
import { ApiHttpError, getUuidParam, handleApiError, methodNotAllowed, sendNoContent } from '../../../_shared/http.js';
import type { VercelRequest, VercelResponse } from '../../../_shared/vercel.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'DELETE') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);
    const id = getUuidParam(req, 'id', 'Task id');
    const commentId = getUuidParam(req, 'commentId', 'Comment id');

    await getTaskOrThrow(supabase, user.id, id);
    const { data, error } = await supabase
      .from('comments')
      .delete()
      .eq('user_id', user.id)
      .eq('task_id', id)
      .eq('id', commentId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiHttpError('not_found', 'Comment not found', 404);

    await recordActivityBestEffort(supabase, user.id, id, 'comment_deleted', 'Deleted a comment', {
      comment_id: commentId,
    });
    return sendNoContent(res);
  } catch (error) {
    return handleApiError(res, error);
  }
}

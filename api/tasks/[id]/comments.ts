import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../../_shared/auth';
import { getTaskOrThrow, recordActivity } from '../../_shared/data';
import { getParam, handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../../_shared/http';
import { commentSchema } from '../../_shared/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const id = getParam(req, 'id');
    if (!id) return res.status(400).json({ error: { code: 'bad_request', message: 'Task id is required' } });

    await getTaskOrThrow(supabase, user.id, id);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return sendData(res, data ?? []);
    }

    if (req.method === 'POST') {
      const input = commentSchema.parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: id, user_id: user.id, body: input.body })
        .select('*')
        .single();
      if (error || !data) throw error;
      await recordActivity(supabase, user.id, id, 'comment_added', 'Commented', { comment_id: data.id });
      return sendData(res, data, 201);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../../_shared/auth.js';
import { getTaskOrThrow } from '../../_shared/data.js';
import { getParam, handleApiError, methodNotAllowed, sendData } from '../../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);
    const id = getParam(req, 'id');
    if (!id) return res.status(400).json({ error: { code: 'bad_request', message: 'Task id is required' } });

    await getTaskOrThrow(supabase, user.id, id);

    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return sendData(res, data ?? []);
  } catch (error) {
    return handleApiError(res, error);
  }
}

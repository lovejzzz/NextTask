import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth.js';
import { getParam, handleApiError, methodNotAllowed, parseJsonBody, sendData, sendNoContent } from '../_shared/http.js';
import { labelSchema } from '../_shared/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const id = getParam(req, 'id');
    if (!id) return res.status(400).json({ error: { code: 'bad_request', message: 'Label id is required' } });

    if (req.method === 'PATCH') {
      const input = labelSchema.partial().parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('labels')
        .update(input)
        .eq('user_id', user.id)
        .eq('id', id)
        .select('*')
        .single();
      if (error || !data) throw error;
      return sendData(res, data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('labels').delete().eq('user_id', user.id).eq('id', id);
      if (error) throw error;
      return sendNoContent(res);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

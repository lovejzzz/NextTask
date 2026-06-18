import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth';
import { getParam, handleApiError, methodNotAllowed, parseJsonBody, sendData, sendNoContent } from '../_shared/http';
import { teamMemberSchema } from '../_shared/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const id = getParam(req, 'id');
    if (!id) return res.status(400).json({ error: { code: 'bad_request', message: 'Team member id is required' } });

    if (req.method === 'PATCH') {
      const input = teamMemberSchema.partial().parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('team_members')
        .update(input)
        .eq('user_id', user.id)
        .eq('id', id)
        .select('*')
        .single();
      if (error || !data) throw error;
      return sendData(res, data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('team_members').delete().eq('user_id', user.id).eq('id', id);
      if (error) throw error;
      return sendNoContent(res);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

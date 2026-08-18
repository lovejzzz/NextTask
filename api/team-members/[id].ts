import { requireUser } from '../_shared/auth.js';
import { ApiHttpError, getUuidParam, handleApiError, methodNotAllowed, parseJsonBody, sendData, sendNoContent } from '../_shared/http.js';
import { teamMemberUpdateSchema } from '../_shared/validation.js';
import type { VercelRequest, VercelResponse } from '../_shared/vercel.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const id = getUuidParam(req, 'id', 'Team member id');

    if (req.method === 'PATCH') {
      const input = teamMemberUpdateSchema.parse(parseJsonBody(req));
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
      const { data, error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiHttpError('not_found', 'Team member not found', 404);
      return sendNoContent(res);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

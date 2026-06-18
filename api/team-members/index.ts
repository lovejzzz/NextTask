import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth';
import { handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../_shared/http';
import { teamMemberSchema } from '../_shared/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return sendData(res, data ?? []);
    }

    if (req.method === 'POST') {
      const input = teamMemberSchema.parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('team_members')
        .insert({ ...input, user_id: user.id })
        .select('*')
        .single();
      if (error || !data) throw error;
      return sendData(res, data, 201);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

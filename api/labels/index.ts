import { handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../_shared/http.js';
import { labelSchema } from '../_shared/validation.js';
import type { VercelRequest, VercelResponse } from '../_shared/vercel.js';
import { requireBoard } from '../_shared/workspace.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user, board } = await requireBoard(req, req.method === 'GET' ? 'read' : 'write');

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('board_id', board.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return sendData(res, data ?? []);
    }

    if (req.method === 'POST') {
      const input = labelSchema.parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('labels')
        .insert({ ...input, board_id: board.id, user_id: user.id })
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

import { ApiHttpError, getUuidParam, handleApiError, methodNotAllowed, parseJsonBody, sendData, sendNoContent } from '../_shared/http.js';
import { labelUpdateSchema } from '../_shared/validation.js';
import type { VercelRequest, VercelResponse } from '../_shared/vercel.js';
import { requireBoard } from '../_shared/workspace.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, board } = await requireBoard(req, 'write');
    const id = getUuidParam(req, 'id', 'Label id');

    if (req.method === 'PATCH') {
      const input = labelUpdateSchema.parse(parseJsonBody(req));
      const { data, error } = await supabase
        .from('labels')
        .update(input)
        .eq('board_id', board.id)
        .eq('id', id)
        .select('*')
        .single();
      if (error || !data) throw error;
      return sendData(res, data);
    }

    if (req.method === 'DELETE') {
      const { data, error } = await supabase
        .from('labels')
        .delete()
        .eq('board_id', board.id)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiHttpError('not_found', 'Label not found', 404);
      return sendNoContent(res);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

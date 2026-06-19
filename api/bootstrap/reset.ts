import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth.js';
import { hydrateBoard } from '../_shared/data.js';
import { handleApiError, methodNotAllowed, sendData } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);

    // Deleting tasks cascades to assignees, label links, comments, and activity.
    // Removing team members and labels as well returns the board to the initial empty state.
    const tasksDelete = await supabase.from('tasks').delete().eq('user_id', user.id);
    if (tasksDelete.error) throw tasksDelete.error;

    const membersDelete = await supabase.from('team_members').delete().eq('user_id', user.id);
    if (membersDelete.error) throw membersDelete.error;

    const labelsDelete = await supabase.from('labels').delete().eq('user_id', user.id);
    if (labelsDelete.error) throw labelsDelete.error;

    const payload = await hydrateBoard(supabase, user.id);
    return sendData(res, payload);
  } catch (error) {
    return handleApiError(res, error);
  }
}

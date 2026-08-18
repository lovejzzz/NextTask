import { isBountyCheckRequest } from './_shared/bountyRoute.js';
import { isCollaborationRequest } from './_shared/collaborationEndpoint.js';
import { classifyDueDate, getRequestToday } from './_shared/dateOnly.js';
import { ApiHttpError, handleApiError, methodNotAllowed, sendData } from './_shared/http.js';
import type { VercelRequest, VercelResponse } from './_shared/vercel.js';
import { requireBoard } from './_shared/workspace.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (isCollaborationRequest(req)) {
    const { handleCollaboration } = await import('./_shared/collaborationEndpoint.js');
    return handleCollaboration(req, res);
  }

  if (isBountyCheckRequest(req)) {
    const { handleBountyCheck } = await import('./_shared/bountyEndpoint.js');
    return handleBountyCheck(req, res);
  }

  try {
    if (req.method !== 'GET') return methodNotAllowed(res, req.method);
    const { supabase, board } = await requireBoard(req, 'read');
    const { data, error } = await supabase
      .from('tasks')
      .select('status,priority,due_date')
      .eq('board_id', board.id);
    if (error) throw new ApiHttpError('server_error', error.message, 500);
    const tasks = data ?? [];
    const today = getRequestToday(req);

    const payload = {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === 'done').length,
      overdue: tasks.filter((task) => classifyDueDate(task.due_date, task.status, today) === 'overdue').length,
      dueSoon: tasks.filter((task) => classifyDueDate(task.due_date, task.status, today) === 'soon').length,
      byStatus: {
        todo: tasks.filter((task) => task.status === 'todo').length,
        in_progress: tasks.filter((task) => task.status === 'in_progress').length,
        in_review: tasks.filter((task) => task.status === 'in_review').length,
        done: tasks.filter((task) => task.status === 'done').length,
      },
      byPriority: {
        low: tasks.filter((task) => task.priority === 'low').length,
        normal: tasks.filter((task) => task.priority === 'normal').length,
        high: tasks.filter((task) => task.priority === 'high').length,
      },
    };

    return sendData(res, payload);
  } catch (error) {
    return handleApiError(res, error);
  }
}

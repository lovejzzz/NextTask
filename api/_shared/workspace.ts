import { z } from 'zod';

import { requireUser, type AuthedContext } from './auth.js';
import { ApiHttpError } from './http.js';
import type { VercelRequest } from './vercel.js';

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
export type BoardAccess = 'read' | 'write';

export type BoardContext = AuthedContext & {
  board: {
    id: string;
    workspaceId: string;
    name: string;
  };
  role: WorkspaceRole;
};

const boardIdSchema = z.string().uuid();

/**
 * Resolve the selected board and prove membership before a handler performs
 * any data query. RLS remains authoritative; the explicit board filter is
 * defense in depth and prevents accidental cross-board aggregation.
 *
 * Compatibility clients that do not send X-NextTask-Board-Id are routed to a
 * personal workspace/default board created transactionally by migration 004.
 */
export async function requireBoard(req: VercelRequest, access: BoardAccess = 'read'): Promise<BoardContext> {
  const context = await requireUser(req);
  const requestedBoardId = boardIdFromRequest(req);
  const boardId = requestedBoardId ?? (await ensurePersonalBoard(context));

  const { data: board, error: boardError } = await context.supabase
    .from('boards')
    .select('id,workspace_id,name')
    .eq('id', boardId)
    .maybeSingle();

  if (boardError) throw new ApiHttpError('server_error', boardError.message, 500);
  if (!board) throw new ApiHttpError('not_found', 'Board not found or no longer shared with you', 404);

  const { data: membership, error: membershipError } = await context.supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', board.workspace_id)
    .eq('user_id', context.user.id)
    .maybeSingle();

  if (membershipError) throw new ApiHttpError('server_error', membershipError.message, 500);
  if (!membership) throw new ApiHttpError('not_found', 'Board not found or no longer shared with you', 404);

  const role = membership.role as WorkspaceRole;
  if (access === 'write' && role === 'viewer') {
    throw new ApiHttpError('forbidden', 'This board is read-only for your workspace role', 403);
  }

  return {
    ...context,
    board: { id: board.id, workspaceId: board.workspace_id, name: board.name },
    role,
  };
}

export function boardIdFromRequest(req: VercelRequest) {
  const raw = req.headers['x-nexttask-board-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const parsed = boardIdSchema.safeParse(value);
  if (!parsed.success) throw new ApiHttpError('bad_request', 'X-NextTask-Board-Id must be a valid UUID', 400);
  return parsed.data;
}

async function ensurePersonalBoard(context: AuthedContext) {
  const { data, error } = await context.supabase.rpc('ensure_personal_workspace');
  if (error) throw new ApiHttpError('server_error', error.message, 500);
  const result = Array.isArray(data) ? data[0] : data;
  const boardId = result && typeof result === 'object' && 'board_id' in result ? String(result.board_id) : null;
  if (!boardId || !boardIdSchema.safeParse(boardId).success) {
    throw new ApiHttpError('server_error', 'Personal board bootstrap returned an invalid response', 500);
  }
  return boardId;
}

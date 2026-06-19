import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '../_shared/auth.js';
import { getTaskOrThrow, hydrateBoard, recordActivity, taskMoveMessage } from '../_shared/data.js';
import { handleApiError, methodNotAllowed, parseJsonBody, sendData } from '../_shared/http.js';
import { reorderSchema } from '../_shared/validation.js';

type ReorderUpdate = { id: string; status: 'todo' | 'in_progress' | 'in_review' | 'done'; position: number };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PATCH') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);
    const input = reorderSchema.parse(parseJsonBody(req));

    // Atomic path: one transactional RPC. Any failure inside rolls back the whole
    // batch, so positions can never end up half-updated.
    const { error: rpcError } = await supabase.rpc('reorder_tasks', { updates: input.updates });

    if (rpcError) {
      if (isMissingFunction(rpcError)) {
        if (process.env.ALLOW_REORDER_RPC_FALLBACK === 'true') {
          // Local-only escape hatch for development databases that have not applied migration 002.
          // Public deployments must use the transactional RPC.
          console.warn('reorder_tasks RPC unavailable; using sequential fallback. Apply migration 002_reorder_rpc.sql.');
          await reorderSequential(supabase, user.id, input.updates);
        } else {
          throw new Error('reorder_tasks RPC is missing. Apply supabase/migrations/002_reorder_rpc.sql.');
        }
      } else {
        throw rpcError;
      }
    }

    const payload = await hydrateBoard(supabase, user.id);
    return sendData(res, payload);
  } catch (error) {
    return handleApiError(res, error);
  }
}

function isMissingFunction(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || /could not find the function|does not exist/i.test(error.message ?? '');
}

/** Pre-RPC fallback: sequential updates. Not atomic — only used when the RPC is absent. */
async function reorderSequential(supabase: SupabaseClient, userId: string, updates: ReorderUpdate[]) {
  for (const update of updates) {
    const previous = await getTaskOrThrow(supabase, userId, update.id);
    const { error } = await supabase
      .from('tasks')
      .update({ status: update.status, position: update.position })
      .eq('user_id', userId)
      .eq('id', update.id);

    if (error) throw error;

    if (previous.status !== update.status) {
      await recordActivity(supabase, userId, update.id, 'task_moved', taskMoveMessage(previous.status, update.status), {
        from: previous.status,
        to: update.status,
      });
    }
  }
}

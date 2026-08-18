import { requireUser } from '../_shared/auth.js';
import {
  assertOwnedRelationIds,
  getAssigneeIds,
  getLabelIds,
  getTaskOrThrow,
  hydrateTask,
  recordActivity,
  recordAssigneeChanges,
  recordLabelChanges,
  replaceAssignees,
  replaceLabels,
  taskMoveMessage,
} from '../_shared/data.js';
import { ApiHttpError, getUuidParam, handleApiError, methodNotAllowed, parseJsonBody, sendData, sendNoContent } from '../_shared/http.js';
import { taskUpdateSchema } from '../_shared/validation.js';
import type { VercelRequest, VercelResponse } from '../_shared/vercel.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { supabase, user } = await requireUser(req);
    const id = getUuidParam(req, 'id', 'Task id');

    if (req.method === 'PATCH') {
      const previous = await getTaskOrThrow(supabase, user.id, id);
      const input = taskUpdateSchema.parse(parseJsonBody(req));
      await assertOwnedRelationIds(supabase, user.id, input.assignee_ids, input.label_ids);

      const patch = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.due_date !== undefined ? { due_date: input.due_date } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      };

      // Capture previous assignee/label sets before replacing, so we can emit
      // one granular activity event per added/removed member or label.
      const prevAssignees = input.assignee_ids ? await getAssigneeIds(supabase, user.id, id) : null;
      const prevLabels = input.label_ids ? await getLabelIds(supabase, user.id, id) : null;

      let assigneesChanged = false;
      let labelsChanged = false;
      try {
        if (input.assignee_ids) {
          await replaceAssignees(supabase, user.id, id, input.assignee_ids, prevAssignees ?? []);
          assigneesChanged = true;
        }

        if (input.label_ids) {
          await replaceLabels(supabase, user.id, id, input.label_ids, prevLabels ?? []);
          labelsChanged = true;
        }

        if (Object.keys(patch).length) {
          const { error } = await supabase.from('tasks').update(patch).eq('user_id', user.id).eq('id', id);
          if (error) throw error;
        }
      } catch (error) {
        if (labelsChanged) {
          await rollbackStep('labels', id, () => replaceLabels(supabase, user.id, id, prevLabels ?? []));
        }
        if (assigneesChanged) {
          await rollbackStep('assignees', id, () => replaceAssignees(supabase, user.id, id, prevAssignees ?? []));
        }
        throw error;
      }

      const nextStatus = input.status;
      const didMove = nextStatus && nextStatus !== previous.status;
      try {
        if (didMove && nextStatus) {
          await recordActivity(supabase, user.id, id, 'task_moved', taskMoveMessage(previous.status, nextStatus), {
            from: previous.status,
            to: nextStatus,
          });
        }

        // Field edits other than the status move get a single "Updated task" event.
        const editedFields = Object.keys(patch).filter((field) => field !== 'status' || !didMove);
        if (editedFields.length) {
          await recordActivity(supabase, user.id, id, 'task_updated', 'Updated task', { fields: editedFields });
        }

        if (input.assignee_ids) {
          await recordAssigneeChanges(supabase, user.id, id, prevAssignees ?? [], input.assignee_ids);
        }
        if (input.label_ids) {
          await recordLabelChanges(supabase, user.id, id, prevLabels ?? [], input.label_ids);
        }
      } catch (error) {
        console.error(`Failed to record update activity for task ${id}`, error);
      }

      const task = await hydrateTask(supabase, user.id, id);
      return sendData(res, task);
    }

    if (req.method === 'DELETE') {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiHttpError('not_found', 'Task not found', 404);
      return sendNoContent(res);
    }

    return methodNotAllowed(res, req.method);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function rollbackStep(label: string, taskId: string, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    console.error(`Failed to roll back ${label} for task ${taskId}`, error);
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiHttpError } from './http.js';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';
export type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'assignee_added'
  | 'assignee_removed'
  | 'label_added'
  | 'label_removed'
  | 'comment_added'
  | 'comment_deleted'
  | 'task_deleted';

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type LabelRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type TaskAssigneeRow = {
  task_id: string;
  member_id: string;
  user_id: string;
  created_at: string;
};

export type TaskLabelRow = {
  task_id: string;
  label_id: string;
  user_id: string;
  created_at: string;
};

export type CommentRow = {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  task_id: string;
  user_id: string;
  type: ActivityType;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type HydratedTask = TaskRow & {
  assignees: TeamMemberRow[];
  labels: LabelRow[];
  comment_count: number;
  latest_activity_at: string | null;
};

export type BoardPayload = {
  tasks: HydratedTask[];
  teamMembers: TeamMemberRow[];
  labels: LabelRow[];
};

export type BoardFilters = {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  label_id?: string;
  assignee_id?: string;
  due?: 'overdue' | 'soon' | 'none';
};

const selectTaskFields = 'id,user_id,title,description,status,priority,due_date,position,created_at,updated_at';

export async function hydrateBoard(
  supabase: SupabaseClient,
  userId: string,
  filters: BoardFilters = {},
): Promise<BoardPayload> {
  let taskQuery = supabase
    .from('tasks')
    .select(selectTaskFields)
    .eq('user_id', userId)
    .order('status', { ascending: true })
    .order('position', { ascending: true });

  if (filters.status) taskQuery = taskQuery.eq('status', filters.status);
  if (filters.priority) taskQuery = taskQuery.eq('priority', filters.priority);
  if (filters.search) {
    const term = `%${filters.search.replaceAll('%', '').replaceAll('_', '')}%`;
    taskQuery = taskQuery.or(`title.ilike.${term},description.ilike.${term}`);
  }

  const [
    { data: tasks, error: tasksError },
    { data: teamMembers, error: membersError },
    { data: labels, error: labelsError },
    { data: assignees, error: assigneesError },
    { data: taskLabels, error: taskLabelsError },
    { data: comments, error: commentsError },
    { data: activities, error: activitiesError },
  ] = await Promise.all([
    taskQuery,
    supabase.from('team_members').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('labels').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('task_assignees').select('*').eq('user_id', userId),
    supabase.from('task_labels').select('*').eq('user_id', userId),
    supabase.from('comments').select('id,task_id,user_id,body,created_at,updated_at').eq('user_id', userId),
    supabase.from('activity_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const firstError =
    tasksError || membersError || labelsError || assigneesError || taskLabelsError || commentsError || activitiesError;
  if (firstError) throw new ApiHttpError('server_error', firstError.message, 500);

  const memberMap = new Map((teamMembers as TeamMemberRow[] | null)?.map((member) => [member.id, member]) ?? []);
  const labelMap = new Map((labels as LabelRow[] | null)?.map((label) => [label.id, label]) ?? []);
  const commentsByTask = countBy((comments as CommentRow[] | null) ?? [], 'task_id');
  const latestActivityByTask = new Map<string, string>();

  for (const event of ((activities as ActivityRow[] | null) ?? [])) {
    if (!latestActivityByTask.has(event.task_id)) {
      latestActivityByTask.set(event.task_id, event.created_at);
    }
  }

  const assigneesByTask = groupBy((assignees as TaskAssigneeRow[] | null) ?? [], 'task_id');
  const labelsByTask = groupBy((taskLabels as TaskLabelRow[] | null) ?? [], 'task_id');

  let hydrated = ((tasks as TaskRow[] | null) ?? []).map((task) => ({
    ...task,
    assignees: (assigneesByTask.get(task.id) ?? [])
      .map((row) => memberMap.get(row.member_id))
      .filter(Boolean) as TeamMemberRow[],
    labels: (labelsByTask.get(task.id) ?? []).map((row) => labelMap.get(row.label_id)).filter(Boolean) as LabelRow[],
    comment_count: commentsByTask.get(task.id) ?? 0,
    latest_activity_at: latestActivityByTask.get(task.id) ?? null,
  }));

  hydrated = applyInMemoryFilters(hydrated, filters);

  return {
    tasks: hydrated,
    teamMembers: (teamMembers as TeamMemberRow[] | null) ?? [],
    labels: (labels as LabelRow[] | null) ?? [],
  };
}

export async function getTaskOrThrow(supabase: SupabaseClient, userId: string, taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(selectTaskFields)
    .eq('user_id', userId)
    .eq('id', taskId)
    .single();

  if (error || !data) throw new ApiHttpError('not_found', 'Task not found', 404);
  return data as TaskRow;
}

export async function getNextPosition(supabase: SupabaseClient, userId: string, status: TaskStatus) {
  const { data, error } = await supabase
    .from('tasks')
    .select('position')
    .eq('user_id', userId)
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1);

  if (error) throw new ApiHttpError('server_error', error.message, 500);
  return ((data?.[0]?.position as number | undefined) ?? 0) + 1000;
}

export async function replaceAssignees(supabase: SupabaseClient, userId: string, taskId: string, memberIds: string[]) {
  const { error: deleteError } = await supabase
    .from('task_assignees')
    .delete()
    .eq('user_id', userId)
    .eq('task_id', taskId);

  if (deleteError) throw new ApiHttpError('server_error', deleteError.message, 500);

  if (!memberIds.length) return;

  const rows = memberIds.map((member_id) => ({ task_id: taskId, member_id, user_id: userId }));
  const { error } = await supabase.from('task_assignees').insert(rows);
  if (error) throw new ApiHttpError('bad_request', error.message, 400);
}

export async function replaceLabels(supabase: SupabaseClient, userId: string, taskId: string, labelIds: string[]) {
  const { error: deleteError } = await supabase.from('task_labels').delete().eq('user_id', userId).eq('task_id', taskId);
  if (deleteError) throw new ApiHttpError('server_error', deleteError.message, 500);

  if (!labelIds.length) return;

  const rows = labelIds.map((label_id) => ({ task_id: taskId, label_id, user_id: userId }));
  const { error } = await supabase.from('task_labels').insert(rows);
  if (error) throw new ApiHttpError('bad_request', error.message, 400);
}

export async function getAssigneeIds(supabase: SupabaseClient, userId: string, taskId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('member_id')
    .eq('user_id', userId)
    .eq('task_id', taskId);
  if (error) throw new ApiHttpError('server_error', error.message, 500);
  return ((data as { member_id: string }[] | null) ?? []).map((row) => row.member_id);
}

export async function getLabelIds(supabase: SupabaseClient, userId: string, taskId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('task_labels')
    .select('label_id')
    .eq('user_id', userId)
    .eq('task_id', taskId);
  if (error) throw new ApiHttpError('server_error', error.message, 500);
  return ((data as { label_id: string }[] | null) ?? []).map((row) => row.label_id);
}

/** Record one assignee_added / assignee_removed event per changed member, named where possible. */
export async function recordAssigneeChanges(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  prevIds: string[],
  nextIds: string[],
) {
  const added = nextIds.filter((id) => !prevIds.includes(id));
  const removed = prevIds.filter((id) => !nextIds.includes(id));
  if (!added.length && !removed.length) return;

  const ids = [...new Set([...added, ...removed])];
  const { data } = await supabase.from('team_members').select('id,name').eq('user_id', userId).in('id', ids);
  const nameById = new Map(((data as { id: string; name: string }[] | null) ?? []).map((m) => [m.id, m.name]));

  for (const id of added) {
    await recordActivity(supabase, userId, taskId, 'assignee_added', `Added ${nameById.get(id) ?? 'a member'}`, {
      member_id: id,
    });
  }
  for (const id of removed) {
    await recordActivity(supabase, userId, taskId, 'assignee_removed', `Removed ${nameById.get(id) ?? 'a member'}`, {
      member_id: id,
    });
  }
}

/** Record one label_added / label_removed event per changed label, named where possible. */
export async function recordLabelChanges(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  prevIds: string[],
  nextIds: string[],
) {
  const added = nextIds.filter((id) => !prevIds.includes(id));
  const removed = prevIds.filter((id) => !nextIds.includes(id));
  if (!added.length && !removed.length) return;

  const ids = [...new Set([...added, ...removed])];
  const { data } = await supabase.from('labels').select('id,name').eq('user_id', userId).in('id', ids);
  const nameById = new Map(((data as { id: string; name: string }[] | null) ?? []).map((l) => [l.id, l.name]));

  for (const id of added) {
    await recordActivity(supabase, userId, taskId, 'label_added', `Added label ${nameById.get(id) ?? ''}`.trim(), {
      label_id: id,
    });
  }
  for (const id of removed) {
    await recordActivity(supabase, userId, taskId, 'label_removed', `Removed label ${nameById.get(id) ?? ''}`.trim(), {
      label_id: id,
    });
  }
}

export async function recordActivity(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  type: ActivityType,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from('activity_events').insert({
    task_id: taskId,
    user_id: userId,
    type,
    message,
    metadata,
  });

  if (error) throw new ApiHttpError('server_error', error.message, 500);
}

/**
 * Hydrate a single task with only its own joins — assignees, labels, comment
 * count, and latest activity. Used by create/update so a single-task mutation
 * never re-reads the entire board (no hydrateBoard call here). Returns the same
 * HydratedTask shape the board produces, so the client cache stays consistent.
 */
export async function hydrateTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<HydratedTask> {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(selectTaskFields)
    .eq('user_id', userId)
    .eq('id', taskId)
    .single();

  if (taskError || !task) throw new ApiHttpError('not_found', 'Task not found', 404);

  const [
    { data: assigneeLinks, error: assigneesError },
    { data: labelLinks, error: labelsError },
    { count: commentCount, error: commentsError },
    { data: latestActivity, error: activityError },
  ] = await Promise.all([
    supabase.from('task_assignees').select('member_id').eq('user_id', userId).eq('task_id', taskId),
    supabase.from('task_labels').select('label_id').eq('user_id', userId).eq('task_id', taskId),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('task_id', taskId),
    supabase
      .from('activity_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const linkError = assigneesError || labelsError || commentsError || activityError;
  if (linkError) throw new ApiHttpError('server_error', linkError.message, 500);

  const memberIds = ((assigneeLinks as { member_id: string }[] | null) ?? []).map((row) => row.member_id);
  const labelIds = ((labelLinks as { label_id: string }[] | null) ?? []).map((row) => row.label_id);

  const [{ data: members, error: membersError }, { data: labels, error: labelRowsError }] = await Promise.all([
    memberIds.length
      ? supabase.from('team_members').select('*').eq('user_id', userId).in('id', memberIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as TeamMemberRow[], error: null }),
    labelIds.length
      ? supabase.from('labels').select('*').eq('user_id', userId).in('id', labelIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as LabelRow[], error: null }),
  ]);

  if (membersError || labelRowsError) {
    throw new ApiHttpError('server_error', (membersError || labelRowsError)!.message, 500);
  }

  return {
    ...(task as TaskRow),
    assignees: (members as TeamMemberRow[] | null) ?? [],
    labels: (labels as LabelRow[] | null) ?? [],
    comment_count: commentCount ?? 0,
    latest_activity_at: (latestActivity as { created_at: string }[] | null)?.[0]?.created_at ?? null,
  };
}

export function taskMoveMessage(from: TaskStatus, to: TaskStatus) {
  return `Moved from ${statusLabel(from)} to ${statusLabel(to)}`;
}

export function statusLabel(status: TaskStatus) {
  return {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
  }[status];
}

function applyInMemoryFilters(tasks: HydratedTask[], filters: BoardFilters) {
  const today = startOfToday();
  const soon = addDays(today, 3);

  return tasks.filter((task) => {
    if (filters.label_id && !task.labels.some((label) => label.id === filters.label_id)) return false;
    if (filters.assignee_id && !task.assignees.some((member) => member.id === filters.assignee_id)) return false;
    if (filters.due === 'none' && task.due_date) return false;
    if (filters.due === 'overdue') {
      if (!task.due_date || task.status === 'done') return false;
      return new Date(`${task.due_date}T00:00:00`) < today;
    }
    if (filters.due === 'soon') {
      if (!task.due_date || task.status === 'done') return false;
      const date = new Date(`${task.due_date}T00:00:00`);
      return date >= today && date <= soon;
    }
    return true;
  });
}

function groupBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const value = String(row[key]);
    const existing = map.get(value) ?? [];
    existing.push(row);
    map.set(value, existing);
  }
  return map;
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key]);
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

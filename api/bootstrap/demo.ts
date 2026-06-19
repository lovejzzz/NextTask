import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_shared/auth.js';
import { hydrateBoard, recordActivity } from '../_shared/data.js';
import { handleApiError, methodNotAllowed, sendData } from '../_shared/http.js';

const memberSeed = [
  { name: 'Avery Stone', color: '#7A5AF8' },
  { name: 'Mina Chen', color: '#2E90FA' },
  { name: 'Leo Park', color: '#12B76A' },
];

const labelSeed = [
  { name: 'Feature', color: '#2E90FA' },
  { name: 'Bug', color: '#E9354A' },
  { name: 'Design', color: '#7A5AF8' },
  { name: 'Launch', color: '#F79009' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return methodNotAllowed(res, req.method);

    const { supabase, user } = await requireUser(req);
    if (isResetRequest(req)) {
      // Deleting tasks cascades to assignees, label links, comments, and activity.
      // Removing team members and labels returns the board to the initial empty state.
      const tasksDelete = await supabase.from('tasks').delete().eq('user_id', user.id);
      if (tasksDelete.error) throw tasksDelete.error;

      const membersDelete = await supabase.from('team_members').delete().eq('user_id', user.id);
      if (membersDelete.error) throw membersDelete.error;

      const labelsDelete = await supabase.from('labels').delete().eq('user_id', user.id);
      if (labelsDelete.error) throw labelsDelete.error;

      const payload = await hydrateBoard(supabase, user.id);
      return sendData(res, payload);
    }

    const existing = await hydrateBoard(supabase, user.id);
    if (existing.tasks.length) return sendData(res, existing);

    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .insert(memberSeed.map((member) => ({ ...member, user_id: user.id })))
      .select('*');
    if (membersError || !members) throw membersError;

    const { data: labels, error: labelsError } = await supabase
      .from('labels')
      .insert(labelSeed.map((label) => ({ ...label, user_id: user.id })))
      .select('*');
    if (labelsError || !labels) throw labelsError;

    const tomorrow = formatDate(addDays(new Date(), 1));
    const inThree = formatDate(addDays(new Date(), 3));
    const overdue = formatDate(addDays(new Date(), -2));
    const nextWeek = formatDate(addDays(new Date(), 7));

    const taskSeed = [
      {
        title: 'Design polished drag overlay',
        description: 'Make card movement feel tactile with a lifted preview, clear drop targets, and no layout jump.',
        status: 'todo',
        priority: 'high',
        due_date: tomorrow,
        position: 1000,
      },
      {
        title: 'Write Supabase RLS verification notes',
        description: 'Document how anonymous users are isolated and which policies protect each table.',
        status: 'todo',
        priority: 'normal',
        due_date: nextWeek,
        position: 2000,
      },
      {
        title: 'Build comment composer',
        description: 'Add a compact comment flow inside the task drawer with timestamps and activity events.',
        status: 'in_progress',
        priority: 'normal',
        due_date: inThree,
        position: 1000,
      },
      {
        title: 'Tune mobile board controls',
        description: 'Use a reliable status fallback on small screens while keeping desktop drag excellent.',
        status: 'in_progress',
        priority: 'high',
        due_date: tomorrow,
        position: 2000,
      },
      {
        title: 'Review task card hierarchy',
        description: 'Confirm title, labels, due dates, priority, and assignees scan well at a glance.',
        status: 'in_review',
        priority: 'high',
        due_date: overdue,
        position: 1000,
      },
      {
        title: 'Create default label set',
        description: 'Seed Feature, Bug, Design, and Launch labels for new demo boards.',
        status: 'in_review',
        priority: 'low',
        due_date: null,
        position: 2000,
      },
      {
        title: 'Set up anonymous guest session',
        description: 'Automatically create a guest user on first launch and preserve the browser session.',
        status: 'done',
        priority: 'high',
        due_date: null,
        position: 1000,
      },
      {
        title: 'Define Next Task visual system',
        description: 'Lock palette, spacing, states, and motion timings for the high-end board UI.',
        status: 'done',
        priority: 'normal',
        due_date: null,
        position: 2000,
      },
    ] as const;

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(taskSeed.map((task) => ({ ...task, user_id: user.id })))
      .select('*');
    if (tasksError || !tasks) throw tasksError;

    const feature = labels.find((label) => label.name === 'Feature');
    const bug = labels.find((label) => label.name === 'Bug');
    const design = labels.find((label) => label.name === 'Design');
    const launch = labels.find((label) => label.name === 'Launch');

    const taskLabels = tasks.flatMap((task, index) => {
      const assigned = [index % 2 === 0 ? feature : design, index === 4 ? bug : null, index > 5 ? launch : null].filter(
        Boolean,
      );
      return assigned.map((label) => ({ task_id: task.id, label_id: label!.id, user_id: user.id }));
    });

    const taskAssignees = tasks.flatMap((task, index) => [
      { task_id: task.id, member_id: members[index % members.length].id, user_id: user.id },
    ]);

    const { error: labelsLinkError } = await supabase.from('task_labels').insert(taskLabels);
    if (labelsLinkError) throw labelsLinkError;

    const { error: assigneeError } = await supabase.from('task_assignees').insert(taskAssignees);
    if (assigneeError) throw assigneeError;

    const commentRows = tasks.slice(0, 4).map((task, index) => ({
      task_id: task.id,
      user_id: user.id,
      body: [
        'This is the polish pass that will make the board feel finished.',
        'Keep this scoped and visible in the final README.',
        'The drawer interaction should feel fast and calm.',
        'Verify this on a phone-width viewport before deploy.',
      ][index],
    }));

    const { error: commentsError } = await supabase.from('comments').insert(commentRows);
    if (commentsError) throw commentsError;

    for (const task of tasks) {
      await recordActivity(supabase, user.id, task.id, 'task_created', 'Created task', { title: task.title });
    }

    const payload = await hydrateBoard(supabase, user.id);
    return sendData(res, payload, 201);
  } catch (error) {
    return handleApiError(res, error);
  }
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isResetRequest(req: VercelRequest) {
  return req.query.mode === 'reset' || req.url?.startsWith('/api/bootstrap/reset');
}

import { requireUser } from '../_shared/auth.js';
import { addDateOnlyDays, getRequestToday } from '../_shared/dateOnly.js';
import { hydrateBoard, recordActivityBestEffort } from '../_shared/data.js';
import { isMissingRpcFunction } from '../_shared/database.js';
import { handleApiError, methodNotAllowed, sendData } from '../_shared/http.js';
import type { VercelRequest, VercelResponse } from '../_shared/vercel.js';

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
      const { error } = await supabase.rpc('reset_board');
      if (error) {
        if (isMissingRpcFunction(error) && process.env.ALLOW_RESET_RPC_FALLBACK === 'true') {
          console.warn('reset_board RPC unavailable; using sequential fallback. Apply migration 003_data_constraints.sql.');
          await resetSequentially(supabase, user.id);
        } else {
          throw error;
        }
      }

      const payload = await hydrateBoard(supabase, user.id);
      return sendData(res, payload);
    }

    const existing = await hydrateBoard(supabase, user.id);
    if (existing.tasks.length) return sendData(res, existing);

    const existingMemberNames = new Set(existing.teamMembers.map((member) => member.name.toLowerCase()));
    const missingMembers = memberSeed.filter((member) => !existingMemberNames.has(member.name.toLowerCase()));
    const memberInsert = missingMembers.length
      ? await supabase
          .from('team_members')
          .insert(missingMembers.map((member) => ({ ...member, user_id: user.id })))
          .select('*')
      : { data: [], error: null };
    if (memberInsert.error || !memberInsert.data) throw memberInsert.error;
    const members = [...existing.teamMembers, ...memberInsert.data];

    const existingLabelNames = new Set(existing.labels.map((label) => label.name.toLowerCase()));
    const missingLabels = labelSeed.filter((label) => !existingLabelNames.has(label.name.toLowerCase()));
    const labelInsert = missingLabels.length
      ? await supabase
          .from('labels')
          .insert(missingLabels.map((label) => ({ ...label, user_id: user.id })))
          .select('*')
      : { data: [], error: null };
    if (labelInsert.error || !labelInsert.data) throw labelInsert.error;
    const labels = [...existing.labels, ...labelInsert.data];

    const today = getRequestToday(req);
    const tomorrow = addDateOnlyDays(today, 1);
    const inThree = addDateOnlyDays(today, 3);
    const overdue = addDateOnlyDays(today, -2);
    const nextWeek = addDateOnlyDays(today, 7);

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

    const membersByName = new Map(members.map((member) => [member.name.toLowerCase(), member]));
    const labelsByName = new Map(labels.map((label) => [label.name.toLowerCase(), label]));
    const sampleMembers = memberSeed.map((member) => membersByName.get(member.name.toLowerCase())!);
    const feature = labelsByName.get('feature');
    const bug = labelsByName.get('bug');
    const design = labelsByName.get('design');
    const launch = labelsByName.get('launch');

    const taskLabels = tasks.flatMap((task, index) => {
      const assigned = [index % 2 === 0 ? feature : design, index === 4 ? bug : null, index > 5 ? launch : null].filter(
        Boolean,
      );
      return assigned.map((label) => ({ task_id: task.id, label_id: label!.id, user_id: user.id }));
    });

    const taskAssignees = tasks.flatMap((task, index) => [
      { task_id: task.id, member_id: sampleMembers[index % sampleMembers.length].id, user_id: user.id },
    ]);

    try {
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
        await recordActivityBestEffort(supabase, user.id, task.id, 'task_created', 'Created task', {
          title: task.title,
        });
      }

      const payload = await hydrateBoard(supabase, user.id);
      return sendData(res, payload, 201);
    } catch (error) {
      const rollback = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id)
        .in(
          'id',
          tasks.map((task) => task.id),
        );
      if (rollback.error) console.error('Failed to roll back incomplete demo tasks', rollback.error);
      throw error;
    }
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function resetSequentially(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], userId: string) {
  // Local-only compatibility path. Production uses reset_board so these three
  // destructive writes commit or roll back as one transaction.
  for (const table of ['tasks', 'team_members', 'labels'] as const) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  }
}

function isResetRequest(req: VercelRequest) {
  const pathname = req.url?.split(/[?#]/, 1)[0];
  return req.query.mode === 'reset' || pathname === '/api/bootstrap/reset';
}

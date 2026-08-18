import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

loadDotEnv();
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const stamp = `verify-v02-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const result = { auth: null, tables: {}, collaboration: null, realtime: null, isolation: null, boardBoundaries: null, invitations: null, audit: null, lifecycle: null, accountDeletion: null, dataConstraints: null, reorderRpc: null, rateLimit: null };
const makeClient = () => createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const clients = [makeClient(), makeClient(), makeClient(), makeClient()];
const [ownerClient, editorClient, viewerClient, outsiderClient] = clients;
const users = [];
let workspaceId = null;
let boardId = null;
const deletedUserIndexes = new Set();

async function main() {
  for (const client of clients) {
    const auth = await client.auth.signInAnonymously();
    if (auth.error || !auth.data.user) throw new Error(`anonymous auth: ${auth.error?.message ?? 'no user'}`);
    users.push(auth.data.user.id);
    const ensured = await client.rpc('ensure_personal_workspace');
    if (ensured.error) throw new Error(`personal workspace bootstrap: ${ensured.error.message}`);
  }
  if (new Set(users).size !== users.length) throw new Error('expected four distinct anonymous users');
  result.auth = { ok: true, users: users.length };

  const requiredTables = ['workspaces', 'workspace_members', 'boards', 'workspace_invitations', 'workspace_audit_events', 'tasks', 'team_members', 'labels', 'task_assignees', 'task_labels', 'comments', 'activity_events'];
  for (const table of requiredTables) {
    const query = await ownerClient.from(table).select('*').limit(1);
    result.tables[table] = query.error ? { ok: false, code: query.error.code, message: query.error.message } : { ok: true, rowsVisible: query.data?.length ?? 0 };
  }
  if (Object.values(result.tables).some((table) => !table.ok)) throw new Error('table visibility failed');

  const createdWorkspace = await ownerClient.rpc('create_workspace', { workspace_name: `${stamp} workspace` });
  if (createdWorkspace.error) throw new Error(`create workspace: ${createdWorkspace.error.message}`);
  workspaceId = firstRow(createdWorkspace.data)?.workspace_id;
  boardId = firstRow(createdWorkspace.data)?.board_id;
  if (!workspaceId || !boardId) throw new Error('create_workspace did not return workspace and board ids');

  const boardInsert = await ownerClient.from('boards').insert({ workspace_id: workspaceId, created_by: users[0], name: `${stamp} second board` }).select('id').single();
  if (boardInsert.error || !boardInsert.data) throw new Error(`create second board: ${boardInsert.error?.message}`);
  const secondBoardId = boardInsert.data.id;

  const editorToken = await createInvitation('editor');
  const viewerToken = await createInvitation('viewer');
  const editorAccept = await editorClient.rpc('accept_workspace_invitation', { invitation_token: editorToken });
  const viewerAccept = await viewerClient.rpc('accept_workspace_invitation', { invitation_token: viewerToken });
  if (editorAccept.error || viewerAccept.error) throw new Error(`accept invitations: ${editorAccept.error?.message ?? viewerAccept.error?.message}`);

  result.realtime = await checkRealtimeAndPresence();

  const taskId = await insertTask(ownerClient, users[0], boardId, `${stamp} shared task`, 'todo', 999000);
  const editorRead = await editorClient.from('tasks').select('id').eq('id', taskId).maybeSingle();
  const editorUpdate = await editorClient.from('tasks').update({ status: 'in_progress' }).eq('id', taskId).select('status').maybeSingle();
  const viewerRead = await viewerClient.from('tasks').select('id').eq('id', taskId).maybeSingle();
  const viewerUpdate = await viewerClient.from('tasks').update({ title: 'viewer hijack' }).eq('id', taskId).select('id');
  const viewerInsert = await viewerClient.from('tasks').insert({ board_id: boardId, user_id: users[2], title: `${stamp} viewer insert`, description: '', status: 'todo', priority: 'normal', position: 1 });
  const ownerStillSees = await ownerClient.from('tasks').select('title,status').eq('id', taskId).single();
  const ownerDemotion = await ownerClient.from('workspace_members').update({ role: 'editor' }).eq('workspace_id', workspaceId).eq('user_id', users[0]).select('role');
  result.collaboration = {
    editorCanRead: !editorRead.error && editorRead.data?.id === taskId,
    editorCanWrite: !editorUpdate.error && editorUpdate.data?.status === 'in_progress',
    viewerCanRead: !viewerRead.error && viewerRead.data?.id === taskId,
    viewerUpdateBlocked: !viewerUpdate.error && (viewerUpdate.data?.length ?? 0) === 0,
    viewerInsertBlocked: Boolean(viewerInsert.error),
    ownerDataIntact: ownerStillSees.data?.title === `${stamp} shared task`,
    ownerDemotionBlocked: Boolean(ownerDemotion.error) || (ownerDemotion.data?.length ?? 0) === 0,
  };
  assertAll(result.collaboration, 'collaboration roles');

  const outsiderRead = await outsiderClient.from('tasks').select('id').eq('id', taskId);
  const outsiderWorkspace = await outsiderClient.from('workspaces').select('id').eq('id', workspaceId);
  const outsiderUpdate = await outsiderClient.from('tasks').update({ title: 'outsider hijack' }).eq('id', taskId).select('id');
  result.isolation = {
    outsiderCannotReadTask: !outsiderRead.error && (outsiderRead.data?.length ?? 0) === 0,
    outsiderCannotReadWorkspace: !outsiderWorkspace.error && (outsiderWorkspace.data?.length ?? 0) === 0,
    outsiderCannotWrite: !outsiderUpdate.error && (outsiderUpdate.data?.length ?? 0) === 0,
  };
  assertAll(result.isolation, 'nonmember isolation');

  const secondTaskId = await insertTask(ownerClient, users[0], secondBoardId, `${stamp} second-board task`, 'todo', 999100);
  const teamMember = await ownerClient.from('team_members').insert({ board_id: boardId, user_id: users[0], name: `${stamp} member`, color: '#6366f1' }).select('id').single();
  if (teamMember.error || !teamMember.data) throw new Error(`team member setup: ${teamMember.error?.message}`);
  const mismatchedRelation = await ownerClient.from('task_assignees').insert({ task_id: secondTaskId, member_id: teamMember.data.id, board_id: secondBoardId, user_id: users[0] });
  const moveBoard = await ownerClient.from('tasks').update({ board_id: secondBoardId }).eq('id', taskId);
  const changeCreator = await ownerClient.from('tasks').update({ user_id: users[1] }).eq('id', taskId);
  result.boardBoundaries = {
    crossBoardRelationRejected: mismatchedRelation.error?.code === '23503',
    boardMoveRejected: moveBoard.error?.code === '42501',
    creatorChangeRejected: changeCreator.error?.code === '42501',
  };
  assertAll(result.boardBoundaries, 'board boundary constraints');

  const reuse = await editorClient.rpc('accept_workspace_invitation', { invitation_token: editorToken });
  const downgradeToken = await createInvitation('viewer');
  const downgradeAttempt = await editorClient.rpc('accept_workspace_invitation', { invitation_token: downgradeToken });
  const editorMembership = await editorClient.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', users[1]).single();
  result.invitations = { oneTimeTokenEnforced: Boolean(reuse.error), repeatInviteAccepted: !downgradeAttempt.error, existingRoleNotDowngraded: editorMembership.data?.role === 'editor' };
  assertAll(result.invitations, 'invitation security');

  result.reorderRpc = await checkReorderRpc(taskId, secondTaskId);
  result.dataConstraints = await checkDataConstraints(taskId);
  result.rateLimit = await checkRateLimit();
  result.lifecycle = await checkLifecycle();
  result.audit = await checkAudit();
  result.accountDeletion = await checkAccountDeletion();
  result.ok = true;
}

async function checkLifecycle() {
  const transfer = await ownerClient.rpc('transfer_workspace_ownership', {
    target_workspace_id: workspaceId,
    new_owner_id: users[1],
  });
  const workspaceAfterTransfer = await editorClient.from('workspaces').select('owner_id').eq('id', workspaceId).single();
  const membershipsAfterTransfer = await editorClient
    .from('workspace_members')
    .select('user_id,role')
    .eq('workspace_id', workspaceId)
    .in('user_id', [users[0], users[1]]);
  const roleByUser = new Map((membershipsAfterTransfer.data ?? []).map((membership) => [membership.user_id, membership.role]));
  const formerOwnerAdminAttempt = await ownerClient.rpc('create_workspace_invitation', {
    target_workspace_id: workspaceId,
    invite_role: 'viewer',
    target_email: null,
  });
  const returnTransfer = await editorClient.rpc('transfer_workspace_ownership', {
    target_workspace_id: workspaceId,
    new_owner_id: users[0],
  });
  const viewerLeave = await viewerClient.rpc('leave_workspace', { target_workspace_id: workspaceId });
  const viewerReadAfterLeave = await viewerClient.from('workspaces').select('id').eq('id', workspaceId);
  const ownerLeave = await ownerClient.rpc('leave_workspace', { target_workspace_id: workspaceId });
  const checks = {
    ownershipTransferSucceeded: !transfer.error,
    ownerIdChangedAtomically: workspaceAfterTransfer.data?.owner_id === users[1],
    previousOwnerBecameEditor: roleByUser.get(users[0]) === 'editor',
    newOwnerRoleApplied: roleByUser.get(users[1]) === 'owner',
    formerOwnerLostAdminAccess: formerOwnerAdminAttempt.error?.code === '42501',
    newOwnerCanTransferBack: !returnTransfer.error,
    memberCanLeave: !viewerLeave.error,
    departedMemberLosesAccess: !viewerReadAfterLeave.error && (viewerReadAfterLeave.data?.length ?? 0) === 0,
    ownerCannotLeaveWithoutTransfer: ownerLeave.error?.code === '42501',
  };
  assertAll(checks, 'workspace lifecycle');
  return checks;
}

async function checkAudit() {
  const revocable = await createInvitationRecord('viewer');
  const revoke = await ownerClient.rpc('revoke_workspace_invitation', {
    target_workspace_id: workspaceId,
    target_invitation_id: revocable.id,
  });
  const revokedAccept = await outsiderClient.rpc('accept_workspace_invitation', { invitation_token: revocable.token });
  const revokedRow = await ownerClient
    .from('workspace_invitations')
    .select('revoked_at')
    .eq('id', revocable.id)
    .single();
  const ownerAudit = await ownerClient
    .from('workspace_audit_events')
    .select('action')
    .eq('workspace_id', workspaceId);
  const editorAudit = await editorClient
    .from('workspace_audit_events')
    .select('id')
    .eq('workspace_id', workspaceId);
  const fabricated = await editorClient.from('workspace_audit_events').insert({
    workspace_id: workspaceId,
    actor_user_id: users[1],
    action: 'fabricated_event',
    metadata: {},
  });
  const actions = new Set((ownerAudit.data ?? []).map((event) => event.action));
  const expectedActions = [
    'workspace_created',
    'board_created',
    'invitation_created',
    'invitation_accepted',
    'invitation_revoked',
    'member_joined',
    'member_removed',
    'ownership_transferred',
  ];
  const checks = {
    revocationPreserved: !revoke.error && Boolean(revokedRow.data?.revoked_at),
    revokedTokenRejected: Boolean(revokedAccept.error),
    ownerCanReadAudit: !ownerAudit.error && expectedActions.every((action) => actions.has(action)),
    nonOwnerCannotReadAudit: !editorAudit.error && (editorAudit.data?.length ?? 0) === 0,
    clientsCannotFabricateAudit: fabricated.error?.code === '42501',
  };
  assertAll(checks, 'workspace audit');
  return { ...checks, actionsVerified: expectedActions.length };
}

async function checkAccountDeletion() {
  const ownerBlocked = await ownerClient.rpc('delete_own_account');
  const outsiderDeleted = await outsiderClient.rpc('delete_own_account');
  if (!outsiderDeleted.error) deletedUserIndexes.add(3);
  const deletedUser = await outsiderClient.auth.getUser();
  const checks = {
    sharedOwnerMustResolveOwnership: ownerBlocked.error?.code === '42501',
    unencumberedAccountDeletes: !outsiderDeleted.error,
    deletedAccountTokenRejected: Boolean(deletedUser.error) || !deletedUser.data.user,
  };
  assertAll(checks, 'account deletion');
  return checks;
}

async function checkRealtimeAndPresence() {
  const title = `${stamp} realtime task`;
  let resolveChange;
  let resolvePresence;
  const changeReceived = new Promise((resolve) => { resolveChange = resolve; });
  const presenceReceived = new Promise((resolve) => { resolvePresence = resolve; });
  await Promise.all([
    setRealtimeAuth(ownerClient),
    setRealtimeAuth(editorClient),
    setRealtimeAuth(outsiderClient),
  ]);

  const editorChannel = editorClient
    .channel(`board:${boardId}`, { config: { private: true, presence: { key: users[1] } } })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: `board_id=eq.${boardId}` }, (payload) => {
      resolveChange(payload);
    })
    .on('presence', { event: 'sync' }, () => {
      const presentUserIds = Object.values(editorChannel.presenceState())
        .flat()
        .map((presence) => presence.user_id);
      if (presentUserIds.includes(users[0]) && presentUserIds.includes(users[1])) resolvePresence(presentUserIds);
    });
  const ownerChannel = ownerClient.channel(`board:${boardId}`, {
    config: { private: true, presence: { key: users[0] } },
  });
  const outsiderChannel = outsiderClient.channel(`board:${boardId}`, {
    config: { private: true, presence: { key: users[3] } },
  });

  try {
    await Promise.all([
      withTimeout(subscribeChannel(ownerChannel), 10_000, 'Owner Presence subscription timed out'),
      withTimeout(subscribeChannel(editorChannel), 10_000, 'Editor Presence subscription timed out'),
    ]);
    await Promise.all([
      ownerChannel.track({ user_id: users[0], display_name: 'Owner', role: 'owner', online_at: new Date().toISOString() }),
      editorChannel.track({ user_id: users[1], display_name: 'Editor', role: 'editor', online_at: new Date().toISOString() }),
    ]);
    const presentUserIds = await withTimeout(presenceReceived, 10_000, 'Authorized Presence sync timed out');
    const realtimeTaskId = await insertTask(ownerClient, users[0], boardId, title, 'todo', 998900);
    const payload = await withTimeout(changeReceived, 10_000, 'Realtime insert event timed out');
    const outsiderDenied = await withTimeout(new Promise((resolve) => {
      outsiderChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(false);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve(true);
      });
    }), 10_000, 'Outsider Presence authorization timed out');
    const checks = {
      insertDeliveredToCollaborator: payload.new?.id === realtimeTaskId,
      boardFilterPreserved: payload.new?.board_id === boardId,
      authorizedMembersSharePresence: presentUserIds.includes(users[0]) && presentUserIds.includes(users[1]),
      outsiderPresenceDenied: outsiderDenied,
    };
    assertAll(checks, 'Realtime collaboration');
    return checks;
  } finally {
    await Promise.all([
      ownerClient.removeChannel(ownerChannel),
      editorClient.removeChannel(editorChannel),
      outsiderClient.removeChannel(outsiderChannel),
    ]);
  }
}

async function checkReorderRpc(taskId, crossBoardTaskId) {
  const valid = await editorClient.rpc('reorder_tasks', { updates: [{ id: taskId, status: 'in_review', position: 2000 }] });
  const before = await ownerClient.from('tasks').select('position').eq('id', taskId).single();
  const mixed = await ownerClient.rpc('reorder_tasks', { updates: [{ id: taskId, status: 'in_review', position: 7000 }, { id: crossBoardTaskId, status: 'todo', position: 7000 }] });
  const after = await ownerClient.from('tasks').select('position').eq('id', taskId).single();
  const viewer = await viewerClient.rpc('reorder_tasks', { updates: [{ id: taskId, status: 'done', position: 3000 }] });
  const checks = { editorReorderApplied: !valid.error, crossBoardBatchRejected: Boolean(mixed.error), crossBoardBatchRolledBack: before.data?.position === after.data?.position, viewerReorderRejected: viewer.error?.code === '42501' };
  assertAll(checks, 'reorder RPC');
  return checks;
}

async function checkDataConstraints(taskId) {
  const taskBase = { board_id: boardId, user_id: users[0], title: `${stamp} invalid constraint probe`, status: 'todo', priority: 'normal' };
  const checks = {
    longTaskDescriptionRejected: await constraintRejected(ownerClient.from('tasks').insert({ ...taskBase, description: 'x'.repeat(4001), position: 999010 }), 'tasks description length'),
    negativeTaskPositionRejected: await constraintRejected(ownerClient.from('tasks').insert({ ...taskBase, description: stamp, position: -1 }), 'tasks nonnegative position'),
    longAvatarUrlRejected: await constraintRejected(ownerClient.from('team_members').insert({ board_id: boardId, user_id: users[0], name: `${stamp} invalid avatar probe`, avatar_url: `https://example.com/${'x'.repeat(2050)}` }), 'team member avatar URL length'),
    blankActivityMessageRejected: await constraintRejected(ownerClient.from('activity_events').insert({ board_id: boardId, user_id: users[0], task_id: taskId, type: 'task_updated', message: '   ', metadata: {} }), 'activity message length'),
    nonObjectActivityMetadataRejected: await constraintRejected(ownerClient.from('activity_events').insert({ board_id: boardId, user_id: users[0], task_id: taskId, type: 'task_updated', message: stamp, metadata: [] }), 'activity metadata object shape'),
  };
  const activity = await ownerClient.from('activity_events').insert({ board_id: boardId, user_id: users[0], task_id: taskId, type: 'task_updated', message: `${stamp} immutable`, metadata: {} }).select('id').single();
  if (activity.error || !activity.data) throw new Error(`activity immutability setup: ${activity.error?.message}`);
  checks.activityUpdatesRejected = await mutationRejected(ownerClient.from('activity_events').update({ message: `${stamp} tampered` }).eq('id', activity.data.id).select('id'));
  checks.activityDeletesRejected = await mutationRejected(ownerClient.from('activity_events').delete().eq('id', activity.data.id).select('id'));
  assertAll(checks, 'database constraints');
  return checks;
}

async function checkRateLimit() {
  const args = { rate_scope: `${stamp}:rate`, maximum_requests: 2, window_seconds: 60 };
  const first = await ownerClient.rpc('consume_api_rate_limit', args);
  const second = await ownerClient.rpc('consume_api_rate_limit', args);
  const third = await ownerClient.rpc('consume_api_rate_limit', args);
  const checks = { firstAllowed: first.data === true, secondAllowed: second.data === true, thirdRejected: third.data === false, noErrors: !first.error && !second.error && !third.error };
  assertAll(checks, 'durable rate limit');
  return checks;
}

async function createInvitation(role) {
  return (await createInvitationRecord(role)).token;
}

async function createInvitationRecord(role) {
  const response = await ownerClient.rpc('create_workspace_invitation', { target_workspace_id: workspaceId, invite_role: role, target_email: null });
  if (response.error) throw new Error(`create ${role} invitation: ${response.error.message}`);
  const token = firstRow(response.data)?.invitation_token;
  const id = firstRow(response.data)?.invitation_id;
  if (typeof token !== 'string' || typeof id !== 'string') throw new Error('invitation RPC did not return an id and token');
  return { id, token };
}

async function insertTask(client, userId, targetBoardId, title, status, position) {
  const { data, error } = await client.from('tasks').insert({ board_id: targetBoardId, user_id: userId, title, description: stamp, status, priority: 'normal', position }).select('id').single();
  if (error || !data) throw new Error(`insert "${title}": ${error?.message ?? 'no row'}`);
  return data.id;
}

function firstRow(data) { return Array.isArray(data) ? data[0] : data; }
function assertAll(checks, label) { if (!Object.values(checks).every(Boolean)) throw new Error(`${label} failed: ${JSON.stringify(checks)}`); checks.ok = true; }
async function mutationRejected(query) { const response = await query; if (response.error) return response.error.code === '42501'; return (response.data?.length ?? 0) === 0; }
async function constraintRejected(query, label) { const response = await query; if (!response.error) return false; if (response.error.code !== '23514') throw new Error(`${label} probe returned ${response.error.code}: ${response.error.message}`); return true; }
async function withTimeout(promise, milliseconds, message) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(message)), milliseconds); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
async function setRealtimeAuth(client) {
  const session = await client.auth.getSession();
  if (session.error || !session.data.session?.access_token) {
    throw new Error(`Realtime auth session: ${session.error?.message ?? 'missing access token'}`);
  }
  await client.realtime.setAuth(session.data.session.access_token);
}
function subscribeChannel(channel) {
  return new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve(status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        reject(new Error(`Realtime subscription ${status.toLowerCase()}`));
      }
    });
  });
}
async function cleanup() {
  if (workspaceId) {
    let removed = false;
    for (const client of [ownerClient, editorClient]) {
      const response = await client.from('workspaces').delete().eq('id', workspaceId).select('id');
      if (response.error) throw new Error(`workspace cleanup: ${response.error.message}`);
      if ((response.data?.length ?? 0) > 0) removed = true;
    }
    if (!removed) throw new Error('workspace cleanup: owner could not delete verification workspace');
  }
  for (const [index, client] of clients.entries()) {
    if (deletedUserIndexes.has(index)) continue;
    const response = await client.rpc('delete_own_account');
    if (response.error) throw new Error(`account cleanup ${index}: ${response.error.message}`);
    deletedUserIndexes.add(index);
  }
}

let exitCode = 0;
try { await main(); } catch (error) { result.error = error instanceof Error ? error.message : String(error); exitCode = 1; }
finally { try { await cleanup(); result.cleanedUp = true; } catch (error) { result.cleanedUp = false; result.cleanupError = error instanceof Error ? error.message : String(error); } }
console.log(JSON.stringify(result, null, 2));
process.exit(exitCode);

function loadDotEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

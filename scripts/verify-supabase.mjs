import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const allowMissingReorderRpc = process.env.ALLOW_MISSING_REORDER_RPC === 'true';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL/SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

// Unique marker so every row this run creates can be found and cleaned up.
const stamp = `verify-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const result = {
  auth: null,
  tables: {},
  mutationCycle: null,
  isolation: null,
  reorderRpc: null,
};

function makeClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const requiredTables = ['tasks', 'team_members', 'labels', 'task_assignees', 'task_labels', 'comments', 'activity_events'];

const clientA = makeClient();
const clientB = makeClient();
let userA = null;
let userB = null;

async function main() {
  // --- Auth (User A) ---
  const authA = await clientA.auth.signInAnonymously();
  if (authA.error || !authA.data.user) throw new Error(`auth A: ${authA.error?.message ?? 'no user'}`);
  userA = authA.data.user.id;
  result.auth = { ok: true, userId: userA };

  // --- Table visibility ---
  for (const table of requiredTables) {
    const query = await clientA.from(table).select('*').limit(1);
    result.tables[table] = query.error
      ? { ok: false, code: query.error.code, message: query.error.message }
      : { ok: true, rowsVisible: query.data?.length ?? 0 };
  }
  if (Object.values(result.tables).some((t) => !t.ok)) throw new Error('table visibility failed');

  // --- Single-user mutation cycle ---
  const a1 = await insertTask(clientA, userA, `${stamp} A1`, 'todo', 999000);
  const update = await clientA
    .from('tasks')
    .update({ status: 'in_progress', position: 999001 })
    .eq('id', a1)
    .eq('user_id', userA)
    .select('*')
    .single();
  if (update.error || update.data?.status !== 'in_progress') {
    throw new Error(`mutation update: ${update.error?.message ?? 'status did not update'}`);
  }
  result.mutationCycle = { ok: true, taskId: a1 };

  // --- Two-user RLS isolation ---
  const authB = await clientB.auth.signInAnonymously();
  if (authB.error || !authB.data.user) throw new Error(`auth B: ${authB.error?.message ?? 'no user'}`);
  userB = authB.data.user.id;
  if (userB === userA) throw new Error('expected two distinct anonymous users');

  const bCannotRead = await clientB.from('tasks').select('*').eq('id', a1);
  const bUpdate = await clientB.from('tasks').update({ title: 'hijacked' }).eq('id', a1).select('*');
  const bDelete = await clientB.from('tasks').delete().eq('id', a1).select('*');
  const aStillSees = await clientA.from('tasks').select('title').eq('id', a1).single();

  const isolation = {
    crossUserSelectRows: bCannotRead.data?.length ?? 0,
    crossUserUpdateRows: bUpdate.data?.length ?? 0,
    crossUserDeleteRows: bDelete.data?.length ?? 0,
    ownerRowSurvived: aStillSees.data?.title === `${stamp} A1`,
  };
  isolation.ok =
    isolation.crossUserSelectRows === 0 &&
    isolation.crossUserUpdateRows === 0 &&
    isolation.crossUserDeleteRows === 0 &&
    isolation.ownerRowSurvived;
  result.isolation = isolation;
  if (!isolation.ok) throw new Error(`RLS isolation breach: ${JSON.stringify(isolation)}`);

  // --- Atomic reorder RPC invariants (skipped if migration 002 not applied) ---
  result.reorderRpc = await checkReorderRpc(a1);

  result.ok = true;
}

async function checkReorderRpc(a1) {
  const a2 = await insertTask(clientA, userA, `${stamp} A2`, 'todo', 1000);
  const b1 = await insertTask(clientB, userB, `${stamp} B1`, 'todo', 1000);

  // Probe availability.
  const probe = await clientA.rpc('reorder_tasks', {
    updates: [{ id: a1, status: 'in_progress', position: 2000 }],
  });
  if (probe.error) {
    if (probe.error.code === 'PGRST202' || /could not find the function|does not exist/i.test(probe.error.message)) {
      if (allowMissingReorderRpc) {
        return { ok: true, skipped: true, reason: 'reorder_tasks RPC not found (local-only skip enabled)' };
      }
      throw new Error('reorder_tasks RPC not found. Apply supabase/migrations/002_reorder_rpc.sql before release.');
    }
    throw new Error(`reorder rpc valid call: ${probe.error.message}`);
  }

  const checks = {};

  // valid call applied
  const afterValid = await clientA.from('tasks').select('status,position').eq('id', a1).single();
  checks.validApplied = afterValid.data?.status === 'in_progress' && afterValid.data?.position === 2000;

  // cross-user batch fails fully: a valid A update bundled with B's task must roll back entirely
  const before = await clientA.from('tasks').select('position').eq('id', a2).single();
  const mixed = await clientA.rpc('reorder_tasks', {
    updates: [
      { id: a2, status: 'todo', position: 7000 },
      { id: b1, status: 'todo', position: 7000 },
    ],
  });
  const afterMixed = await clientA.from('tasks').select('position').eq('id', a2).single();
  checks.mixedUserRejected = Boolean(mixed.error);
  checks.mixedUserRolledBack = afterMixed.data?.position === before.data?.position;

  // duplicate ids rejected
  const dup = await clientA.rpc('reorder_tasks', {
    updates: [
      { id: a2, status: 'todo', position: 3000 },
      { id: a2, status: 'todo', position: 4000 },
    ],
  });
  checks.duplicateRejected = Boolean(dup.error);

  // negative position rejected
  const neg = await clientA.rpc('reorder_tasks', { updates: [{ id: a2, status: 'todo', position: -1 }] });
  checks.negativePositionRejected = Boolean(neg.error);

  checks.ok = Object.values(checks).every(Boolean);
  if (!checks.ok) throw new Error(`reorder RPC invariants failed: ${JSON.stringify(checks)}`);
  return checks;
}

async function insertTask(client, userId, title, status, position) {
  const { data, error } = await client
    .from('tasks')
    .insert({ user_id: userId, title, description: stamp, status, priority: 'normal', position })
    .select('id')
    .single();
  if (error || !data) throw new Error(`insert "${title}": ${error?.message ?? 'no row'}`);
  return data.id;
}

async function cleanup() {
  // Best-effort: delete every row this run created, even after a failure.
  for (const [client, userId] of [
    [clientA, userA],
    [clientB, userB],
  ]) {
    if (!userId) continue;
    await client.from('tasks').delete().eq('user_id', userId).eq('description', stamp);
  }
}

let exitCode = 0;
try {
  await main();
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  exitCode = 1;
} finally {
  try {
    await cleanup();
    result.cleanedUp = true;
  } catch (cleanupError) {
    result.cleanedUp = false;
    result.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
  }
}

console.log(JSON.stringify(result, null, 2));
process.exit(exitCode);

function loadDotEnv() {
  if (!existsSync('.env')) return;
  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed
      .slice(equals + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

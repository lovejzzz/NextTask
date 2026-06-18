import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  fail('Missing SUPABASE_URL/SUPABASE_ANON_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const requiredTables = [
  'tasks',
  'team_members',
  'labels',
  'task_assignees',
  'task_labels',
  'comments',
  'activity_events',
];

const result = {
  auth: null,
  tables: {},
  mutationCycle: null,
};

const auth = await supabase.auth.signInAnonymously();
if (auth.error || !auth.data.user) {
  result.auth = { ok: false, message: auth.error?.message ?? 'No user returned' };
  printAndExit(1);
}

const userId = auth.data.user.id;
result.auth = { ok: true, userId };

for (const table of requiredTables) {
  const query = await supabase.from(table).select('*').limit(1);
  result.tables[table] = query.error
    ? { ok: false, code: query.error.code, message: query.error.message }
    : { ok: true, rowsVisible: query.data?.length ?? 0 };
}

if (Object.values(result.tables).some((table) => !table.ok)) {
  printAndExit(1);
}

const create = await supabase
  .from('tasks')
  .insert({
    user_id: userId,
    title: 'Supabase verification task',
    description: 'Created by scripts/verify-supabase.mjs',
    status: 'todo',
    priority: 'normal',
    position: 999000,
  })
  .select('*')
  .single();

if (create.error || !create.data) {
  result.mutationCycle = { ok: false, step: 'insert', message: create.error?.message ?? 'No task returned' };
  printAndExit(1);
}

const taskId = create.data.id;
const update = await supabase
  .from('tasks')
  .update({ status: 'in_progress', position: 999001 })
  .eq('id', taskId)
  .eq('user_id', userId)
  .select('*')
  .single();

if (update.error || update.data?.status !== 'in_progress') {
  result.mutationCycle = { ok: false, step: 'update', message: update.error?.message ?? 'Status did not update' };
  printAndExit(1);
}

const remove = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
if (remove.error) {
  result.mutationCycle = { ok: false, step: 'delete', message: remove.error.message };
  printAndExit(1);
}

result.mutationCycle = { ok: true, taskId };
printAndExit(0);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printAndExit(code) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(code);
}

function loadDotEnv() {
  if (!existsSync('.env')) return;

  const lines = readFileSync('.env', 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

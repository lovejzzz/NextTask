import { existsSync, readFileSync } from 'node:fs';

loadDotEnv();

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const result = {
  required: {},
  localDemo: process.env.VITE_ENABLE_LOCAL_DEMO ?? null,
  writeLimit: process.env.API_WRITE_LIMIT_PER_MINUTE ?? null,
  ipWriteLimit: process.env.API_IP_WRITE_LIMIT_PER_MINUTE ?? null,
};

let failed = false;
for (const key of required) {
  result.required[key] = Boolean(process.env[key]);
  if (!process.env[key]) failed = true;
}

if (process.env.VITE_ENABLE_LOCAL_DEMO !== 'false') {
  failed = true;
}

for (const key of ['API_WRITE_LIMIT_PER_MINUTE', 'API_IP_WRITE_LIMIT_PER_MINUTE']) {
  if (process.env[key]) {
    const limit = Number(process.env[key]);
    if (!Number.isFinite(limit) || limit <= 0) failed = true;
  }
}

console.log(JSON.stringify(result, null, 2));

if (failed) {
  console.error('Production environment is not ready. Require Supabase vars and VITE_ENABLE_LOCAL_DEMO=false.');
  process.exit(1);
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
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

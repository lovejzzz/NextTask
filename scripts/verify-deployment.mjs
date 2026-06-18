import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

loadDotEnv();

const deploymentUrl = normalizeUrl(process.argv[2] ?? process.env.DEPLOYMENT_URL);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!deploymentUrl) fail('Usage: npm run verify:deployment -- https://your-deployment.vercel.app');
if (!supabaseUrl || !supabaseAnonKey) fail('Missing Supabase environment variables.');

const result = {
  deploymentUrl,
  page: null,
  bundle: null,
  auth: null,
  api: null,
  mutationCycle: null,
};

const page = await fetch(deploymentUrl);
const html = await page.text();
result.page = { ok: page.ok, status: page.status, hasRoot: html.includes('<div id="root">') };
if (!page.ok || !result.page.hasRoot) printAndExit(1);

const bundleChecks = await inspectBundles(deploymentUrl, html);
result.bundle = bundleChecks;
if (!bundleChecks.ok) printAndExit(1);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const auth = await supabase.auth.signInAnonymously();
if (auth.error || !auth.data.session || !auth.data.user) {
  result.auth = { ok: false, message: auth.error?.message ?? 'No session returned' };
  printAndExit(1);
}

result.auth = { ok: true, userId: auth.data.user.id };
const token = auth.data.session.access_token;

const stats = await apiFetch('/api/stats', token);
result.api = { ok: stats.response.ok, status: stats.response.status, hasData: Boolean(stats.json.data) };
if (!stats.response.ok || !stats.json.data) printAndExit(1);

const title = `Deployment verification ${new Date().toISOString()}`;
const create = await apiFetch('/api/tasks', token, {
  method: 'POST',
  body: JSON.stringify({
    title,
    description: 'Created by scripts/verify-deployment.mjs',
    status: 'todo',
    priority: 'normal',
  }),
});

const taskId = create.json.data?.id;
if (!create.response.ok || !taskId) {
  result.mutationCycle = {
    ok: false,
    step: 'insert',
    status: create.response.status,
    message: create.json.error?.message ?? 'No task id returned',
  };
  printAndExit(1);
}

const remove = await apiFetch(`/api/tasks/${taskId}`, token, { method: 'DELETE' });
if (!remove.response.ok) {
  result.mutationCycle = {
    ok: false,
    step: 'delete',
    status: remove.response.status,
    message: remove.json.error?.message ?? 'Delete failed',
  };
  printAndExit(1);
}

result.mutationCycle = { ok: true, taskId };
printAndExit(0);

async function apiFetch(path, token, init = {}) {
  const response = await fetch(new URL(path, deploymentUrl), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  let json = {};
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 200) };
    }
  }

  return { response, json };
}

async function inspectBundles(baseUrl, html) {
  const assetPaths = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((asset) => asset.includes('/assets/') && (asset.endsWith('.js') || asset.endsWith('.css')));

  const markers = ['local-demo-user', 'next-task-local-demo-v1'];
  const foundMarkers = [];

  for (const path of assetPaths) {
    const response = await fetch(new URL(path, baseUrl));
    if (!response.ok) return { ok: false, failedAsset: path, status: response.status, foundMarkers };
    const content = await response.text();
    for (const marker of markers) {
      if (content.includes(marker)) foundMarkers.push(marker);
    }
  }

  return { ok: foundMarkers.length === 0, assetsChecked: assetPaths.length, foundMarkers };
}

function normalizeUrl(value) {
  if (!value) return null;
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
}

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
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

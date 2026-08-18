import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const errors = [];

check(config.installCommand === 'npm ci', 'Vercel must install from the lockfile with npm ci.');
check(
  config.buildCommand === 'npm run verify:production-env && npm run build',
  'Vercel must validate the production environment before building.',
);
check(config.outputDirectory === 'dist', 'Vercel must publish the Vite dist directory.');
check(config.framework === 'vite', 'Vercel must use the Vite framework preset.');
check(pkg.engines?.node === '22.x', 'package.json must pin the Vercel/CI Node.js major to 22.x.');

const globalHeaders = headerMap('/(.*)');
const requiredHeaders = {
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ],
  'referrer-policy': ['strict-origin-when-cross-origin'],
  'strict-transport-security': ['max-age=31536000', 'includeSubDomains'],
  'x-content-type-options': ['nosniff'],
  'x-frame-options': ['DENY'],
  'permissions-policy': ['camera=()', 'microphone=()', 'geolocation=()'],
};

for (const [name, expectedParts] of Object.entries(requiredHeaders)) {
  const value = globalHeaders.get(name) ?? '';
  for (const part of expectedParts) check(value.includes(part), `${name} must include ${part}.`);
}

const apiCache = headerMap('/api/(.*)').get('cache-control') ?? '';
for (const directive of ['private', 'no-store', 'max-age=0']) {
  check(apiCache.includes(directive), `Authenticated API cache policy must include ${directive}.`);
}
const assetCache = headerMap('/assets/(.*)').get('cache-control') ?? '';
for (const directive of ['public', 'max-age=31536000', 'immutable']) {
  check(assetCache.includes(directive), `Hashed asset cache policy must include ${directive}.`);
}

const rewrites = new Map((config.rewrites ?? []).map((rewrite) => [rewrite.source, rewrite.destination]));
check(rewrites.get('/api/bootstrap/reset') === '/api/bootstrap/demo?mode=reset', 'Reset rewrite is missing or changed.');
check(rewrites.get('/api/x402/bounty-check') === '/api/stats?mode=bounty-check', 'x402 rewrite is missing or changed.');

const result = {
  ok: errors.length === 0,
  node: pkg.engines?.node ?? null,
  buildCommand: config.buildCommand ?? null,
  outputDirectory: config.outputDirectory ?? null,
  framework: config.framework ?? null,
  installCommand: config.installCommand ?? null,
  securityHeaders: [...globalHeaders.keys()],
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;

function headerMap(source) {
  const rule = (config.headers ?? []).find((candidate) => candidate.source === source);
  return new Map((rule?.headers ?? []).map((header) => [header.key.toLowerCase(), header.value]));
}

function check(condition, message) {
  if (!condition) errors.push(message);
}
